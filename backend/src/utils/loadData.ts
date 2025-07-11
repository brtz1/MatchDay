// src/utils/loadData.ts

import fs from 'fs';
import path from 'path';

/**
 * Loads and parses a JSON file from disk.
 *
 * @param filePath - Path to the JSON file, relative to the project root
 *                   (e.g. 'src/data/teams.json').
 * @returns The parsed JSON as type T.
 * @throws Error if the file does not exist or contains invalid JSON.
 */
export function loadJSON<T>(filePath: string): T {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`JSON file not found: ${fullPath}`);
  }

  const raw = fs.readFileSync(fullPath, 'utf-8');
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new Error(`Failed to parse JSON from ${fullPath}: ${(err as Error).message}`);
  }
}
