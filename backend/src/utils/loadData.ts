import fs from 'fs';
import path from 'path';

const loadJSON = <T>(filePath: string): T => {
  const data = fs.readFileSync(path.resolve(__dirname, filePath), 'utf-8');
  return JSON.parse(data) as T;
};

export default loadJSON;