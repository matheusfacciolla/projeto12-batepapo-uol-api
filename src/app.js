import express, { json } from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import chalk from "chalk";
import dayjs from "dayjs";
import dotenv from "dotenv";

import schema from "./schema.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(json());

let db = null;
const database = process.env.BANCO_MONGO;
const mongoClient = new MongoClient(process.env.MONGO_URI);
const porta = process.env.PORTA;

//Participants endpoints

app.post("/participants", async (req, res) => {

    const { name } = req.body;

    try {
        await mongoClient.connect();
        db = mongoClient.db(database);

        const userExist = await db.collection("participants").findOne({name: name});
        const validName = schema.validate({ name: name });

        if (userExist != undefined) {
            res.sendStatus(409);
            mongoClient.close();

        } else if (validName && userExist == undefined) {
            await db.collection("participants").insertOne({
                name: name,
                lastStatus: Date.now()
            });

            await db.collection("successMessage").insertOne({
                from: validName.name,
                to: "Todos",
                text: "entra na sala...",
                type: "status",
                time: dayjs(Date.now()).format("HH:MM:SS"),
            });

            res.sendStatus(201);
            mongoClient.close();
        }

    } catch (error) {
        res.sendStatus(422);
        console.log(error);
        mongoClient.close();
    }
});

app.get("/participants", async (req, res) => {
    try {
        await mongoClient.connect();
        db = mongoClient.db(database);

        const participants = await db.collection("participants").find({}).toArray();

        res.status(200).send(participants);
        mongoClient.close();

    } catch (error) {
        res.status(500).send(error);
        console.log(error);
        mongoClient.close();
    }
});

//Messages endpoints

app.post("/messages", async (req, res) => {

    const from = req.headers.user;
    const { to, text, type } = req.body;

    try {
        await mongoClient.connect();
        db = mongoClient.db(database);

        const userExist = await db.collection("messages").findOne({name: from});
        const validToAndText = schema.validate({ to: to, text: text });

        if (type === "message" || type === "private_message" && userExist != undefined && validToAndText ) {
            await db.collection(userExist).insertOne({
                to: to,
                text: text,
                type: type,
                time: dayjs(Date.now()).format("HH:MM:SS")
            });

            res.sendStatus(201);
            mongoClient.close();
        }
 
    } catch (error) {
        res.sendStatus(422);
        console.log(error);
        mongoClient.close();
    }
});

app.get("/messages", async (req, res) => {
    const { limit } = req.query;
    const qtdMessages = (limit - 1) * limit;

    try {
        await mongoClient.connect();
        db = mongoClient.db(database);

        const messages = await db.collection("messages").find({}).toArray();
        const typeOfMessage = await db.collection("messages").findOne({type: "message"});

        if(typeOfMessage.type === "message"){
            if (!limit) {
                res.status(200).send(messages);
                mongoClient.close();
            } else {
                res.status(200).send(qtdMessages);
                mongoClient.close();
            }
        }
 
    } catch (error) {
        res.status(500).send(error);
        console.log(error);
        mongoClient.close();
    }
});

app.listen(porta, () => {
    console.log(chalk.bold.green(`Server is running at http://localhost:${porta}`))
});