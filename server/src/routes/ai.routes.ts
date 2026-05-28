import { Router } from 'express';
import multer from 'multer';
import { generateNarrative, getHistory } from '../controllers/ai.controller.js'; // 🚀 Added getHistory

const router = Router();

// Setup Multer to handle image uploads in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 1. The execution route (The "Generate" button)
router.post('/generate', upload.single('image'), generateNarrative);

// 2. The database fetch route (The "History Gallery")
router.get('/history', getHistory); // 🚀 Added this line

export default router;