export const LIBRARY_MARKER = 'orbit.library.toml';
export const LIBRARY_FOLDERS = ['Games', 'UserData', 'Exports'];

export interface LibraryStatus {
  path?: string;
  isLoaded: boolean;
}

/**
 * Confidence Levels with descriptions
 */
export const CONFIDENCE_MAP = {
  0: 'Exact match (ID, Path, Serial+Platform)',
  1: 'High confidence (Exact Folder Name, Serial without Platform)',
  2: 'Medium confidence (Fuzzy Match, Alias, Online Result)',
  3: 'Low confidence (Multiple vague matches)',
  '-1': 'No match'
} as const;

export type ConfidenceLevel = keyof typeof CONFIDENCE_MAP;

export interface ResolveOptions {
  platforms?: string[];
  content?: ('games' | 'userdata')[];
  scope?: 'local' | 'online' | 'both';
  json?: boolean;
}

export interface ResolveResult {
  confidence: ConfidenceLevel;
  confidenceDescription: string;
  name: string;
  platform?: string;
  source?: string; // e.g. 'local', 'igdb', 'steam'
  ids: Record<string, string>;
  
  // Local File-System info
  local?: {
    path: string;           // Absolute path (usually in Games)
    relativePath: string;   // e.g. Games/pc/XCOM 2
    exists: boolean;        // True if folder exists in Games
    hasMetadata: boolean;   // True if metadata.toml exists
    hasScreenshots: boolean;
    hasSavedata: boolean;
  };

  metadata?: any; // Full metadata if requested or available
}

/**
 * Documentation for supported URNs and Shorthands
 */
export const URN_DEFINITIONS = [
  { type: 'name', example: 'name:XCOM 2', desc: 'Fuzzy search by game title' },
  { type: 'steam', example: 'steam:268500', desc: 'Match by Steam AppID' },
  { type: 'igdb', example: 'igdb:1942', desc: 'Match by IGDB ID' },
  { type: 'serial', example: 'serial:SLUS-01234', desc: 'Match [ID] in folder name or metadata' },
  { type: 'path', example: 'path:/absolute/path', desc: 'Match by exact file system path' },
  { type: 'urn', example: 'urn:orbit:steam:123', desc: 'Full Orbit URN format' },
] as const;
