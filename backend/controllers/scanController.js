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

// @desc    Upload food label image and analyze ingredients
export const analyzeImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image file uploaded" });

    // Catch the Family Target from the Frontend
    const scanTarget = req.body.scanTarget || "everyone";

    const imagePath = path.join(__dirname, "..", req.file.path);
    const scriptPath = path.join(__dirname, "..", "ai_service", "ocr_processor.py");

    const pythonProcess = spawn("python", [scriptPath, imagePath]);
    let pythonData = "";

    pythonProcess.stdout.on("data", (data) => {
      pythonData += data.toString();
    });
    
    pythonProcess.stderr.on("data", (data) => {
      console.error("🔴 PYTHON ERROR:", data.toString());
    });

    pythonProcess.on("close", async (code) => {
      console.log("\n=== 🔍 OCR DEBUG INFO ===");
      console.log("Python Exit Code:", code);
      console.log("Raw Python Output:", pythonData);
      console.log("=========================\n");

      try {
        const startIndex = pythonData.indexOf("{");
        const endIndex = pythonProcess.killed ? pythonData.length : pythonData.lastIndexOf("}") + 1;
        
        if (startIndex === -1) {
            console.error("❌ Failed to find JSON in Python output.");
            return res.status(500).json({ message: "OCR Engine failed to return readable data." });
        }

        const cleanJsonString = pythonData.substring(startIndex, endIndex);
        const parsedResult = JSON.parse(cleanJsonString);

        if (!parsedResult.success) {
          console.error("❌ Python script reported failure:", parsedResult.error);
          return res.status(500).json({ message: "OCR failed", error: parsedResult.error });
        }

        let extractedIngredientsText = "";
        const rawText = parsedResult.text.trim();
        const pureNumbersOnly = rawText.replace(/[^0-9]/g, "");
        const isBarcode = pureNumbersOnly.length >= 8 && pureNumbersOnly.length <= 14;

        if (isBarcode) {
          const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${rawText}.json`);
          extractedIngredientsText = response.data.product?.ingredients_text?.toLowerCase() || "";
          if (!extractedIngredientsText) {
            return res.status(404).json({ message: "Barcode found, but no ingredients available in database." });
          }
        } else {
          extractedIngredientsText = rawText.replace(/['"]/g, "").toLowerCase();
        }

        if (extractedIngredientsText.length < 2) {
          console.error("❌ OCR read too few characters. Raw Text was:", rawText);
          return res.status(400).json({
            message: "Could not read the text clearly. Please focus the camera or type it manually.",
          });
        }

        // Fetch User and Filter Profiles for the Dropdown
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found." });

        let profilesToCheck = user.familyProfiles && user.familyProfiles.length > 0
          ? user.familyProfiles
          : [{ name: user.name || "Me", allergies: [], prohibitedFoods: [], illnesses: [], isPrimary: true }];

        if (scanTarget && scanTarget !== "everyone") {
          const filteredProfiles = profilesToCheck.filter((profile) => profile.name === scanTarget);
          if (filteredProfiles.length > 0) profilesToCheck = filteredProfiles;
        }

        let familyResults = [];
        let overallSeverity = 0;
        let overallStatus = "Safe";

        // Run the Hazard Loop
        profilesToCheck.forEach((profile) => {
          let severityScore = 0;
          let status = "Safe";
          let warnings = [];
          let flaggedIngredients = [];

          const profileAllergies = profile.allergies || [];
          profileAllergies.forEach((allergy) => {
            const normalizedAllergy = allergy.toLowerCase();
            const hiddenNames = allergenMap[normalizedAllergy] || [
              normalizedAllergy,
            ];
            const foundHidden = hiddenNames.find((hidden) =>
              extractedIngredientsText.includes(hidden.toLowerCase()),
            );

            if (foundHidden) {
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

          // B. Check Prohibited Foods (80% Danger) - UPGRADED WITH CATEGORIES
          const profileProhibited = profile.prohibitedFoods || [];

          profileProhibited.forEach((item) => {
            const prohibitedTerm = item.toLowerCase();

            // Check 1: Direct Match (e.g., user explicitly blocked "chicken")
            if (extractedIngredientsText.includes(prohibitedTerm)) {
              if (severityScore < 80) severityScore = 80;
              status = "Avoid";

              if (!flaggedIngredients.includes(item)) {
                flaggedIngredients.push(item);
                warnings.push(
                  `DANGER: Contains doctor-prohibited food: ${item}.`,
                );
              }
            }

            // Check 2: Category Match (e.g., user blocked "oily foods")
            if (dietaryCategoryMap[prohibitedTerm]) {
              const hiddenCulprits = dietaryCategoryMap[prohibitedTerm];

              // Look through the label for any of the hidden culprits
              hiddenCulprits.forEach((culprit) => {
                if (extractedIngredientsText.includes(culprit)) {
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

        // 🔴 Gather all unique flagged ingredients from the family breakdown
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

        // Format the target name beautifully
        let displayTarget = "Whole Family";
        if (scanTarget && scanTarget !== "everyone") {
          displayTarget = Array.isArray(scanTarget) ? scanTarget.join(" & ") : scanTarget;
        }

        const atRiskMembers = familyResults
          .filter((member) => member.severityScore > 0)
          .map((member) => {
            const name = member.isPrimary ? "You" : member.memberName;
            const reasons = member.flaggedIngredients && member.flaggedIngredients.length > 0 
              ? `due to ${member.flaggedIngredients.join(", ")}` 
              : "due to dietary conflicts";
            return `${name} (${reasons})`;
          });

        let combinedReason = "";
        if (overallSeverity === 0) {
          combinedReason = `Scanned label is perfectly safe for the selected profile(s).`;
        } else {
          const riskList = atRiskMembers.join(", "); 
          combinedReason = `Warning: Scanned label poses a risk to: ${riskList}.`;
        }

        // 🔴 Save to Scan History (with Target Stamp & Populated Flags)
        const savedLog = await Scan.create({
          user: req.user._id,
          scanType: isBarcode ? "barcode" : "image",
          // INJECT THE TARGET INTO THE FIRST LINE
          extractedText: `Target: ${displayTarget}\nLabel Scanned: \n${extractedIngredientsText}`,
          analysisResult: {
            status: overallStatus,
            flaggedIngredients: allFlaggedIngredients, 
            reason: combinedReason,
          },
        });

        res.json({
          success: true,
          scanId: savedLog._id,
          productName: isBarcode ? "Scanned Barcode" : "Scanned Label",
          status: overallStatus,
          severityScore: overallSeverity,
          familyBreakdown: familyResults,
          extractedText: extractedIngredientsText,
          reason: combinedReason,
          timestamp: savedLog.createdAt,
        });

      } catch (parseError) {
        console.error("❌ Backend Parsing Error:", parseError);
        res.status(500).json({
          message: "Failed to process service response",
          error: parseError.message,
        });
      }
    });
  } catch (error) {
    console.error("❌ Controller Error:", error);
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
    const { ingredientsText } = req.body;
    const numericOnly = ingredientsText.replace(/\D/g, "");
    const isBarcode = numericOnly.length >= 8 && numericOnly.length <= 14;

    let textToAnalyze = "";

    if (isBarcode) {
      try {
        const response = await axios.get(
          `https://world.openfoodfacts.org/api/v0/product/${numericOnly}.json`,
        );
        if (response.data.status === 0) {
          return res.status(404).json({
            message:
              "Barcode recognized, but this product is not in the global OpenFoodFacts database.",
          });
        }
        textToAnalyze = response.data.product?.ingredients_text?.toLowerCase();
        if (!textToAnalyze || textToAnalyze.trim() === "") {
          return res.status(404).json({
            message:
              "Product found in global database, but ingredient list is missing.",
          });
        }
      } catch (apiError) {
        return res.status(500).json({
          message: "Failed to connect to the global barcode database.",
        });
      }
    } else {
      textToAnalyze = ingredientsText.toLowerCase();
    }

    const user = await User.findById(req.user._id);
    if (!user)
      return res.status(404).json({ message: "User profile not found." });

    const userAllergies = user.healthProfile?.allergies || [];
    const userProhibited = user.healthProfile?.prohibitedFoods || [];
    let flaggedAllergies = [];
    let flaggedProhibited = [];

    userAllergies.forEach((allergy) => {
      if (textToAnalyze.includes(allergy.toLowerCase()))
        flaggedAllergies.push(allergy);
    });

    userProhibited.forEach((item) => {
      if (textToAnalyze.includes(item.toLowerCase()))
        flaggedProhibited.push(item);
    });

    // 🔴 FIX: Strictly Safe or Avoid
    let severityScore = 0;
    let status = "Safe";
    let warnings = [];

    if (flaggedAllergies.length > 0) {
      severityScore = 100;
      status = "Avoid";
      warnings.push(
        `CRITICAL: Contains ${flaggedAllergies.join(", ")} which you are allergic to.`,
      );
    } else if (flaggedProhibited.length > 0) {
      severityScore = 80;
      status = "Avoid";
      warnings.push(
        `DANGER: Contains doctor-prohibited items: ${flaggedProhibited.join(", ")}.`,
      );
    }

    let flaggedIngredients = [...flaggedAllergies, ...flaggedProhibited];

    res.json({
      status,
      severityScore,
      warnings,
      reason:
        severityScore === 0
          ? "No matching allergens found."
          : warnings.join(" "),
      flaggedIngredients,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

      // B. Check Prohibited Foods (80% Danger)

      // B. Check Prohibited Foods (80% Danger) - UPGRADED WITH CATEGORIES
      const profileProhibited = profile.prohibitedFoods || [];

      profileProhibited.forEach((item) => {
        const prohibitedTerm = item.toLowerCase();

        // Check 1: Direct Match (e.g., user explicitly blocked "chicken")
        if (extractedIngredientsText.includes(prohibitedTerm)) {
          if (severityScore < 80) severityScore = 80;
          status = "Avoid";

          if (!flaggedIngredients.includes(item)) {
            flaggedIngredients.push(item);
            warnings.push(`DANGER: Contains doctor-prohibited food: ${item}.`);
          }
        }

        // 2. 🔴 NEW: Dietary Flags Match (The Smart Safety Net)
        // Check if any of the dish's flags conflict with the prohibited item
        // e.g. If dish has flag "oily", and prohibited item is "oily foods"
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

    // 🔴 NEW: Gather all unique flagged ingredients from the family breakdown
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

    // 🔴 NEW: Format the target name beautifully
    let displayTarget = "Whole Family";
    if (scanTarget && scanTarget !== "everyone") {
      displayTarget = Array.isArray(scanTarget) ? scanTarget.join(" & ") : scanTarget;
    }

    // 🔴 NEW: Inject Target into extractedText and save flaggedIngredients
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
    console.error("🔴 DISH ANALYSIS ERROR:", error.message);
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
    let allergiesToAvoid = [];
    let illnessesToAvoid = [];
    let prohibitedToAvoid = [];
    let targetName = "the user";

    // If a specific family member was selected, use their profile
    if (targetProfile && targetProfile !== "everyone") {
      const familyMember = user.familyProfiles.find(p => p.name === targetProfile);
      if (familyMember) {
        allergiesToAvoid = familyMember.allergies || [];
        illnessesToAvoid = familyMember.illnesses || [];
        prohibitedToAvoid = familyMember.prohibitedFoods || [];
        targetName = familyMember.name;
      }
    } else {
      // Otherwise, default to the primary user's profile
      allergiesToAvoid = user.healthProfile?.allergies || [];
      illnessesToAvoid = user.healthProfile?.userIllnesses || [];
      prohibitedToAvoid = user.healthProfile?.prohibitedFoods || [];
    }

    // 🔴 2. Create a hyper-specific prompt based on who is eating
    const prompt = `You are a world-class culinary allergist. 
      My client wants to eat "${rejectedDish}" but cannot because it is unsafe for ${targetName}.
      
      Here is ${targetName}'s specific medical profile:
      - Allergies: ${allergiesToAvoid.join(", ") || "None"}
      - Illnesses: ${illnessesToAvoid.join(", ") || "None"}
      - Prohibited Foods: ${prohibitedToAvoid.join(", ") || "None"}

      Task: Suggest exactly 3 alternative dishes that are similar to "${rejectedDish}", but are 100% safe.
      
      CRITICAL CONSTRAINTS - YOU MUST OBEY THESE STRICTLY:
      1. Medical Profile: The alternatives MUST NOT contain any of the recorded allergies or prohibited foods.
      2. Strict Halal Compliance: The user follows Islamic dietary laws. You MUST NOT suggest any dish containing alcohol (e.g., wine reductions, beer batter), pork, wild boar, bacon, gelatin of non-halal origin, or any other Haram ingredients.
      3. You MUST return your response as a raw JSON array. No markdown, no extra text.
       
      Format strictly:
      [
        { "name": "Dish Name", "reason": "Why it is safe..." }
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
    const cleanId = req.params.id.trim(); // 🔴 Clean the ID first

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
    console.error("❌ Delete Error:", error.message);
    res.status(500).json({ message: `BACKEND CRASH: ${error.message}` });
  }
};