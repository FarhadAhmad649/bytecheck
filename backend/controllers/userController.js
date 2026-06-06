
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import jwt from 'jsonwebtoken'

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    // 🔴 DEBUG: This will print exactly what React is sending to the backend!
    console.log("📝 INCOMING REGISTRATION DATA:", req.body);

    // 1. Catch the data (Handles both flat data and nested 'healthProfile' data)
    const { 
      fullName, 
      email, 
      password, 
      healthProfile, // Just in case React is still sending it wrapped!
      allergies, 
      illnesses, 
      prohibitedFoods 
    } = req.body;

    // 2. Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists with this email." });
    }

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. THE BULLETPROOF FIX: Safely extract arrays whether they are inside healthProfile or not
    const finalAllergies = healthProfile?.allergies || allergies || [];
    const finalIllnesses = healthProfile?.illnesses || illnesses || [];
    const finalProhibitedFoods = healthProfile?.prohibitedFoods || prohibitedFoods || [];

    // 5. Create the user and insert the data into the new familyProfiles array
    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      role: "user",
      familyProfiles: [
        {
          name: fullName || "Account Owner",
          isPrimary: true,
          allergies: finalAllergies,
          illnesses: finalIllnesses,
          prohibitedFoods: finalProhibitedFoods
        }
      ]
    });

    // 6. Generate JWT Token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      familyProfiles: user.familyProfiles,
      token,
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
};

//...........Login user
export const authUser = async (req, res) => {
  try {

    console.log("🚨 LOGIN ROUTE HIT! HERE IS THE DATA:", req.body);
    
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await User.findOne({ email });

    // 2. Check if user exists AND the password matches
    if (user && (await bcrypt.compare(password, user.password))) {
      // 3. Generate a token that expires in 30 days
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
      });

      // 4. Send back the user data and the token
      res.json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        token: token,
        message: "Login successful!",
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ..........................User Profiles.................................................

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        fullName: user.fullName, // or user.name depending on your schema
        email: user.email,
        role: user.role,
        // 🔴 THIS IS THE FIX: Tell the backend to send the new array to React!
        familyProfiles: user.familyProfiles 
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Fetch Profile Error:", error);
    res.status(500).json({ message: "Server error while fetching profile." });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const {
      fullName,
      allergies,
      prohibitedFoods,
      illnesses,
      dietaryPreferences,
      healthProfile,
    } = req.body;

    const finalAllergies = healthProfile?.allergies || allergies;
    const finalIllnesses = healthProfile?.illnesses || illnesses;
    const finalProhibitedFoods = healthProfile?.prohibitedFoods || prohibitedFoods;
    const finalDietaryPreferences = healthProfile?.dietaryPreferences || dietaryPreferences;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update main user name
    if (fullName) user.fullName = fullName;

    // Update the Primary Profile (Index 0 in the array)
    if (user.familyProfiles && user.familyProfiles.length > 0) {
      if (finalAllergies !== undefined) user.familyProfiles[0].allergies = finalAllergies;
      if (finalProhibitedFoods !== undefined) user.familyProfiles[0].prohibitedFoods = finalProhibitedFoods;
      if (finalIllnesses !== undefined) user.familyProfiles[0].illnesses = finalIllnesses;
      if (finalDietaryPreferences !== undefined) user.familyProfiles[0].dietaryPreferences = finalDietaryPreferences;
      
      // Keep the primary profile name synced with the account name
      if (fullName) user.familyProfiles[0].name = fullName;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        role: updatedUser.role,
        familyProfiles: updatedUser.familyProfiles
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ..........................Family Profiles.................................................

// @desc    Add a new family member to the user's account
// @route   POST /api/users/family
// @access  Private (Requires JWT Token)
export const addFamilyMember = async (req, res) => {
  try {
    const { name, allergies, prohibitedFoods, illnesses } = req.body;

    // 1. Find the logged-in user
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Push the new family member into the array
    user.familyProfiles.push({
      name: name,
      isPrimary: false, // Because they are a guest on the main user's account!
      allergies: allergies || [],
      prohibitedFoods: prohibitedFoods || [],
      illnesses: illnesses || [],
    });

    // 3. Save the updated user document
    await user.save();

    // 4. Return the updated family list
    res.status(201).json({
      success: true,
      message: `${name} added to your family!`,
      familyProfiles: user.familyProfiles
    });

  } catch (error) {
    console.error("Add Family Error:", error);
    res.status(500).json({ message: "Failed to add family member." });
  }
};

// @desc    Update a specific family profile
// @route   PUT /api/users/family/:id
// @access  Private
export const updateFamilyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    // 1. Find the exact index of the profile using standard JavaScript
    const profileIndex = user.familyProfiles.findIndex(
      (p) => p._id.toString() === req.params.id
    );

    if (profileIndex === -1) {
      return res.status(404).json({ message: "Family profile not found." });
    }

    // 2. Safely update the fields
    user.familyProfiles[profileIndex].name = req.body.name || user.familyProfiles[profileIndex].name;
    user.familyProfiles[profileIndex].allergies = req.body.allergies || [];
    user.familyProfiles[profileIndex].illnesses = req.body.illnesses || [];
    user.familyProfiles[profileIndex].prohibitedFoods = req.body.prohibitedFoods || [];

    // 3. 🔴 CRITICAL: Tell Mongoose the array has been modified so it actually saves!
    user.markModified("familyProfiles");
    
    await user.save();

    res.json({ 
      success: true, 
      message: "Profile updated successfully", 
      familyProfiles: user.familyProfiles 
    });
  } catch (error) {
    console.error("🔴 Update Profile Error:", error);
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
};

// @desc    Delete a specific family profile
// @route   DELETE /api/users/family/:id
// @access  Private
export const deleteFamilyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const initialLength = user.familyProfiles.length;
    
    // 1. Filter out the profile we want to delete
    user.familyProfiles = user.familyProfiles.filter(
      (profile) => profile._id.toString() !== req.params.id
    );

    if (user.familyProfiles.length === initialLength) {
      return res.status(404).json({ message: "Family profile not found." });
    }

    // 2. 🔴 CRITICAL: Tell Mongoose the array has been modified!
    user.markModified("familyProfiles");

    await user.save();

    res.json({ 
      success: true, 
      message: "Profile deleted successfully", 
      familyProfiles: user.familyProfiles 
    });
  } catch (error) {
    console.error("🔴 Delete Profile Error:", error);
    res.status(500).json({ message: "Failed to delete profile", error: error.message });
  }
};