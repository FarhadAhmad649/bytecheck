import express from "express";
import { registerUser, authUser, getUserProfile, updateUserProfile } from "../controllers/userController.js";
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router();

// Define the route for registration
router.post("/register", registerUser);
router.post('/login', authUser); 

// The router.route allows chaining GET and PUT on the same '/profile' endpoint
router.route('/profile')
      .get(protect, getUserProfile)
      .put(protect, updateUserProfile);

export default router;
