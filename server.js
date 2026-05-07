import express from "express";
import cors from "cors";
import bonsaiRoutes from "./routes/bonsaiRoutes.js";
import dotenv from "dotenv";
import { connectDB } from "./db/connection.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/bonsai", bonsaiRoutes);

const startServer = async () => {

    await connectDB();

    app.listen(3000, () => {
        console.log("Servidor corriendo en puerto 3000");
    });
};

startServer();