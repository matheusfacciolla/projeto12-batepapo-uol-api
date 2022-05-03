import express, { json } from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import chalk from "chalk";
import dayjs from "dayjs";
import dotenv from "dotenv";
import Joi from "joi";

const app = express();
app.use(cors());
app.use(json());
dotenv.config();

let db = null;
const database = process.env.BANCO_MONGO;
const mongoClient = new MongoClient(process.env.MONGO_URI);
const porta = process.env.PORTA;
const promise = mongoClient.connect();

promise.then(() => {
    db = mongoClient.db(database);
});
promise.catch(error => console.log("error to connect", error));

const participantSchema = Joi.object({
    name: Joi
        .string()
        .required(),
    lastStatus: Joi
        .number()
        .integer(),
});

const messageSchema = Joi.object({
    from: Joi
        .string()
        .required(),
    to: Joi
        .string()
        .required(),
    text: Joi
        .string()
        .required(),
    type: Joi
        .string()
        .valid("message", "private_message")
        .required(),
    time: Joi.
        string()
});

app.post("/participants", async (req, res) => {

    const { name } = req.body;

    try {
        const userExist = await db.collection("participants").findOne({ name });
        const validName = participantSchema.validate({ name: name }, { abortEarly: false });

        if (userExist != undefined || validName.error) {
            res.sendStatus(409);
            console.log(validName.error);
            return;

        } else {
            await db.collection("participants").insertOne({
                name: name,
                lastStatus: Date.now()
            });

            await db.collection("messages").insertOne({
                from: name,
                to: "Todos",
                text: "entra na sala...",
                type: "status",
                time: dayjs(Date.now()).format("HH:mm:ss"),
            });

            res.sendStatus(201);
            return;
        }

    } catch (error) {
        res.sendStatus(422);
        console.log(error);
        return;
    }
});

app.get("/participants", async (req, res) => {
    try {
        const participants = await db.collection("participants").find({}).toArray();
        res.status(200).send(participants);
        return;

    } catch (error) {
        res.status(500).send(error);
        console.log(error);
        return;
    }
});

app.post("/messages", async (req, res) => {

    const { to, text, type } = req.body;
    const from = req.headers.user;

    try {
        const userExist = await db.collection("participants").findOne({ name: from });
        const validToAndText = messageSchema.validate({ from: from, to: to, text: text, type: type }, { abortEarly: false });

        if (!userExist || validToAndText.error) {
            res.sendStatus(422);
            console.log(validToAndText.error);
            return;

        } else {
            await db.collection("messages").insertOne({
                from: from,
                to: to,
                text: text,
                type: type,
                time: dayjs(Date.now()).format("HH:mm:ss")
            });
            res.sendStatus(201);
            return;
        }

    } catch (error) {
        res.sendStatus(422);
        console.log(error);
        return;
    }
});

app.get("/messages", async (req, res) => {
    const { limit } = req.query;
    const { user } = req.headers;

    try {
        const messages = await db.collection("messages").find({
            $or: [
                { type: "message" },
                { to: "Todos" },
                { to: user },
                { from: user }
            ]
        }).toArray();

        if (!limit) {
            res.status(200).send(messages);
            return;

        } else {
            const qtdMessages = messages.slice(-limit)
            res.status(200).send(qtdMessages);
            return;
        }

    } catch (error) {
        res.status(500).send(error);
        console.log(error);
        return;
    }
});

app.post("/status", async (req, res) => {
    const { user } = req.headers;

    try {
        const userExist = await db.collection("participants").findOne({ name: user });

        if (!userExist) {
            res.sendStatus(404);
            return;

        } else {
            await db.collection("participants").updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
            res.sendStatus(200);
            return;
        }

    } catch (error) {
        res.sendStatus(500);
        console.log(error);
        return;
    }
});

app.delete("/messages/:ID_DA_MENSAGEM", async (req, res) => {
    const { ID_DA_MENSAGEM } = req.params;
    const { user } = req.headers;

    try {
        const isMessageExist = await db.collection("messages").findOne({ _id: new ObjectId(ID_DA_MENSAGEM) });

        if (!isMessageExist) {
            res.sendStatus(404);
            return;

        } else if (isMessageExist.from != user) {
            res.sendStatus(401);
            return;

        } else {
            await db.collection("messages").deleteOne({ _id: new ObjectId(ID_DA_MENSAGEM) });
            res.sendStatus(200);
            return;
        }

    } catch (error) {
        res.status(500).send(error);
        console.log(error);
        return;
    }
});

app.put('/messages/:ID_DA_MENSAGEM', async (req, res) => {
    const { ID_DA_MENSAGEM } = req.params;
    const { user } = req.headers;
    const { to, text, type } = req.body;

    try {
        const isUserExist = await db.collection('participants').findOne({ name: user });
        const isMessageExist = await db.collection("messages").findOne({ _id: new ObjectId(ID_DA_MENSAGEM) });
        const validMessage = messageSchema.validate({ from: user, to: to, text: text, type: type }, { abortEarly: false });

        if (!isMessageExist) {
            res.sendStatus(404);
            return;

        } else if (validMessage.error) {
            console.log(error);
            res.sendStatus(402);
            return;

        } else if (!isUserExist) {
            res.sendStatus(404);
            return;

        } else if (isMessageExist.from != user) {
            res.sendStatus(401);
            return;

        } else {
            await db.collection("messages").updateOne({ _id: new ObjectId(ID_DA_MENSAGEM) }, { $set: { ...validMessage.value, time: dayjs(Date.now()).format("HH:mm:ss") } });
            res.sendStatus(200);
            return;
        }

    } catch (error) {
        res.status(500).send(error);
    }
});

setInterval(async () => {
    try {
        const users = await db.collection("participants").find({}).toArray();
        const isInactiveUsers = users.filter((user) => {
            if (Date.now() - user.lastStatus > 10000) {
                return user;
            }
        });

        if (isInactiveUsers.length > 0) {
            isInactiveUsers.forEach((isInactiveUser) => {
                if (isInactiveUsers) {
                    db.collection("participants").deleteOne(isInactiveUser);
                    db.collection("messages").insertOne({
                        from: isInactiveUser.name,
                        to: "Todos",
                        text: "sai da sala...",
                        type: "status",
                        time: dayjs(Date.now()).format("HH:mm:ss"),
                    });
                }
            });
        }
    } catch (error) {
        console.log(error);
        return;
    }
}, 15000);

app.listen(porta, () => {
    console.log(chalk.bold.green(`Server is running at http://localhost:${porta}`))
});