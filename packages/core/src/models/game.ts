import { z } from 'zod';

/**
 * Standardized IDs for a game.
 */
export const GameIdsSchema = z.object({
  igdb: z.string().optional(),
  steam: z.string().optional(),
  serial: z.string().optional(),
  hash: z.string().optional(),
}).catchall(z.string());

export type GameIds = z.infer<typeof GameIdsSchema>;

/**
 * Metadata structure as it appears in orbit.metadata.toml
 */
export const GameMetadataSchema = z.object({
  general: z.object({
    name: z.string(),
    aliases: z.array(z.string()).default([]),
    summary: z.string().optional(),
    release_year: z.string().optional(),
    genres: z.array(z.string()).default([]),
    developers: z.array(z.string()).default([]),
    publishers: z.array(z.string()).default([]),
  }).default({ name: 'Unknown' }),
  source: z.object({
    source: z.array(z.string()).default([]),
    url: z.string().optional(),
  }).default({ source: [] }),
}).catchall(z.any());

export type GameMetadata = z.infer<typeof GameMetadataSchema>;

/**
 * The Pivot Model: represents a game throughout the Orbit ecosystem.
 */
export interface Game {
  name: string;
  platform: string;
  ids: GameIds;
  metadata: GameMetadata;
  
  // Optional filesystem information
  paths?: {
    absolute: string;       // Absolute path to game folder
    relative: string;       // Path relative to library root (e.g. Games/pc/XCOM 2)
    exists: boolean;
    hasMetadata: boolean;
    hasScreenshots: boolean;
    hasSavedata: boolean;
  };
}
