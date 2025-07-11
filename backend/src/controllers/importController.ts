// src/controllers/importController.ts

import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { handleImport, ImportTeam, ImportPlayer } from '../services/importService';

/**
 * Type‐guard for ImportPlayer.
 */
function isImportPlayer(obj: unknown): obj is ImportPlayer {
  if (typeof obj !== 'object' || obj === null) return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.name === 'string' &&
    typeof p.position === 'string' &&
    (typeof p.rating === 'number' || p.rating === undefined) &&
    (typeof p.nationality === 'string' || p.nationality === undefined)
  );
}

/**
 * Type‐guard for ImportTeam.
 */
function isImportTeam(obj: unknown): obj is ImportTeam {
  if (typeof obj !== 'object' || obj === null) return false;
  const t = obj as Record<string, unknown>;
  if (
    typeof t.name !== 'string' ||
    typeof t.country !== 'string' ||
    typeof t.rating !== 'number'
  ) {
    return false;
  }
  if ('players' in t) {
    if (!Array.isArray(t.players)) return false;
    if (!t.players.every(isImportPlayer)) return false;
  }
  return true;
}

/**
 * Type‐guard for the full payload.
 */
function isImportPayload(obj: unknown): obj is { teams: ImportTeam[] } {
  if (typeof obj !== 'object' || obj === null) return false;
  const payload = obj as Record<string, unknown>;
  return (
    Array.isArray(payload.teams) &&
    payload.teams.every(isImportTeam)
  );
}

/**
 * Controller to handle JSON import of base teams & players.
 */
export async function importData(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.json') {
      res.status(400).json({ error: 'Uploaded file must be JSON' });
      return;
    }

    const raw = await fs.readFile(file.path, 'utf-8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      res.status(400).json({ error: 'Invalid JSON format' });
      return;
    }

    if (!isImportPayload(parsed)) {
      res.status(400).json({
        error: 'JSON must be an object with a `teams` array of { name, country, rating, players? }',
      });
      return;
    }

    await handleImport(parsed);
    res.status(200).json({ message: 'Import successful' });
  } catch (err) {
    console.error('❌ Import failed:', err);
    next(err);
  }
}
