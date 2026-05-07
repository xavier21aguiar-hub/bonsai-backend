import mongoose from "mongoose";

export const connectDB = async () => {
    try {
    await mongoose.connect("mongodb+srv://admin:ThroughAdmin245@cluster0.jqjhgap.mongodb.net/?appName=Cluster0");
    console.log("🟢 MongoDB conectado");
    } catch (error) {
    console.error("🔴 Error MongoDB:", error);
    }
};