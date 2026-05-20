
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import jwt from 'jsonwebtoken'

//...........Register a new user
export const registerUser = async (req, res) => {
  try {
    const { fullName, email, password, healthProfile } = req.body;

    // 1. Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Create the user in MongoDB Atlas
    const user = await User.create({
      fullName,
      email,
      password: passwordHash,
      healthProfile,
    });

    // 4. Send success response
    if (user) {
      res.status(201).json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        message: "User successfully registered for BiteCheck!",
      });
    } else {
      res.status(400).json({ message: "Invalid user data received" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//...........Login user
export const authUser = async (req, res) => {
  try {
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

//...........Get user profile
export const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      healthProfile: user.healthProfile, // This object contains allergies, illnesses, AND prohibitedFoods
    });
  } else {
    res.status(404).json({ message: "User not found" });
  }
};
