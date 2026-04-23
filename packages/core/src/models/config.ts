import { z } from 'zod';

/**
 * TODO: The Internal Model (TypeScript friendly - camelCase).
 * This is what we use throughout the app.
 */
export const OrbitConfigSchema = z.object({
  currentUser: z.string().optional(),
  currentLibraryPath: z.string().optional(),
  secrets: z.object({
    igdbClientId: z.string().optional(),
    igdbClientSecret: z.string().optional(),
  }).default({}),
});

export type OrbitConfig = z.infer<typeof OrbitConfigSchema>;

/**
 * TODO: Keys for CLI interactions. 
 * We keep them camelCase to match the model.
 */
export const CONFIG_KEYS = [
  'currentUser', 
  'currentLibraryPath', 
  'igdbClientId', 
  'igdbClientSecret'
] as const;

export type OrbitConfigKey = typeof CONFIG_KEYS[number];
export const OrbitConfigKeySchema = z.enum(CONFIG_KEYS);
