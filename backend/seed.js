import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import FoodDictionary from "./models/FoodDictionary.js"; // Adjust path if your model is in a different folder

// Load environment variables (to get your MongoDB URI)
dotenv.config();

// Connect to MongoDB Atlas
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected Successfully.");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

// Seeder Function
const seedDatabase = async () => {
  try {
    await connectDB();

    // 1. Read the JSON file you just created
    const data = JSON.parse(fs.readFileSync("./pakistan_food_database_200.json", "utf-8"));

    console.log(`Found ${data.length} dishes. Starting import...`);

    // 2. Clear out any old garbage data (Optional, comment out if you want to keep old data)
    await FoodDictionary.deleteMany();
    console.log("Cleared old dictionary data.");

    // 3. Insert the new array of objects into MongoDB
    await FoodDictionary.insertMany(data);

    console.log("SUCCESS! All 200 dishes inserted into MongoDB Atlas.");
    process.exit();
  } catch (error) {
    console.error("Seeding Error:", error);
    process.exit(1);
  }
};

seedDatabase();
