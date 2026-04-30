import { z } from 'zod';

/**
 * TODO: Supported search types.
 */
export const SearchTypeSchema = z.enum(['name', 'steam', 'igdb', 'hash', 'serial', 'path', 'urn']);
export type SearchType = z.infer<typeof SearchTypeSchema>;

/**
 * TODO: Standardized search result format.
 * This contract is respected by all providers (local or remote).
 */
export const SearchResultSchema = z.object({
  source: z.enum(['local', 'igdb', 'hasheous', 'steam']),
  id: z.string(),
  name: z.string(),
  year: z.number().optional(),
  platform: z.string().optional(),
  ids: z.record(z.string()).default({}),
  localPath: z.string().optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;
