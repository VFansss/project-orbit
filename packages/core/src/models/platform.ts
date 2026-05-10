export type OS = 'windows' | 'linux' | 'macos' | 'android' | 'ios' | 'unknown';

export interface PlatformStatus {
  os: OS;
  arch: string;
  isMobile: boolean;
}

export type PlatformCategory = 'console' | 'handheld' | 'computer' | 'arcade' | 'hybrid';

/**
 * Registry of supported game platforms in Orbit.
 * The key is the internal Orbit slug used for folders (e.g., 'pc', 'ps1').
 */
export interface GamePlatformDefinition {
  id: string;              // Orbit slug (e.g. 'pc')
  name: string;            // Human readable name (e.g. 'Sony PlayStation')
  manufacturer?: string;   // e.g. 'Sony', 'Nintendo'
  category: PlatformCategory;
  extensions: string[];    // Supported file extensions (e.g. ['.bin', '.cue', '.iso'])
  isRetro?: boolean;       // Flag for UI or logic distinction
}

export const SUPPORTED_PLATFORMS: Record<string, GamePlatformDefinition> = {
  'pc': {
    id: 'pc',
    name: 'PC (Windows/Linux)',
    manufacturer: 'Generic',
    category: 'computer',
    extensions: ['.exe', '.lnk', '.url', '.bat', '.sh'],
    isRetro: false,
  },
  'ps1': {
    id: 'ps1',
    name: 'Sony PlayStation',
    manufacturer: 'Sony',
    category: 'console',
    extensions: ['.bin', '.cue', '.iso', '.chd', '.pbp'],
    isRetro: true,
  },
  'ps2': {
    id: 'ps2',
    name: 'Sony PlayStation 2',
    manufacturer: 'Sony',
    category: 'console',
    extensions: ['.iso', '.chd', '.elf'],
    isRetro: true,
  },
  'ps3': {
    id: 'ps3',
    name: 'Sony PlayStation 3',
    manufacturer: 'Sony',
    category: 'console',
    extensions: ['.iso', '.pkg', '.m3u'],
    isRetro: true,
  },
  'nes': {
    id: 'nes',
    name: 'Nintendo Entertainment System',
    manufacturer: 'Nintendo',
    category: 'console',
    extensions: ['.nes', '.fds'],
    isRetro: true,
  },
  'snes': {
    id: 'snes',
    name: 'Super Nintendo Entertainment System',
    manufacturer: 'Nintendo',
    category: 'console',
    extensions: ['.sfc', '.smc'],
    isRetro: true,
  },
  'n64': {
    id: 'n64',
    name: 'Nintendo 64',
    manufacturer: 'Nintendo',
    category: 'console',
    extensions: ['.z64', '.n64', '.v64'],
    isRetro: true,
  },
  'gba': {
    id: 'gba',
    name: 'Game Boy Advance',
    manufacturer: 'Nintendo',
    category: 'handheld',
    extensions: ['.gba'],
    isRetro: true,
  }
};
