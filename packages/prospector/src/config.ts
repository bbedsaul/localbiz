import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

export interface TargetsConfig {
  cities: string[];
  categories: string[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_CONFIG_PATH = join(__dirname, '..', 'config', 'targets.json');

export function loadTargets(configPath: string = DEFAULT_CONFIG_PATH): TargetsConfig {
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  let rawContent: string;
  try {
    rawContent = readFileSync(configPath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read config file: ${configPath}`);
  }

  let config: unknown;
  try {
    config = JSON.parse(rawContent);
  } catch {
    throw new Error(`Invalid JSON in config file: ${configPath}`);
  }

  if (typeof config !== 'object' || config === null) {
    throw new Error(`Config must be an object: ${configPath}`);
  }

  const obj = config as Record<string, unknown>;

  if (!Array.isArray(obj.cities) || obj.cities.length === 0) {
    throw new Error('cities must be a non-empty array');
  }

  if (!obj.cities.every((c) => typeof c === 'string')) {
    throw new Error('cities must contain only strings');
  }

  if (!Array.isArray(obj.categories) || obj.categories.length === 0) {
    throw new Error('categories must be a non-empty array');
  }

  if (!obj.categories.every((c) => typeof c === 'string')) {
    throw new Error('categories must contain only strings');
  }

  return {
    cities: obj.cities as string[],
    categories: obj.categories as string[],
  };
}
