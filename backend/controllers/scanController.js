import Scan from "../models/Scan.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import FoodDictionary from "../models/FoodDictionary.js";
import { allergenMap } from "../config/allergenMap.js";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the AI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── Dietary Category Map ────────────────────────────────────────────────
// Translates vague doctor advice into specific ingredient keywords
const dietaryCategoryMap = {
  "oily foods": [
    "oil",
    "fried",
    "ghee",
    "butter",
    "margarine",
    "lard",
    "tallow",
    "shortening",
  ],

  "high sugar": [
    "sugar",
    "syrup",
    "fructose",
    "sucrose",
    "honey",
    "molasses",
    "dextrose",
    "agave",
    "corn syrup",
    "jaggery",
  ],

  "high salt": [
    "salt",
    "sodium",
    "msg",
    "monosodium glutamate",
    "soy sauce",
    "brine",
    "pickle",
  ],

  "processed meats": [
    "sausage",
    "bacon",
    "salami",
    "hot dog",
    "pepperoni",
    "cured meat",
    "pastrami",
  ],

  "high cholesterol": [
    "egg yolk",
    "organ meat",
    "liver",
    "kidney",
    "brain",
    "butter",
    "ghee",
    "cream",
  ],

  "high fat": ["ghee", "butter", "cream", "cheese", "oil", "mayonnaise"],

  "spicy foods": [ "red chili", "green chili", "chili powder", "black pepper", "hot sauce"],

  "red meat": ["beef", "mutton", "lamb", "goat"],

  "high carb": ["rice", "flour", "naan", "roti", "bread", "potato", "sugar"],

  "dairy": ["milk", "cream", "butter", "cheese", "yogurt", "khoya"],

  "caffeine": ["tea", "coffee", "cola", "energy drink"],

  "gluten": ["wheat", "maida", "barley", "semolina"],
};

//........... Create a new scan record
export const createScan = async (req, res) => {
  try {
    const { scanType, extractedText, analysisResult } = req.body;
    const scan = new Scan({
      user: req.user._id,
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
    const scans = await Scan.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(scans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Get logged in user's complete scan history logs
export const getScanHistory = async (req, res) => {
  try {
    const scanHistory = await Scan.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({
      success: true,
      count: scanHistory.length,
      history: scanHistory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Manually check typed ingredients against allergies OR Live Barcode Scan
export const analyzeText = async (req, res) => {
  try {
    const { ingredientsText, scanTarget } = req.body;
    const numericOnly = ingredientsText.replace(/\D/g, "");
    const isBarcode = numericOnly.length >= 8 && numericOnly.length <= 14;

    let textToAnalyze = "";

    if (isBarcode) {
      try {
        const response = await axios.get(
          `https://world.openfoodfacts.org/api/v0/product/${numericOnly}.json`
        );
        if (response.data.status === 0) {
          return res.status(404).json({ message: "Barcode recognized, but this product is not in the database." });
        }
        textToAnalyze = response.data.product?.ingredients_text?.toLowerCase() || "";
        if (!textToAnalyze || textToAnalyze.trim() === "") {
          return res.status(404).json({ message: "Product found, but ingredient list is missing." });
        }
      } catch (apiError) {
        return res.status(500).json({ message: "Failed to connect to the global barcode database." });
      }
    } else {
      textToAnalyze = ingredientsText.toLowerCase();
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User profile not found." });

    // Determine which profiles to check (Family Target Logic)
    let targetProfiles = [];
    if (scanTarget && scanTarget !== "everyone") {
      const specificProfile = user.familyProfiles.find(p => p.name === scanTarget);
      if (specificProfile) targetProfiles.push(specificProfile);
    } else {
      targetProfiles = user.familyProfiles && user.familyProfiles.length > 0
        ? user.familyProfiles
        : [{ name: user.name || "Me", allergies: [], prohibitedFoods: [], illnesses: [], isPrimary: true }];
    }

    let familyResults = [];
    let overallSeverity = 0;
    let overallStatus = "Safe";
    let allFlaggedIngredients = [];

    // Loop through all selected profiles (Upgraded Hazard Loop)
    targetProfiles.forEach((profile) => {
      let severityScore = 0;
      let status = "Safe";
      let warnings = [];

      // A. Check Allergies (100% Critical)
      const profileAllergies = profile.allergies || [];
      profileAllergies.forEach((allergy) => {
        const normalizedAllergy = allergy.toLowerCase();
        const hiddenNames = allergenMap[normalizedAllergy] || [normalizedAllergy];
        const foundHidden = hiddenNames.find((hidden) => textToAnalyze.includes(hidden.toLowerCase()));

        if (foundHidden) {
          severityScore = 100;
          status = "Avoid";
          let alertText = foundHidden && foundHidden !== normalizedAllergy
              ? `${normalizedAllergy} (found as '${foundHidden}')` : normalizedAllergy;
              
          warnings.push(`CRITICAL: Contains ${alertText} which you are allergic to.`);
          if (!allFlaggedIngredients.includes(alertText)) allFlaggedIngredients.push(alertText);
        }
      });

      // B. Check Prohibited Foods (80% Danger) - Category Checks
      const profileProhibited = profile.prohibitedFoods || [];
      profileProhibited.forEach((item) => {
        const prohibitedTerm = item.toLowerCase();

        // Direct Text Match
        if (textToAnalyze.includes(prohibitedTerm)) {
          if (severityScore < 80) severityScore = 80;
          status = "Avoid";
          warnings.push(`DANGER: Contains doctor-prohibited food: ${item}.`);
          if (!allFlaggedIngredients.includes(item)) allFlaggedIngredients.push(item);
        }

        // Category Match (e.g., user blocked "oily foods")
        if (dietaryCategoryMap[prohibitedTerm]) {
          const hiddenCulprits = dietaryCategoryMap[prohibitedTerm];
          hiddenCulprits.forEach((culprit) => {
            if (textToAnalyze.includes(culprit)) {
              if (severityScore < 80) severityScore = 80;
              status = "Avoid";
              const alertText = `${item} (found as '${culprit}')`;
              warnings.push(`DANGER: Contains '${culprit}', which violates restriction against ${item}.`);
              if (!allFlaggedIngredients.includes(alertText)) allFlaggedIngredients.push(alertText);
            }
          });
        }
      });

      if (severityScore > overallSeverity) {
        overallSeverity = severityScore;
        overallStatus = status;
      }

      familyResults.push({
        memberName: profile.name,
        isPrimary: profile.isPrimary,
        severityScore,
        status,
        warnings,
      });
    });

    // Save to Scan History
    const savedLog = await Scan.create({
      user: req.user._id,
      scanType: isBarcode ? "barcode" : "text",
      extractedText: `Target: ${scanTarget}\nText Checked:\n${textToAnalyze}`,
      analysisResult: {
        status: overallStatus,
        flaggedIngredients: allFlaggedIngredients,
        reason: overallSeverity === 0 ? "No matching allergens found." : `Contains restricted items.`,
      },
    });

    // Send properly formatted response to React!
    res.json({
      success: true,
      scanId: savedLog._id,
      productName: isBarcode ? "Scanned Barcode" : "Typed Ingredients", // This fixes the missing UI title
      status: overallStatus,
      severityScore: overallSeverity,
      familyBreakdown: familyResults, // This makes the cards render
      extractedText: textToAnalyze,
    });
    
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check a dish name against all family profiles
// @route   POST /api/scans/analyze-dish
// @access  Private
export const analyzeDish = async (req, res) => {
  try {
    const { dishName, scanTarget } = req.body;

    if (!dishName || dishName.trim() === "") {
      return res.status(400).json({ message: "Please enter a dish name." });
    }

    // 1. Fetch the dish from the Food Dictionary
    const dish = await FoodDictionary.findOne({
      $or: [
        { dishName: { $regex: new RegExp(`^${dishName}$`, "i") } },
        { aliases: { $regex: new RegExp(`^${dishName}$`, "i") } },
      ],
    });

    if (!dish) {
      return res.status(404).json({
        message: `We couldn't find '${dishName}' in our database. Please check its ingredients manually.`,
      });
    }

    const ingredientsText = dish.ingredients.join(", ").toLowerCase();

    // 2. Fetch the logged-in User
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    let familyResults = [];
    let overallSeverity = 0;
    let overallStatus = "Safe";

    let profilesToCheck =
      user.familyProfiles && user.familyProfiles.length > 0
        ? user.familyProfiles
        : [
            {
              name: user.name || "Me",
              allergies: [],
              prohibitedFoods: [],
              illnesses: [],
              isPrimary: true,
            },
          ];

    if (scanTarget && scanTarget !== "everyone") {
      const filteredProfiles = profilesToCheck.filter(
        (profile) => profile.name === scanTarget,
      );
      if (filteredProfiles.length > 0) {
        profilesToCheck = filteredProfiles;
      }
    }

    // 3. THE MULTI-PROFILE LOOP
    profilesToCheck.forEach((profile) => {
      let severityScore = 0;
      let status = "Safe";
      let warnings = [];
      let flaggedIngredients = [];

      // A. Check Allergies (100% Critical)
      const profileAllergies = profile.allergies || [];
      profileAllergies.forEach((allergy) => {
        const normalizedAllergy = allergy.toLowerCase();
        const hiddenNames = allergenMap[normalizedAllergy] || [
          normalizedAllergy,
        ];
        const foundHidden = hiddenNames.find((hidden) =>
          ingredientsText.includes(hidden.toLowerCase()),
        );

        if (
          foundHidden ||
          dish.containsAllergies?.includes(normalizedAllergy)
        ) {
          severityScore = 100;
          status = "Avoid";
          let alertText =
            foundHidden && foundHidden !== normalizedAllergy
              ? `${normalizedAllergy} (found as '${foundHidden}')`
              : normalizedAllergy;

          if (!flaggedIngredients.includes(alertText)) {
            flaggedIngredients.push(alertText);
            warnings.push(
              `CRITICAL: Contains ${alertText} which you are allergic to.`,
            );
          }
        }
      });

      // B. Check Prohibited Foods (80% Danger) - UPGRADED WITH CATEGORIES & FLAGS
      const profileProhibited = profile.prohibitedFoods || [];
      const dishFlags = dish.dietaryFlags || []; // Fetch flags from database

      profileProhibited.forEach((item) => {
        const prohibitedTerm = item.toLowerCase();

        // 1. Direct Text Match (e.g., explicitly blocked "chicken")
        // FIX: Using ingredientsText here!
        if (ingredientsText.includes(prohibitedTerm)) {
          if (severityScore < 80) severityScore = 80;
          status = "Avoid";

          if (!flaggedIngredients.includes(item)) {
            flaggedIngredients.push(item);
            warnings.push(`DANGER: Contains doctor-prohibited food: ${item}.`);
          }
        }

        // 2. Category Match (e.g., user blocked "oily foods")
        if (dietaryCategoryMap[prohibitedTerm]) {
          const hiddenCulprits = dietaryCategoryMap[prohibitedTerm];

          hiddenCulprits.forEach((culprit) => {
            // FIX: Using ingredientsText here too!
            if (ingredientsText.includes(culprit)) {
              if (severityScore < 80) severityScore = 80;
              status = "Avoid";

              const alertText = `${item} (found as '${culprit}')`;
              if (!flaggedIngredients.includes(alertText)) {
                flaggedIngredients.push(alertText);
                warnings.push(
                  `DANGER: Contains '${culprit}', which violates your restriction against ${item}.`,
                );
              }
            }
          });
        }

        // 3. Dietary Flags Match (The Smart Safety Net)
        const hasFlagConflict = dishFlags.some(
          (flag) =>
            prohibitedTerm.includes(flag.toLowerCase()) ||
            flag.toLowerCase().includes(prohibitedTerm),
        );

        if (hasFlagConflict) {
          if (severityScore < 80) severityScore = 80;
          status = "Avoid";

          const flagAlertText = `Flagged as ${item}`;
          if (!flaggedIngredients.includes(flagAlertText)) {
            flaggedIngredients.push(flagAlertText);
            warnings.push(
              `DANGER: This dish is flagged for ${item}, which your doctor prohibited.`,
            );
          }
        }
      });

      // C. Check Illnesses (60% Caution)
      const profileIllnesses = profile.illnesses || [];
      const dishUnsuitableList = dish.unsuitableForIllnesses || [];
      profileIllnesses.forEach((illness) => {
        if (
          dishUnsuitableList.some(
            (badIllness) => badIllness.toLowerCase() === illness.toLowerCase(),
          )
        ) {
          if (severityScore < 100) {
            severityScore = Math.max(severityScore, 60);
            status = "Avoid";
            warnings.push(`CAUTION: Highly unsuitable for your ${illness}.`);
            flaggedIngredients.push(illness);
          }
        }
      });

      if (severityScore > overallSeverity) {
        overallSeverity = severityScore;
        overallStatus = status;
      }

      familyResults.push({
        memberName: profile.name,
        isPrimary: profile.isPrimary,
        severityScore,
        status,
        warnings,
        flaggedIngredients,
      });
    });

    // 4. Save to Scan History
    const atRiskMembers = familyResults
      .filter((member) => member.severityScore > 0)
      .map((member) => {
        const name = member.isPrimary ? "You" : member.memberName;
        const reasons =
          member.flaggedIngredients && member.flaggedIngredients.length > 0
            ? `due to ${member.flaggedIngredients.join(", ")}`
            : "due to dietary conflicts";
        return `${name} (${reasons})`;
      });

    let combinedReason = "";
    if (overallSeverity === 0) {
      combinedReason = `${dishName} is perfectly safe for the selected profile(s).`;
    } else {
      const riskList = atRiskMembers.join(", ");
      combinedReason = `Warning: ${dishName} poses a risk to: ${riskList}.`;
    }

    // NEW: Gather all unique flagged ingredients from the family breakdown
    let allFlaggedIngredients = [];
    familyResults.forEach(member => {
      if (member.flaggedIngredients && member.flaggedIngredients.length > 0) {
        member.flaggedIngredients.forEach(ing => {
          if (!allFlaggedIngredients.includes(ing)) {
            allFlaggedIngredients.push(ing);
          }
        });
      }
    });

    // NEW: Format the target name beautifully
    let displayTarget = "Whole Family";
    if (scanTarget && scanTarget !== "everyone") {
      displayTarget = Array.isArray(scanTarget) ? scanTarget.join(" & ") : scanTarget;
    }

    // NEW: Inject Target into extractedText and save flaggedIngredients
    const savedLog = await Scan.create({
      user: req.user._id,
      scanType: "dish",
      extractedText: `Target: ${displayTarget}\nDish Checked: ${dishName} \nKnown Ingredients: ${ingredientsText}`,
      analysisResult: {
        status: overallStatus,
        flaggedIngredients: allFlaggedIngredients,
        reason: combinedReason,
      },
    });

    // 5. Send the breakdown back to React
    res.json({
      success: true,
      scanId: savedLog._id,
      dishName: dish.dishName,
      status: overallStatus, 
      severityScore: overallSeverity, 
      familyBreakdown: familyResults,
      extractedText: `Dish Checked: ${dishName} \nKnown Ingredients: ${ingredientsText}`,
      reason: combinedReason,
      timestamp: savedLog.createdAt,
    });
  } catch (error) {
    console.error("DISH ANALYSIS ERROR:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get safe dish alternatives using AI
export const getSafeAlternatives = async (req, res) => {
  try {
    const { rejectedDish, targetProfile } = req.body;
    
    if (!rejectedDish) {
      return res.status(400).json({ message: "Please provide the rejected dish name." });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    // 🔴 1. Determine whose medical profile we need to send to the AI
    // We use Sets to automatically prevent duplicate ingredients/illnesses
    let allergiesToAvoid = new Set();
    let illnessesToAvoid = new Set();
    let prohibitedToAvoid = new Set();
    let targetName = "the user";

    // If a specific family member was selected, use only their profile
    if (targetProfile && targetProfile !== "everyone") {
      const familyMember = user.familyProfiles.find(p => p.name === targetProfile);
      if (familyMember) {
        (familyMember.allergies || []).forEach(a => allergiesToAvoid.add(a.toLowerCase()));
        (familyMember.illnesses || []).forEach(i => illnessesToAvoid.add(i.toLowerCase()));
        (familyMember.prohibitedFoods || []).forEach(p => prohibitedToAvoid.add(p.toLowerCase()));
        targetName = familyMember.name;
      }
    } else {
      // 🔴 THE FIX: Loop through ALL family members to create a Master Restriction List
      targetName = "the entire family";
      
      const profilesToCheck = user.familyProfiles && user.familyProfiles.length > 0 
        ? user.familyProfiles 
        : [{ name: user.name || "Me", allergies: [], prohibitedFoods: [], illnesses: [] }];

      profilesToCheck.forEach(profile => {
        (profile.allergies || []).forEach(a => allergiesToAvoid.add(a.toLowerCase()));
        (profile.illnesses || []).forEach(i => illnessesToAvoid.add(i.toLowerCase()));
        (profile.prohibitedFoods || []).forEach(p => prohibitedToAvoid.add(p.toLowerCase()));
      });
    }

    // Convert Sets back to Arrays for the prompt
    const finalAllergies = Array.from(allergiesToAvoid);
    const finalIllnesses = Array.from(illnessesToAvoid);
    const finalProhibited = Array.from(prohibitedToAvoid);

    // 🔴 2. Create a hyper-specific prompt based on who is eating
    const prompt = `You are a world-class culinary allergist. 
      My client wants to eat "${rejectedDish}" but cannot because it is unsafe for ${targetName}.
      
      Here is the combined strict medical profile for ${targetName}:
      - Allergies: ${finalAllergies.length > 0 ? finalAllergies.join(", ") : "None"}
      - Illnesses: ${finalIllnesses.length > 0 ? finalIllnesses.join(", ") : "None"}
      - Prohibited Foods: ${finalProhibited.length > 0 ? finalProhibited.join(", ") : "None"}

      Task: Suggest exactly 3 alternative dishes that are similar to "${rejectedDish}", but are 100% safe.
      
      CRITICAL CONSTRAINTS - YOU MUST OBEY THESE STRICTLY:
      1. Medical Profile: The alternatives MUST NOT contain ANY of the recorded allergies or prohibited foods listed above.
      2. Strict Halal Compliance: The user follows Islamic dietary laws. You MUST NOT suggest any dish containing alcohol (e.g., wine reductions, beer batter), pork, wild boar, bacon, gelatin of non-halal origin, or any other Haram ingredients.
      3. You MUST return your response as a raw JSON array. No markdown, no extra text.
       
      Format strictly:
      [
        { "name": "Dish Name", "reason": "Why it is safe for ${targetName} based on their specific restrictions..." }
      ]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const rawText = response.text;
    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    const parsedAlternatives = JSON.parse(cleanJson);

    res.json({ success: true, aiSuggestion: parsedAlternatives });
  } catch (error) {
    console.error("AI Generation Error:", error);
    if (error.status === 503 || error.message?.includes("503")) {
      return res.status(503).json({ message: "AI is busy, please try again." });
    }
    res.status(500).json({
      message: "Failed to generate AI alternatives. Please try again.",
    });
  }
};

// @desc    Get food info from 'openfoodfact' api
export const analyzeBarcode = async (req, res) => {
  const { barcode } = req.body;
  try {
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
    );
    if (response.data.status === 0) {
      return res
        .status(404)
        .json({ message: "Product not found in database." });
    }
    const ingredients = response.data.product.ingredients_text;
    res.json({ success: true, extractedText: ingredients });
  } catch (err) {
    console.error("Barcode API Error:", err);
    res.status(500).json({ message: "Error fetching product data." });
  }
};

// @desc    Delete a specific scan record
// @route   DELETE /api/scans/:id
// @access  Private
export const deleteScan = async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id);
    
    if (!scan) return res.status(404).json({ message: "Scan not found" });
    
    // Ensure the user owns this scan
    if (scan.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await scan.deleteOne();
    res.json({ message: "Scan record removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//.................................................... Dishes and it's maintenance..............

// @desc    Add a new dish to the dictionary (For testing/admin)
export const addDishToDictionary = async (req, res) => {
  try {
    const {
      dishName,
      ingredients,
      aliases,
      unsuitableForIllnesses,
      containsAllergies,
      dietaryFlags,
    } = req.body;

    const newDish = await FoodDictionary.create({
      dishName,
      aliases,
      ingredients,
      unsuitableForIllnesses,
      containsAllergies,
      dietaryFlags,
    });

    res.status(201).json({
      message: "Dish added to dictionary with medical ontology!",
      dish: newDish,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all dishes for Admin Dashboard
// @route   GET /api/scans/dishes
// @access  Private
export const getAllDishes = async (req, res) => {
  try {
    const dishes = await FoodDictionary.find().sort({ createdAt: -1 });
    res.json(dishes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an existing dish
// @route   PUT /api/scans/dish/:id
// @access  Private
export const updateDish = async (req, res) => {
  try {
    const cleanId = req.params.id.trim(); //  Clean the ID first

    const {
      dishName,
      aliases,
      ingredients,
      unsuitableForIllnesses,
      containsAllergies,
      dietaryFlags,
    } = req.body;

    const updatedDish = await FoodDictionary.findByIdAndUpdate(
      cleanId,
      {
        dishName,
        aliases,
        ingredients,
        unsuitableForIllnesses,
        containsAllergies,
        dietaryFlags,
      },
      { new: true, runValidators: true },
    );

    if (!updatedDish)
      return res.status(404).json({ message: "Dish not found" });
    res.json({ message: "Dish updated successfully", dish: updatedDish });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: `A dish named '${error.keyValue.dishName}' already exists. Please rename it.`,
      });
    }
    console.error("❌ Update Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a dish
// @route   DELETE /api/scans/dish/:id
// @access  Private
export const deleteDish = async (req, res) => {
  try {
    const cleanId = req.params.id.trim();
    const deletedDish = await FoodDictionary.findByIdAndDelete(cleanId);

    if (!deletedDish) {
      return res.status(404).json({ message: "Dish not found in database." });
    }

    res.json({ message: "Dish deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error.message);
    res.status(500).json({ message: `BACKEND CRASH: ${error.message}` });
  }
};

//............................................... Analyzing Menu Card .......................

// @desc    Smart Scan: Automatically detect if image is a Label, Menu, or Single Dish
// @route   POST /api/scans/analyze-smart
// @access  Private
export const analyzeSmartScan = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });

    const scanTarget = req.body.scanTarget || "everyone";
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Determine target profiles
    let targetProfiles = [];
    if (scanTarget === "everyone") {
      targetProfiles = user.familyProfiles && user.familyProfiles.length > 0
        ? user.familyProfiles
        : [{ name: user.name || "Me", allergies: [], prohibitedFoods: [], illnesses: [], isPrimary: true }];
    } else {
      const specificProfile = user.familyProfiles.find(p => p.name === scanTarget);
      if (specificProfile) targetProfiles.push(specificProfile);
    }

    // 1. RUN PYTHON OCR
    const imagePath = path.join(__dirname, "..", req.file.path);
    const scriptPath = path.join(__dirname, "..", "ai_service", "ocr_processor.py");

    const pythonProcess = spawn("python", [scriptPath, imagePath]);
    let pythonData = "";

    pythonProcess.stdout.on("data", (data) => { pythonData += data.toString(); });
    pythonProcess.stderr.on("data", (data) => { console.error("PYTHON ERROR:", data.toString()); });

    pythonProcess.on("close", async (code) => {
      try {
        const startIndex = pythonData.indexOf("{");
        const endIndex = pythonProcess.killed ? pythonData.length : pythonData.lastIndexOf("}") + 1;
        
        if (startIndex === -1) return res.status(500).json({ message: "OCR Engine failed to read text." });

        const parsedResult = JSON.parse(pythonData.substring(startIndex, endIndex));
        if (!parsedResult.success) return res.status(500).json({ message: "OCR failed", error: parsedResult.error });

        const rawText = parsedResult.text.trim();
        const pureNumbersOnly = rawText.replace(/[^0-9]/g, "");
        const isBarcode = pureNumbersOnly.length >= 8 && pureNumbersOnly.length <= 14;
        
        const dictionary = await FoodDictionary.find();
        let detectedType = "label"; // Default fallback
        let menuLines = [];
        let matchedDishes = [];
        let extractedIngredientsText = rawText.toLowerCase();

        // 2. INTELLIGENT ROUTING
        if (isBarcode) {
          detectedType = "label";
          const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${pureNumbersOnly}.json`);
          extractedIngredientsText = response.data.product?.ingredients_text?.toLowerCase() || "";
          if (!extractedIngredientsText) return res.status(404).json({ message: "Barcode found, but no ingredients available in database." });
        } else {
          menuLines = rawText.split("\n").map(line => line.trim().toLowerCase()).filter(line => line.length > 2);
          
          menuLines.forEach((line) => {
            const matched = dictionary.find((d) => 
              line.includes(d.dishName.toLowerCase()) || 
              (d.aliases && d.aliases.some((alias) => line.includes(alias.toLowerCase())))
            );
            if (matched && !matchedDishes.some(md => md._id.toString() === matched._id.toString())) {
              matchedDishes.push(matched);
            }
          });

          // FIXED HEURISTIC: Prevent Mobile Menus from defaulting to Labels!
          if (extractedIngredientsText.includes("ingredients") || extractedIngredientsText.includes("contains:")) {
            detectedType = "label";
          } else if (matchedDishes.length > 1) {
            detectedType = "menu";
          } else if (matchedDishes.length === 1) {
            detectedType = "dish";
          } else if (menuLines.length > 3) {
            // If it has many lines of text but missed the DB, it is a blurry Menu, NOT a label!
            detectedType = "menu"; 
          }
        }

        // 3. EXECUTE LOGIC BASED ON DETECTED TYPE
        if (detectedType === "menu") {
          // --- MENU LOGIC ---
          let menuResults = [];
          let allMenuFlags = []; // For history
          
          matchedDishes.forEach((matchedDish) => {
            let highestSeverity = 0;
            let finalStatus = "Safe";
            let dishFamilyBreakdown = [];

            targetProfiles.forEach((profile) => {
              let severityScore = 0;
              let warnings = [];
              let profileStatus = "Safe";

              (profile.allergies || []).forEach((allergy) => {
                if ((matchedDish.containsAllergies || []).some(da => da.toLowerCase().includes(allergy.toLowerCase()))) {
                  severityScore = 100; warnings.push(`CRITICAL: Contains ${allergy}`);
                  if (!allMenuFlags.includes(allergy)) allMenuFlags.push(allergy);
                }
              });

              (profile.prohibitedFoods || []).forEach((prohibited) => {
                if ((matchedDish.dietaryFlags || []).some(flag => flag.toLowerCase().includes(prohibited.toLowerCase()) || prohibited.toLowerCase().includes(flag.toLowerCase()))) {
                  if (severityScore < 80) severityScore = 80; warnings.push(`DANGER: Flagged for ${prohibited}`);
                  if (!allMenuFlags.includes(prohibited)) allMenuFlags.push(prohibited);
                }
              });

              (profile.illnesses || []).forEach((illness) => {
                if ((matchedDish.unsuitableForIllnesses || []).some(bad => bad.toLowerCase() === illness.toLowerCase())) {
                  if (severityScore < 60) severityScore = 60; warnings.push(`CAUTION: Unsuitable for ${illness}`);
                }
              });

              if (severityScore === 100 || severityScore === 80) profileStatus = "Avoid";
              else if (severityScore >= 60) profileStatus = "Caution";
              if (severityScore > highestSeverity) highestSeverity = severityScore;

              dishFamilyBreakdown.push({ memberName: profile.name, isPrimary: profile.isPrimary, severityScore, status: profileStatus, warnings });
            });

            if (highestSeverity === 100 || highestSeverity === 80) finalStatus = "Avoid";
            else if (highestSeverity >= 60) finalStatus = "Caution";

            menuResults.push({ dishName: matchedDish.dishName, status: finalStatus, severityScore: highestSeverity, familyBreakdown: dishFamilyBreakdown });
          });

          // NEW: SAVE MENU SCAN TO MONGODB HISTORY
          let overallMenuStatus = "Safe";
          if (menuResults.some(m => m.status === "Avoid")) overallMenuStatus = "Avoid";
          else if (menuResults.some(m => m.status === "Caution")) overallMenuStatus = "Caution";

          await Scan.create({
            user: req.user._id,
            scanType: "menu",
            extractedText: `Target: ${scanTarget}\nMenu Scanned. ${matchedDishes.length} recognizable dishes found.`,
            analysisResult: {
                status: overallMenuStatus,
                flaggedIngredients: allMenuFlags,
                reason: `Analyzed menu against ${scanTarget} profiles.`
            }
          });

          return res.json({ success: true, scanType: "menu", menuResults });

        } else if (detectedType === "dish") {
          // --- SINGLE DISH LOGIC ---
          const dish = matchedDishes[0];
          let highestSeverity = 0;
          let finalStatus = "Safe";
          let dishFamilyBreakdown = [];
          let allDishFlags = [];

          targetProfiles.forEach((profile) => {
              let severityScore = 0;
              let warnings = [];
              let profileStatus = "Safe";

              (profile.allergies || []).forEach((allergy) => {
                if ((dish.containsAllergies || []).some(da => da.toLowerCase().includes(allergy.toLowerCase()))) {
                  severityScore = 100; warnings.push(`CRITICAL: Contains ${allergy}`);
                  if (!allDishFlags.includes(allergy)) allDishFlags.push(allergy);
                }
              });

              (profile.prohibitedFoods || []).forEach((prohibited) => {
                if ((dish.dietaryFlags || []).some(flag => flag.toLowerCase().includes(prohibited.toLowerCase()) || prohibited.toLowerCase().includes(flag.toLowerCase()))) {
                  if (severityScore < 80) severityScore = 80; warnings.push(`DANGER: Flagged for ${prohibited}`);
                  if (!allDishFlags.includes(prohibited)) allDishFlags.push(prohibited);
                }
              });

              (profile.illnesses || []).forEach((illness) => {
                if ((dish.unsuitableForIllnesses || []).some(bad => bad.toLowerCase() === illness.toLowerCase())) {
                  if (severityScore < 60) severityScore = 60; warnings.push(`CAUTION: Unsuitable for ${illness}`);
                }
              });

              if (severityScore === 100 || severityScore === 80) profileStatus = "Avoid";
              else if (severityScore >= 60) profileStatus = "Caution";
              if (severityScore > highestSeverity) highestSeverity = severityScore;

              dishFamilyBreakdown.push({ memberName: profile.name, isPrimary: profile.isPrimary, severityScore, status: profileStatus, warnings });
          });

          if (highestSeverity === 100 || highestSeverity === 80) finalStatus = "Avoid";
          else if (highestSeverity >= 60) finalStatus = "Caution";

          // NEW: SAVE DISH SCAN TO MONGODB HISTORY
          await Scan.create({
            user: req.user._id,
            scanType: "dish",
            extractedText: `Target: ${scanTarget}\nDish Checked: ${dish.dishName}`,
            analysisResult: {
                status: finalStatus,
                flaggedIngredients: allDishFlags,
                reason: `Analyzed single dish against ${scanTarget} profiles.`
            }
          });

          return res.json({ 
            success: true, 
            scanType: "dish", 
            dishName: dish.dishName, 
            status: finalStatus, 
            severityScore: highestSeverity, 
            familyBreakdown: dishFamilyBreakdown 
          });

        } else {
          // --- LABEL / INGREDIENT LOGIC ---
          let familyResults = [];
          let overallSeverity = 0;
          let overallStatus = "Safe";
          let allLabelFlags = [];

          targetProfiles.forEach((profile) => {
            let severityScore = 0;
            let status = "Safe";
            let warnings = [];

            (profile.allergies || []).forEach((allergy) => {
              const hiddenNames = allergenMap[allergy.toLowerCase()] || [allergy.toLowerCase()];
              const foundHidden = hiddenNames.find((hidden) => extractedIngredientsText.includes(hidden.toLowerCase()));
              if (foundHidden) {
                severityScore = 100; status = "Avoid"; warnings.push(`CRITICAL: Contains ${allergy} (found as '${foundHidden}')`);
                if (!allLabelFlags.includes(allergy)) allLabelFlags.push(allergy);
              }
            });

            (profile.prohibitedFoods || []).forEach((item) => {
              if (extractedIngredientsText.includes(item.toLowerCase())) {
                if (severityScore < 80) severityScore = 80; status = "Avoid"; warnings.push(`DANGER: Contains doctor-prohibited food: ${item}`);
                if (!allLabelFlags.includes(item)) allLabelFlags.push(item);
              }
            });

            if (severityScore > overallSeverity) {
              overallSeverity = severityScore;
              overallStatus = status;
            }

            familyResults.push({ memberName: profile.name, isPrimary: profile.isPrimary, severityScore, status, warnings });
          });

          // RETAINED: SAVE LABEL SCAN TO MONGODB HISTORY
          await Scan.create({
            user: req.user._id,
            scanType: isBarcode ? "barcode" : "label",
            extractedText: `Target: ${scanTarget}\nLabel Text:\n${extractedIngredientsText.substring(0, 100)}...`,
            analysisResult: {
              status: overallStatus,
              flaggedIngredients: allLabelFlags,
              reason: overallSeverity === 0 ? "No matching allergens found." : `Contains restricted items.`
            }
          });

          return res.json({
            success: true,
            scanType: "label",
            productName: isBarcode ? "Scanned Barcode" : "Scanned Label",
            status: overallStatus,
            severityScore: overallSeverity,
            familyBreakdown: familyResults,
            extractedText: extractedIngredientsText,
          });
        }
      } catch (parseError) {
        console.error("Backend Parsing Error:", parseError);
        res.status(500).json({ message: "Failed to process service response", error: parseError.message });
      }
    });
  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ message: error.message });
  }
};