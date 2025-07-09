import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

/**
 * Get all referees
 */
router.get('/', async (_req, res) => {
  try {
    const referees = await prisma.referee.findMany({
      include: {
        matches: true,
      },
    });
    res.json(referees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch referees' });
  }
});

/**
 * Get a single referee by id
 */
router.get('/:refereeId', async (req, res) => {
  const refereeId = parseInt(req.params.refereeId);
  if (isNaN(refereeId)) return res.status(400).json({ error: 'Invalid referee id' });

  try {
    const referee = await prisma.referee.findUnique({
      where: { id: refereeId },
      include: { matches: true },
    });
    if (!referee) return res.status(404).json({ error: 'Referee not found' });
    res.json(referee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch referee' });
  }
});

/**
 * Create a new referee
 */
router.post('/', async (req, res) => {
  const { name, country, strictness } = req.body;

  try {
    const newReferee = await prisma.referee.create({
      data: {
        name,
        country,
        strictness,
      },
    });
    res.status(201).json(newReferee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create referee' });
  }
});

/**
 * Update a referee
 */
router.put('/:refereeId', async (req, res) => {
  const refereeId = parseInt(req.params.refereeId);
  if (isNaN(refereeId)) return res.status(400).json({ error: 'Invalid referee id' });

  const { name, country, strictness } = req.body;

  try {
    const updated = await prisma.referee.update({
      where: { id: refereeId },
      data: {
        name,
        country,
        strictness,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update referee' });
  }
});

/**
 * Delete a referee
 */
router.delete('/:refereeId', async (req, res) => {
  const refereeId = parseInt(req.params.refereeId);
  if (isNaN(refereeId)) return res.status(400).json({ error: 'Invalid referee id' });

  try {
    await prisma.referee.delete({
      where: { id: refereeId },
    });
    res.json({ message: 'Referee deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete referee' });
  }
});

export default router;
