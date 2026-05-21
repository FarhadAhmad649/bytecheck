import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    healthProfile: {
      allergies: [{ type: String }], // e.g., ["peanuts", "shellfish"]
      illnesses: [{ type: String }], // e.g., ["diabetes", "kidney disease"]
      prohibitedFoods: [{ type: String }], // e.g., ["sugar", "salt", "potassium"]
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
export default User;