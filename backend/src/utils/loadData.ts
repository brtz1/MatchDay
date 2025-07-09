// src/utils/loadData.ts

import fs from 'fs';
import path from 'path';

/**
 * Generic JSON loader with type safety
 * @param relativePath - Relative path to JSON file from project root
 */
export const loadJSON = <T = any>(relativePath: string): T => {
  const absolutePath = path.resolve(process.cwd(), relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found at: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON from ${absolutePath}: ${(error as Error).message}`);
  }
};
