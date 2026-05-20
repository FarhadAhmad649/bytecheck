import mongoose from "mongoose";

const scanSchema = new mongoose.Schema(
  {
    // This links the scan to a specific user in your database
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    scanType: {
      type: String,
      required: true,
      default: "text", // Can be 'text' or 'image'
    },
    extractedText: {
      type: String,
      required: true,
    },
    analysisResult: {
      status: {
        type: String,
        required: true,
        enum: ["Safe", "Caution", "Avoid"],
      },
      flaggedIngredients: [{ type: String }],
      reason: { type: String },
    },
  },
  { timestamps: true },
); // Automatically adds createdAt and updatedAt dates

const Scan = mongoose.model("Scan", scanSchema);
export default Scan;
