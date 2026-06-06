import mongoose from "mongoose";

const foodDictionarySchema = new mongoose.Schema(
  {
    // lowercase: true ensures "Biryani" and "BIRYANI" are saved exactly the same
    dishName: { type: String, required: true, unique: true, lowercase: true, trim: true },
    
    // Arrays of strings can also be auto-lowercased!
    aliases: [{ type: String, lowercase: true, trim: true }],
    ingredients: [{ type: String, required: true, lowercase: true, trim: true }], 
    
    // The Medical Ontology Engine Arrays
    unsuitableForIllnesses: [{ type: String, lowercase: true, trim: true }], 
    containsAllergies: [{ type: String, lowercase: true, trim: true }], 
    dietaryFlags: [{ type: String, lowercase: true, trim: true }], // e.g., ["High Sodium", "High Sugar"]
  },
  { timestamps: true },
);

const FoodDictionary = mongoose.model("FoodDictionary", foodDictionarySchema);
export default FoodDictionary;
