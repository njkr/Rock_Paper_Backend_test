require("dotenv").config();
import mongoose from "mongoose";

const dataUrl: string =
  process.env.DB_URI || "mongodb://localhost:27017/mydatabase";

export const connectToDatabase = async () => {
  try {
    await mongoose.connect("mongodb://0.0.0.0:27017/mydatabase");
    console.log("Database connected");
  } catch (error) {
    console.log("Error connecting to database", error);
  }
};
