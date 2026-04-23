import { z } from 'zod';

/**
 * TODO: Professional Log Levels.
 * ERROR: Only critical failures.
 * INFO: Important application milestones.
 * DEBUG: Detailed technical information (API calls, internal state).
 */
export const LogLevelSchema = z.enum(['ERROR', 'INFO', 'DEBUG']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

export const CONFIG_KEYS = [
  'currentUser', 
  'currentLibraryPath',
  'logLevel', // Renamed from verbose
  'igdbClientId', 
  'igdbClientSecret'
] as const;

export type OrbitConfigKey = typeof CONFIG_KEYS[number];
export const OrbitConfigKeySchema = z.enum(CONFIG_KEYS);

/**
 * TODO: The Source of Truth.
 */
export const OrbitConfigSchema = z.object({
  currentUser: z.string().optional(),
  currentLibraryPath: z.string().optional(),
  logLevel: LogLevelSchema.default('ERROR'),
  secrets: z.object({
    igdbClientId: z.string().optional(),
    igdbClientSecret: z.string().optional(),
  }).default({}),
});

export type OrbitConfig = z.infer<typeof OrbitConfigSchema>;
