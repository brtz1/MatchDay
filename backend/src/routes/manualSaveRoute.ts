import { Router } from 'express';
import { createSaveGame } from '../services/createSaveGame';

const router = Router();

router.post('/', async (req, res) => {
  const { name, coachName } = req.body;

  try {
    const id = await createSaveGame(name, coachName);
    res.status(200).json({ saveId: id, saveName: name });
  } catch (e: any) {
    console.error('❌ Manual save failed:', e.message);
    res.status(500).json({ error: 'Manual save failed' });
  }
});

export default router;
