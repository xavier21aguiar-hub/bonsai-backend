import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        
        const mongoURI = process.env.MONGO_URI;

        console.log("MONGO URI:", mongoURI);

        await mongoose.connect(mongoURI);

        console.log("🟢 MongoDB conectado");

    } catch (error) {
        console.error("🔴 Error MongoDB:", error);
        process.exit(1);
    }
};