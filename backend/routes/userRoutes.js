import express from "express";
import { registerUser, authUser, getUserProfile, updateUserProfile, addFamilyMember, updateFamilyProfile, deleteFamilyProfile } from "../controllers/userController.js";
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router();

// Define the route for registration
router.post("/register", registerUser);
router.post('/login', authUser); 

// The router.route allows chaining GET and PUT on the same '/profile' endpoint
router.route('/profile')
      .get(protect, getUserProfile)
      .put(protect, updateUserProfile);

// To add a new family member
router.post("/family", protect, addFamilyMember);

// To update the family profiles
router.put("/family/:id", protect, updateFamilyProfile);
router.delete("/family/:id", protect, deleteFamilyProfile);

export default router;
