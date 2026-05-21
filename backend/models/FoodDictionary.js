import mongoose from "mongoose";

const foodDictionarySchema = new mongoose.Schema(
  {
    dishName: { type: String, required: true, unique: true },
    aliases: [{ type: String }],
    ingredients: [{ type: String, required: true }],
    // NEW: Direct illness mapping
    unsuitableForIllnesses: [{ type: String }],
  },
  { timestamps: true },
);

const FoodDictionary = mongoose.model("FoodDictionary", foodDictionarySchema);
export default FoodDictionary;
