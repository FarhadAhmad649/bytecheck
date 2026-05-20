import express from "express";
import { registerUser, authUser, getUserProfile } from "../controllers/userController.js";
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router();

// Define the route for registration
router.post("/register", registerUser);
router.post('/login', authUser); 

router.get("/profile", protect, getUserProfile);

export default router;
