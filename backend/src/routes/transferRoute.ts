import { Router } from 'express';
import { transfer } from '../controllers/transferController';

const router = Router();

router.post('/', transfer);

export default router;