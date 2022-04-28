import express, { json } from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import chalk from "chalk";
import Joi from "joi";
import dayjs from "dayjs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(json());

let database = null;
const mongoClient = new MongoClient(process.env.MONGO_URI);

app.post('/participants', async (req, res) => {

    //const { name } = req.body;
    //const userAlreadyExist = participants.find((partcipant) => partcipant.name === name);

    let newParticpant = {
        name: 'xxx',
        lastStatus: Date.now()
    }

    //is missing validation with join

    try {
        await mongoClient.connect();
        database = mongoClient.db("chatuol-api")
        const participants = await database.collection("participants").insertOne(newParticpant).toArray();

        res.status(201).send(participants);
        mongoClient.close();

    } catch (error) {
        console.error(error);
        res.status(500).send(error);
        mongoClient.close();
    }
});

app.get("/participants", async (req, res) => {
    try {
        await mongoClient.connect();
        database = mongoClient.db("chatuol-api");
        const participants = await database.collection("participants").find({}).toArray();

        res.status(201).send(participants);
        mongoClient.close();
        
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
        mongoClient.close();
    }
});

app.listen(5000, () => {
    console.log(chalk.bold.green(`Server is running at http://localhost:5000`))
});