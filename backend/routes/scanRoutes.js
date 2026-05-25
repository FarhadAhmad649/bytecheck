import express from 'express';
import multer from 'multer';
import { createScan, getUserScans, analyzeImage, getScanHistory, analyzeText, addDishToDictionary, analyzeDish, getSafeAlternatives } from "../controllers/scanController.js";
import { protect } from "../middleware/authMiddleware.js";
import { admin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// ... Configure Multer storage settings locally within routes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Set limit to 5MB
  },
});

// ... Both routes are protected.
// A POST request saves a scan, a GET request fetches the history.
router.route("/").post(protect, createScan).get(protect, getUserScans);
/* ...... WE use the above method due to the principle DRY as    they are the same routes just little difference.....
// router.post("/", protect, createScan); 
// router.get("/", protect, getUserScans);
*/

// ... Image processing endpoint routes to analyze the image
router.post('/analyze-image', protect, upload.single('labelImage'), analyzeImage);

// ... Getting history route
router.get('/history', protect, getScanHistory)

// .... Manual text processing endpoint
router.post('/analyze-text', protect, analyzeText);

// Menu Dish Dictionary routes
router.post('/add-dish', protect, admin, addDishToDictionary);
router.post('/analyze-dish', protect, analyzeDish);

router.post("/alternatives", protect, getSafeAlternatives);

export default router;
