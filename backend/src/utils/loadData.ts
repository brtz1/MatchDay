import fs from 'fs';
import path from 'path';

const loadJSON = <T>(filePath: string): T => {
  const absolutePath = path.resolve(__dirname, filePath);
  const fileContents = fs.readFileSync(absolutePath, 'utf-8');
  return JSON.parse(fileContents) as T;
};

export default loadJSON;