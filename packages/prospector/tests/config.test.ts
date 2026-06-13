import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_DIR = join(__dirname, 'fixtures', 'config-test');

let loadTargets: typeof import('../src/config.js').loadTargets;

beforeAll(async () => {
  const configModule = await import('../src/config.js');
  loadTargets = configModule.loadTargets;

  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
});

afterAll(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
});

describe('loadTargets', () => {
  it('should load valid config file', () => {
    const validConfig = {
      cities: ['Austin TX', 'Dallas TX'],
      categories: ['plumber', 'electrician'],
    };
    const configPath = join(TEST_DIR, 'valid.json');
    writeFileSync(configPath, JSON.stringify(validConfig));

    const result = loadTargets(configPath);

    expect(result).toEqual(validConfig);
    expect(result.cities).toHaveLength(2);
    expect(result.categories).toHaveLength(2);

    unlinkSync(configPath);
  });

  it('should throw error for missing file', () => {
    const missingPath = join(TEST_DIR, 'nonexistent.json');

    expect(() => loadTargets(missingPath)).toThrow('Config file not found');
  });

  it('should throw error for empty cities array', () => {
    const emptyConfig = {
      cities: [],
      categories: ['plumber'],
    };
    const configPath = join(TEST_DIR, 'empty-cities.json');
    writeFileSync(configPath, JSON.stringify(emptyConfig));

    expect(() => loadTargets(configPath)).toThrow('cities must be a non-empty array');

    unlinkSync(configPath);
  });

  it('should throw error for empty categories array', () => {
    const emptyConfig = {
      cities: ['Austin TX'],
      categories: [],
    };
    const configPath = join(TEST_DIR, 'empty-categories.json');
    writeFileSync(configPath, JSON.stringify(emptyConfig));

    expect(() => loadTargets(configPath)).toThrow('categories must be a non-empty array');

    unlinkSync(configPath);
  });

  it('should throw error for invalid JSON', () => {
    const configPath = join(TEST_DIR, 'bad.json');
    writeFileSync(configPath, '{ invalid json }');

    expect(() => loadTargets(configPath)).toThrow('Invalid JSON');

    unlinkSync(configPath);
  });

  it('should throw error for missing cities field', () => {
    const configPath = join(TEST_DIR, 'missing-cities.json');
    writeFileSync(configPath, JSON.stringify({ categories: ['plumber'] }));

    expect(() => loadTargets(configPath)).toThrow('cities must be a non-empty array');

    unlinkSync(configPath);
  });

  it('should throw error for non-string values in cities', () => {
    const configPath = join(TEST_DIR, 'invalid-cities.json');
    writeFileSync(configPath, JSON.stringify({ cities: [123, 'Austin'], categories: ['plumber'] }));

    expect(() => loadTargets(configPath)).toThrow('cities must contain only strings');

    unlinkSync(configPath);
  });
});
