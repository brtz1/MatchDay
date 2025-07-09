// src/controllers/importController.ts

import { Request, Response } from 'express';
import fs from 'fs/promises';
import { handleImport } from '../services/importService';

export const importData = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const rawData = await fs.readFile(req.file.path, 'utf-8');
    const jsonData = JSON.parse(rawData);

    await handleImport(jsonData);

    res.status(200).json({ message: 'Import successful' });
  } catch (error) {
    console.error('Import failed:', error);
    res.status(500).json({ error: 'Import failed' });
  }
};
