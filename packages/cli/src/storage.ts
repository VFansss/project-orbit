import { PATHS } from './paths'
import { OrbitConfigSchema, type OrbitConfig } from '@orbit/core'
import { parse, stringify } from 'smol-toml'

/**
 * TODO: Mapping between TOML (snake_case) and TypeScript (camelCase).
 * This ensures we follow both language standards professionally.
 */
const mapToCamel = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  const newObj: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    newObj[camelKey] = typeof obj[key] === 'object' ? mapToCamel(obj[key]) : obj[key];
  }
  return newObj;
};

const mapToSnake = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  const newObj: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    newObj[snakeKey] = typeof obj[key] === 'object' ? mapToSnake(obj[key]) : obj[key];
  }
  return newObj;
};

/**
 * TODO: Load config, translate keys to camelCase, and validate.
 */
export async function loadConfig(): Promise<OrbitConfig> {
  const file = Bun.file(PATHS.configFile)
  if (!(await file.exists())) return OrbitConfigSchema.parse({});
  
  try {
    const text = await file.text();
    const rawData = parse(text);
    // Translate snake_case (file) -> camelCase (code)
    const camelData = mapToCamel(rawData);
    return OrbitConfigSchema.parse(camelData);
  } catch (err) {
    console.warn(`\x1b[33mWarning:\x1b[0m Config file invalid. Using defaults.`);
    return OrbitConfigSchema.parse({});
  }
}

/**
 * TODO: Save config, translate keys back to snake_case.
 */
export async function saveConfig(config: OrbitConfig): Promise<void> {
  const validConfig = OrbitConfigSchema.parse(config);
  // Translate camelCase (code) -> snake_case (file)
  const snakeData = mapToSnake(validConfig);
  const tomlText = stringify(snakeData);
  await Bun.write(PATHS.configFile, tomlText);
}
