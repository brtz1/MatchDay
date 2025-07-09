// /backend/src/utils/fs.ts
import fs from 'fs';
import path from 'path';

/**
 * Reads a JSON file from the filesystem and parses its contents.
 * @param relativePath - Path relative to /src root (e.g. 'data/teams.json')
 * @returns Parsed object of type T
 */
export function readJsonFile<T>(relativePath: string): T {
  try {
    const fullPath = path.resolve(__dirname, '..', relativePath);
    const data = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (err) {
    console.error(`Failed to read or parse JSON from ${relativePath}:`, err);
    throw err;
  }
}
