import { Router } from 'express';
import multer from 'multer';
import { importData } from '../controllers/importController';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/import', upload.single('file'), importData);

export default router;
