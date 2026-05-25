import Scan from "../models/Scan.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import FoodDictionary from "../models/FoodDictionary.js";
import { allergenMap } from "../config/allergenMap.js";
import { GoogleGenAI } from "@google/genai";
import axios from 'axios'

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the AI client (it automatically looks for process.env.GEMINI_API_KEY)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


//........... Create a new scan record

export const createScan = async (req, res) => {
  try {
    const { scanType, extractedText, analysisResult } = req.body;

    // Create a new scan and attach the logged-in user's ID
    const scan = new Scan({
      user: req.user._id, // This comes from your JWT auth middleware!
      scanType,
      extractedText,
      analysisResult,
    });

    const createdScan = await scan.save();
    res.status(201).json(createdScan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//............ Get logged in user's scan history

export const getUserScans = async (req, res) => {
  try {
    // Find all scans where the 'user' field matches the logged-in user's ID
    // .sort({ createdAt: -1 }) returns the newest scans first
    const scans = await Scan.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(scans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload food label image and analyze ingredients
// @route   POST /api/scans/analyze-image
// @access  Private
// @desc    Upload food label image and analyze ingredients
// @route   POST /api/scans/analyze-image
// @access  Private
export const analyzeImage = async (req, res) => {
  try {
    if (!req.file) {
      console.log("🔴 Error: No file was received by Multer.");
      return res.status(400).json({ message: "No image file uploaded" });
    }

    const imagePath = path.join(__dirname, "..", req.file.path);
    const scriptPath = path.join(__dirname, "..", "ai_service", "ocr_processor.py");

    const pythonProcess = spawn("python", [scriptPath, imagePath]);
    let pythonData = "";

    pythonProcess.stdout.on("data", (data) => {
      pythonData += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error("🔴 PYTHON WARNING/ERROR:", data.toString());
    });

    pythonProcess.on("close", async (code) => {
      try {
        const startIndex = pythonData.indexOf("{");
        const endIndex = pythonProcess.killed
          ? pythonData.length
          : pythonData.lastIndexOf("}") + 1;
        const cleanJsonString =
          startIndex !== -1
            ? pythonData.substring(startIndex, endIndex)
            : pythonData;
        const parsedResult = JSON.parse(cleanJsonString);

        if (!parsedResult.success) {
          return res
            .status(500)
            .json({ message: "OCR failed", error: parsedResult.error });
        }

        let extractedIngredientsText = "";
        const rawText = parsedResult.text.trim();

        // 🛑 NEW: Advanced Barcode Sanitizer
        // This removes ALL spaces, quotes, letters, and special characters.
        // It leaves ONLY the pure digits (0-9).
        const pureNumbersOnly = rawText.replace(/[^0-9]/g, "");

        // 🛑 HYBRID INPUT PROCESSING: Detect if output is a barcode (8 to 14 digits)
        const isBarcode =
          pureNumbersOnly.length >= 8 && pureNumbersOnly.length <= 14;
          
        if (isBarcode) {
          console.log("🔍 Barcode detected:", rawText);
          const response = await axios.get(
            `https://world.openfoodfacts.org/api/v0/product/${rawText}.json`,
          );
          extractedIngredientsText =
            response.data.product?.ingredients_text?.toLowerCase() || "";

          if (!extractedIngredientsText) {
            return res.status(404).json({
              message:
                "Barcode found, but no ingredients available in database.",
            });
          }
        } else {
          // If it's not a barcode, it must be normal ingredient text. Remove stray quotes just in case.
          extractedIngredientsText = rawText.replace(/['"]/g, '').toLowerCase();
        }

        if (extractedIngredientsText.length < 5) {
          return res.status(500).json({
            message:
              "OCR detected too little text. Please ensure the ingredients list is clearly visible.",
          });
        }

        const user = await User.findById(req.user._id);
        const userAllergies = user.healthProfile.allergies || [];
        const userProhibited = user.healthProfile.prohibitedFoods || [];

        let flaggedAllergies = [];
        let flaggedProhibited = [];

        // --- ALLERGY CHECK LOGIC (Unchanged) ---
        userAllergies.forEach((allergy) => {
          const normalizedAllergy = allergy.toLowerCase();
          const hiddenNames = allergenMap[normalizedAllergy] || [
            normalizedAllergy,
          ];
          const foundHidden = hiddenNames.find((hidden) =>
            extractedIngredientsText.includes(hidden.toLowerCase()),
          );
          if (foundHidden) {
            flaggedAllergies.push(
              foundHidden === normalizedAllergy
                ? normalizedAllergy
                : `${normalizedAllergy} (hidden as '${foundHidden}')`,
            );
          }
        });

        userProhibited.forEach((item) => {
          if (extractedIngredientsText.includes(item.toLowerCase())) {
            flaggedProhibited.push(item);
          }
        });

        let flaggedIngredients = [...flaggedAllergies, ...flaggedProhibited];
        let status = flaggedIngredients.length > 0 ? "Avoid" : "Safe";
        let reason =
          status === "Safe"
            ? "This item matches your dietary profile perfectly."
            : `Warning! Contains ingredients conflicting with your: ${[...new Set(flaggedIngredients)].join(", ")}.`;

        const savedLog = await Scan.create({
          user: req.user._id,
          scanType: isBarcode ? "barcode" : "image",
          extractedText: extractedIngredientsText,
          analysisResult: { status, flaggedIngredients, reason },
        });

        res.json({
          success: true,
          scanId: savedLog._id,
          status,
          extractedText: extractedIngredientsText,
          flaggedIngredients,
          reason,
          timestamp: savedLog.createdAt,
        });
      } catch (parseError) {
        res.status(500).json({ message: "Failed to process service response", error: parseError.message });
      }
    });
  } catch (error) {
    console.error("🔴 SERVER CATCH ERROR:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user's complete scan history logs
// @route   GET /api/scans/history
// @access  Private (Requires JWT Token)
export const getScanHistory = async (req, res) => {
    try {
        // Find all scans matching the logged-in user's ID
        // .sort({ createdAt: -1 }) ensures the newest scans show up at the very top
        const scanHistory = await Scan.find({ user: req.user._id }).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: scanHistory.length,
            history: scanHistory
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Manually check typed ingredients against allergies OR Live Barcode Scan
// @route   POST /api/scans/analyze-text
// @access  Private
export const analyzeText = async (req, res) => {
  try {
    const { ingredientsText } = req.body;

    if (!ingredientsText || ingredientsText.trim() === "") {
      return res.status(400).json({ message: "Please enter some ingredients to check." });
    }

    const rawInput = ingredientsText.trim();
    let textToAnalyze = rawInput.toLowerCase();
    let scanType = "text";

    // 🛑 HYBRID LOGIC: Detect if the Live Scanner sent a Barcode (8 to 14 digits)
    const isBarcode = /^\d{8,14}$/.test(rawInput.replace(/\s/g, ''));

    if (isBarcode) {
      console.log("🔍 Barcode detected from Live Scanner:", rawInput);
      
      // Fetch ingredients using the barcode number!
      const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${rawInput}.json`);
      textToAnalyze = response.data.product?.ingredients_text?.toLowerCase() || "";

      if (!textToAnalyze) {
        return res.status(404).json({ 
          message: "Barcode read successfully, but no ingredients are available for this product in the database. Please scan the ingredients text directly." 
        });
      }
      scanType = "barcode";
    }

    // 1. Fetch user profile from MongoDB
    const user = await User.findById(req.user._id);

    const userAllergies = user.healthProfile.allergies || [];
    const userProhibited = user.healthProfile.prohibitedFoods || [];

    let flaggedAllergies = [];
    let flaggedProhibited = [];

    // --- UPGRADED ALLERGY CHECK WITH HIDDEN INGREDIENTS ---
    userAllergies.forEach((allergy) => {
      const normalizedAllergy = allergy.toLowerCase();

      // 1. Get the list of hidden names (fallback to just the allergy name if not in map)
      const hiddenNames = allergenMap[normalizedAllergy] || [
        normalizedAllergy,
      ];

      // 2. Check if ANY of the hidden names exist in the food's ingredients
      const foundHidden = hiddenNames.find((hidden) =>
        textToAnalyze.includes(hidden.toLowerCase()), // 👈 Now checks the fetched ingredients!
      );

      // 3. If we found a hidden ingredient, flag it intelligently!
      if (foundHidden) {
        if (foundHidden === normalizedAllergy) {
          flaggedAllergies.push(normalizedAllergy);
        } else {
          flaggedAllergies.push(
            `${normalizedAllergy} (hidden as '${foundHidden}')`,
          ); 
        }
      }
    });

    // 2. Check Doctor Prohibited Foods specifically
    userProhibited.forEach((item) => {
      if (textToAnalyze.includes(item.toLowerCase())) { // 👈 Now checks the fetched ingredients!
        flaggedProhibited.push(item);
      }
    });

    // 3. Combine them for the frontend list
    let flaggedIngredients = [...flaggedAllergies, ...flaggedProhibited];

    let status = "Safe";
    let reason = "This item matches your dietary profile perfectly.";

    // 4. Build a DYNAMIC reason string based on what was found
    if (flaggedIngredients.length > 0) {
      status = "Avoid";
      let dynamicReasons = [];

      if (flaggedAllergies.length > 0) {
        dynamicReasons.push(`allergies (${flaggedAllergies.join(", ")})`);
      }
      if (flaggedProhibited.length > 0) {
        dynamicReasons.push(
          `doctor-prohibited foods (${flaggedProhibited.join(", ")})`,
        );
      }

      reason = `Warning! Contains ingredients conflicting with your: ${dynamicReasons.join(" AND ")}.`;
    }

    // 5. Commit result directly to Scan History
    const savedLog = await Scan.create({
      user: req.user._id,
      scanType: scanType, // Saves as "barcode" or "text" dynamically
      extractedText: textToAnalyze, // Saves the actual ingredients, not the number
      analysisResult: {
        status,
        flaggedIngredients,
        reason,
      },
    });

    // 6. Return unified final response
    res.json({
      success: true,
      scanId: savedLog._id,
      status,
      extractedText: textToAnalyze, // Returns the ingredients to the screen
      flaggedIngredients,
      reason,
      timestamp: savedLog.createdAt,
    });
  } catch (error) {
      console.error("🔴 TEXT ANALYSIS ERROR:", error.message);
      res.status(500).json({ message: "Failed to analyze data." });
  }
};

// @desc    Add a new dish to the dictionary (For testing/admin)
// @route   POST /api/scans/add-dish
// @access  Private
export const addDishToDictionary = async (req, res) => {
    try {
        const { dishName, ingredients, aliases, unsuitableForIllnesses } = req.body;
        const newDish = await FoodDictionary.create({ dishName, aliases, ingredients, unsuitableForIllnesses });
        res.status(201).json({ message: "Dish added to dictionary!", dish: newDish });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check a dish name against user's health profile
// @route   POST /api/scans/analyze-dish
// @access  Private
export const analyzeDish = async (req, res) => {
    try {
      const { dishName } = req.body;

      if (!dishName || dishName.trim() === "") {
        return res.status(400).json({ message: "Please enter a dish name." });
      }

      // 1. Look up the recipe in the dictionary (case-insensitive)
      const dish = await FoodDictionary.findOne({
        $or: [
          { dishName: { $regex: new RegExp(`^${dishName}$`, "i") } },
          { aliases: { $regex: new RegExp(`^${dishName}$`, "i") } }, // <-- FIXED: Now uses Regex!
        ],
      });

      if (!dish) {
        return res.status(404).json({
          message: `We couldn't find '${dishName}' in our database. Please check its ingredients manually.`,
        });
      }

      // 2. Convert recipe array into a single searchable string
      const ingredientsText = dish.ingredients.join(", ").toLowerCase();

      // 3. Fetch user profile from MongoDB
      const user = await User.findById(req.user._id);
      const userAllergies = user.healthProfile.allergies || [];
      const userProhibited = user.healthProfile.prohibitedFoods || [];
      const userIllnesses = user.healthProfile.userIllnesses || [];

      let flaggedAllergies = [];
      let flaggedProhibited = [];
      let flaggedIllnesses = [];

      // --- UPGRADED ALLERGY CHECK WITH HIDDEN INGREDIENTS ---
      userAllergies.forEach((allergy) => {
        const normalizedAllergy = allergy.toLowerCase();

        // 1. Get the list of hidden names (fallback to just the allergy name if not in map)
        const hiddenNames = allergenMap[normalizedAllergy] || [
          normalizedAllergy,
        ];

        // 2. Check if ANY of the hidden names exist in the food's ingredients
        const foundHidden = hiddenNames.find((hidden) =>
          ingredientsText.includes(hidden.toLowerCase()),
        );

        // 3. If we found a hidden ingredient, flag it intelligently!
        if (foundHidden) {
          if (foundHidden === normalizedAllergy) {
            flaggedAllergies.push(normalizedAllergy); // Found exact match (e.g., "milk")
          } else {
            flaggedAllergies.push(
              `${normalizedAllergy} (hidden as '${foundHidden}')`,
            ); // Found hidden match
          }
        }
      });

      // Check Doctor Prohibited Foods
      userProhibited.forEach((item) => {
        if (ingredientsText.includes(item.toLowerCase())) {
          flaggedProhibited.push(item);
        }
      });

      // NEW: Check User Illnesses against the Dish's Unsuitable list
      const dishUnsuitableList = dish.unsuitableForIllnesses || [];
      userIllnesses.forEach((illness) => {
        // Check if the user's illness is listed in the dish's danger list
        if (
          dishUnsuitableList.some(
            (badIllness) => badIllness.toLowerCase() === illness.toLowerCase(),
          )
        ) {
          flaggedIllnesses.push(illness);
        }
      });

      let flaggedIngredients = [
        ...flaggedAllergies,
        ...flaggedProhibited,
        ...flaggedIllnesses,
      ];
      let status = "Safe";
      let reason = `${dishName} matches your dietary profile perfectly.`;

      // 4. Build Dynamic Reason
      if (flaggedIngredients.length > 0) {
        status = "Avoid";
        let dynamicReasons = [];

        if (flaggedAllergies.length > 0)
          dynamicReasons.push(`allergies (${flaggedAllergies.join(", ")})`);
        if (flaggedProhibited.length > 0)
          dynamicReasons.push(
            `prohibited foods (${flaggedProhibited.join(", ")})`,
          );
        if (flaggedIllnesses.length > 0)
          dynamicReasons.push(
            `medical condition (${flaggedIllnesses.join(", ")})`,
          ); // <-- NEW

        reason = `Warning! ${dishName} conflicts with your: ${dynamicReasons.join(" AND ")}.`;
      }

      // 5. Commit to Scan History
      const savedLog = await Scan.create({
        user: req.user._id,
        scanType: "text", // Saving it as text so the frontend history handles it easily
        extractedText: `Dish Checked: ${dishName} \nKnown Ingredients: ${ingredientsText}`,
        analysisResult: { status, flaggedIngredients, reason },
      });

      res.json({
        success: true,
        scanId: savedLog._id,
        status,
        extractedText: `Dish Checked: ${dishName} \nKnown Ingredients: ${ingredientsText}`,
        flaggedIngredients,
        reason,
        timestamp: savedLog.createdAt,
      });
    } catch (error) {
        console.error("🔴 DISH ANALYSIS ERROR:", error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get safe dish alternatives using AI
// @route   POST /api/scans/alternatives
// @access  Private
export const getSafeAlternatives = async (req, res) => {
  try {
    const { rejectedDish } = req.body;

    if (!rejectedDish) {
      return res
        .status(400)
        .json({ message: "Please provide the rejected dish name." });
    }

    // ✅ FIX 1: Fetch full user from DB (req.user only has JWT payload)
    const user = await User.findById(req.user._id);

    const userAllergies = user.healthProfile?.allergies || [];
    const userIllnesses = user.healthProfile?.userIllnesses || [];
    const userProhibited = user.healthProfile?.prohibitedFoods || [];

    const prompt = `You are a world-class culinary allergist. 
      My user wants to eat "${rejectedDish}" but cannot because it is unsafe for them.
      
      Here is their medical profile:
      - Allergies: ${userAllergies.join(", ") || "None"}
      - Illnesses: ${userIllnesses.join(", ") || "None"}
      - Prohibited Foods: ${userProhibited.join(", ") || "None"}

      Task: Suggest exactly 3 alternative dishes that are similar to "${rejectedDish}", but are 100% safe. 
      
      CRITICAL: You MUST return your response as a raw JSON array. No markdown, no extra text.
      Format strictly:
      [
        { "name": "Dish Name", "reason": "Why it is safe..." }
      ]`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      // ✅ Correct accessor for @google/genai new SDK
      const rawText = response.text;
      const cleanJson = rawText.replace(/```json|```/g, "").trim();
      const parsedAlternatives = JSON.parse(cleanJson);
      
    res.json({ success: true, aiSuggestion: parsedAlternatives });
  } catch (error) {
    console.error("AI Generation Error:", error); // ✅ Log full error, not just message
    if (error.status === 503 || error.message?.includes("503")) {
      return res.status(503).json({ message: "AI is busy, please try again." });
    }
    res
      .status(500)
      .json({
        message: "Failed to generate AI alternatives. Please try again.",
      });
  }
};

// @desc    Get food info from 'openfoodfact' api
// @route   GET /api/product/ingredientsCode
// @access  Private
export const analyzeBarcode = async (req, res) => {
  const { barcode } = req.body;
  try {
    // Look up the product using the barcode
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
    );

    if (response.data.status === 0) {
      return res
        .status(404)
        .json({ message: "Product not found in database." });
    }

    const ingredients = response.data.product.ingredients_text;

    // Now perform your existing "text analysis" logic on these ingredients
    // You can call your analyzeText logic or reuse the code you already wrote
    res.json({ success: true, extractedText: ingredients });
  } catch (err) {
    console.error("Barcode API Error:", err);
    res.status(500).json({ message: "Error fetching product data." });
  }
};
