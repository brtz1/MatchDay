import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { importData } from '../controllers/importController';

// Configure upload directory via env or default
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
const upload = multer({ dest: uploadDir });

const router = express.Router();

/**
 * POST /api/import
 * Expects a form-data 'file' field containing a JSON import file.
 */
router.post('/', upload.single('file'), importData);

// Optional: health check for import endpoint
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'Import endpoint is up' });
});

export default router;
