// src/utils/fs.ts

import fs from 'fs';
import path from 'path';

/**
 * Reads a JSON file from disk and parses it.
 *
 * @param relativePath - Path to the JSON file, relative to the `src/` directory
 *                       (e.g. 'data/teams.json' will resolve to '<projectRoot>/src/data/teams.json').
 * @returns The parsed JSON as type T.
 * @throws If the file cannot be read or parsed.
 */
export function readJsonFileSync<T>(relativePath: string): T {
  const fullPath = path.resolve(__dirname, '..', relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`JSON file not found: ${fullPath}`);
  }

  const raw = fs.readFileSync(fullPath, 'utf-8');
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Failed to parse JSON at ${fullPath}:`, err);
    throw err;
  }
}
