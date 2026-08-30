import path from 'path';
import { mkdirSync } from 'fs';

const cwd = process.cwd();

export const outputDir = path.join(cwd, 'output');

mkdirSync(outputDir, { recursive: true });
