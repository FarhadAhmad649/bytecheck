import express from 'express';
import multer from 'multer';
import { createScan, getUserScans, analyzeImage, getScanHistory, analyzeText, addDishToDictionary, analyzeDish, getSafeAlternatives, getAllDishes, updateDish, deleteDish } from "../controllers/scanController.js";
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

// .... Menu Dish Dictionary routes
router.post('/add-dish', protect, admin, addDishToDictionary);

// .... Analyzing the dish route
router.post('/analyze-dish', protect, analyzeDish);

// .... Get safe alternative foods list
router.post("/alternatives", protect, getSafeAlternatives);

// ... Get all the dishes list (Admin only)
router.get("/dishes", protect, admin, getAllDishes);

// ... Update the dish using PUT
router.put("/dish/:id", protect, admin, updateDish);

// ... Delete dish from db using DELETE
router.delete("/dish/:id", protect, admin, deleteDish);

export default router;
