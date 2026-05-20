import Scan from "../models/Scan.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";

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
                    return res.status(500).json({ message: 'OCR failed', error: parsedResult.error });
                }

                const extractedIngredientsText = parsedResult.text.toLowerCase();

                const user = await User.findById(req.user._id);

                const userAllergies = user.healthProfile.allergies || [];
                const userProhibited = user.healthProfile.prohibitedFoods || [];

                let flaggedAllergies = [];
                let flaggedProhibited = [];

                // 1. Check Allergies specifically
                userAllergies.forEach((item) => {
                  
                  if (extractedIngredientsText.includes(item.toLowerCase())) {
                    flaggedAllergies.push(item);
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
                let reason =
                  "This item matches your dietary profile perfectly.";

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
                    scanType: 'image',
                    extractedText: parsedResult.text,
                    analysisResult: { status, flaggedIngredients, reason }
                });

                res.json({
                    success: true,
                    scanId: savedLog._id,
                    status,
                    extractedText: parsedResult.text,
                    flaggedIngredients,
                    reason,
                    timestamp: savedLog.createdAt
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

      // 1. Check Allergies specifically
      userAllergies.forEach((item) => {
        // Note: use 'textToAnalyze' instead of 'extractedIngredientsText' inside analyzeText
        if (textToAnalyze.includes(item.toLowerCase())) {
          flaggedAllergies.push(item);
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
