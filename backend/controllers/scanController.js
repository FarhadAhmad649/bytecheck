import Scan from "../models/Scan.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import FoodDictionary from "../models/FoodDictionary.js";
import { allergenMap } from "../config/allergenMap.js";

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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
export const analyzeImage = async (req, res) => {
    try {
        
        if (!req.file) {
            console.log("🔴 Error: No file was received by Multer.");
            return res.status(400).json({ message: 'No image file uploaded' });
        }

        const imagePath = path.join(__dirname, '..', req.file.path);
        const scriptPath = path.join(__dirname, '..', 'ai_service', 'ocr_processor.py');


        // 1. Spawn Python Child Process
        const pythonProcess = spawn('python', [scriptPath, imagePath]);
        let pythonData = "";

        // Capture standard output
        pythonProcess.stdout.on('data', (data) => {
            pythonData += data.toString();
        });

        // ⚠️ THIS IS NEW: Capture hidden Python errors or OpenCV warnings
        pythonProcess.stderr.on('data', (data) => {
            console.error("🔴 PYTHON WARNING/ERROR:", data.toString());
        });

        // ⚠️ THIS IS NEW: Catch if Node fails to start Python entirely
        pythonProcess.on('error', (error) => {
            console.error("🔴 NODE FAILED TO START PYTHON:", error.message);
            if (!res.headersSent) {
                return res.status(500).json({ message: 'Failed to start Python', error: error.message });
            }
        });

        // 2. Wait for Python execution to finish
        pythonProcess.on('close', async (code) => {
            try {
              const parsedResult = JSON.parse(pythonData);

              if (!parsedResult.success) {
                console.log("🔴 OCR Failed inside Python script.");
                return res
                  .status(500)
                  .json({ message: "OCR failed", error: parsedResult.error });
              }

              const extractedIngredientsText = parsedResult.text.toLowerCase();

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

              // 2. Check Doctor Prohibited Foods specifically
              userProhibited.forEach((item) => {
                if (extractedIngredientsText.includes(item.toLowerCase())) {
                  flaggedProhibited.push(item);
                }
              });

              // 3. Combine them for the frontend list
              let flaggedIngredients = [
                ...flaggedAllergies,
                ...flaggedProhibited,
              ];

              let status = "Safe";
              let reason = "This item matches your dietary profile perfectly.";

              // 4. Build a DYNAMIC reason string based on what was found
              if (flaggedIngredients.length > 0) {
                status = "Avoid";
                let dynamicReasons = [];

                if (flaggedAllergies.length > 0) {
                  dynamicReasons.push(
                    `allergies (${flaggedAllergies.join(", ")})`,
                  );
                }
                if (flaggedProhibited.length > 0) {
                  dynamicReasons.push(
                    `doctor-prohibited foods (${flaggedProhibited.join(", ")})`,
                  );
                }

                reason = `Warning! Contains ingredients conflicting with your: ${dynamicReasons.join(" AND ")}.`;
              }

              const savedLog = await Scan.create({
                user: req.user._id,
                scanType: "image",
                extractedText: parsedResult.text,
                analysisResult: { status, flaggedIngredients, reason },
              });

              res.json({
                success: true,
                scanId: savedLog._id,
                status,
                extractedText: parsedResult.text,
                flaggedIngredients,
                reason,
                timestamp: savedLog.createdAt,
              });
            } catch (parseError) {
               
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Failed to process AI service response', error: parseError.message });
                }
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

// @desc    Manually check typed ingredients against allergies
// @route   POST /api/scans/analyze-text
// @access  Private
export const analyzeText = async (req, res) => {
    try {
      const { ingredientsText } = req.body;

      if (!ingredientsText || ingredientsText.trim() === "") {
        return res
          .status(400)
          .json({ message: "Please enter some ingredients to check." });
      }

      const textToAnalyze = ingredientsText.toLowerCase();

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

      // 2. Check Doctor Prohibited Foods specifically
      userProhibited.forEach((item) => {
        if (textToAnalyze.includes(item.toLowerCase())) {
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

      // 3. Commit result directly to Scan History (Marked as 'text' scanType)
      const savedLog = await Scan.create({
        user: req.user._id,
        scanType: "text",
        extractedText: ingredientsText,
        analysisResult: {
          status,
          flaggedIngredients,
          reason,
        },
      });

      // 4. Return unified final response
      res.json({
        success: true,
        scanId: savedLog._id,
        status,
        extractedText: ingredientsText,
        flaggedIngredients,
        reason,
        timestamp: savedLog.createdAt,
      });
    } catch (error) {
        console.error("🔴 TEXT ANALYSIS ERROR:", error.message);
        res.status(500).json({ message: error.message });
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
