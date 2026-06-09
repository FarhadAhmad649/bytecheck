import express from "express";
import multer from "multer";
import {
  createScan,
  getUserScans,
  getScanHistory,
  analyzeText,
  addDishToDictionary,
  getSafeAlternatives,
  getAllDishes,
  updateDish,
  deleteDish,
  analyzeSmartScan,
  analyzeDish
} from "../controllers/scanController.js";
import { protect } from "../middleware/authMiddleware.js";
import { admin } from "../middleware/adminMiddleware.js";

const router = express.Router();

// Configure Multer storage settings locally within routes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Set limit to 5MB
  },
});

// Storing and fetching basic user history entries
router.route("/").post(protect, createScan).get(protect, getUserScans);

// Getting history logs array
router.get("/history", protect, getScanHistory);

// Search for the dish name
router.post("/analyze-dish", protect, analyzeDish);

// Manual raw ingredient text processing endpoint
router.post("/analyze-text", protect, analyzeText);

// SMART SCAN ENDPOINT (Autodetects: Labels, Dishes, and Restaurant Menus)
// Updated to listen on '/analyze-smart' and parse the 'smartImage' key sent from React
router.post(
  "/analyze-smart",
  protect,
  upload.single("smartImage"),
  analyzeSmartScan,
);

// AI ALTERNATIVES ENDPOINT
// Updated from '/alternatives' to '/ai-alternatives' to perfectly match frontend requests
router.post("/ai-alternatives", protect, getSafeAlternatives);

// ─── Menu Dish Dictionary Admin Routes ──────────────────────────────────
router.post("/add-dish", protect, admin, addDishToDictionary);
router.get("/dishes", protect, admin, getAllDishes);
router.put("/dish/:id", protect, admin, updateDish);
router.delete("/dish/:id", protect, admin, deleteDish);

export default router;
