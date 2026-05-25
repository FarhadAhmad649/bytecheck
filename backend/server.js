// MUST BE THE VERY FIRST LINE - This loads .env before anything else!
import "dotenv/config";
import express from "express";
import cors from "cors";
//import dotenv from "dotenv";
import connectDB from "./config/dbConfig.js";
import userRoutes from "./routes/userRoutes.js";
import scanRoutes from "./routes/scanRoutes.js";

// Load environment variables
//dotenv.config();

// Initialize the Express app
const app = express();

// Connect to MongoDB Atlas
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/scans", scanRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("Welcome to the modern BiteCheck API!");
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
