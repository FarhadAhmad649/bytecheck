import mongoose from "mongoose";

// 1. Create a Sub-Schema for individual family members
const profileSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Dad", "Daughter", "Me"
  isPrimary: { type: Boolean, default: false }, // True for the account owner

  // The exact same Medical Ontology arrays!
  allergies: [{ type: String, lowercase: true, trim: true }],
  prohibitedFoods: [{ type: String, lowercase: true, trim: true }],
  illnesses: [{ type: String, lowercase: true, trim: true }],

});

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: { type: String, default: "user" },

    // 🔴 NEW: The user now has an array of family profiles!
    familyProfiles: [profileSchema],
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
export default User;
