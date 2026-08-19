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
  aliases?: string[];      // Alternative platform names/slugs (e.g. ['psx', 'playstation', 'psone'])
  isRetro?: boolean;       // Flag for UI or logic distinction
  scaffoldMode?: 'forced' | 'choose' | 'disabled'; // Ingestion wizard behavior
  setHashAlgo?: 'crc32' | 'sha1' | 'sha256' | 'md5'; // Master indexing hash for [SET-xxx] romsets
  productCodeExample?: string; // Official hardware serial / product code example (e.g. 'AGB-ABCD-USA', 'SLUS-12345')
}

export const SUPPORTED_PLATFORMS: Record<string, GamePlatformDefinition> = {
  'pc': {
    id: 'pc',
    name: 'PC (Windows/Linux)',
    manufacturer: 'Generic',
    category: 'computer',
    extensions: ['.exe', '.lnk', '.url', '.bat', '.sh', '.iso', '.zip', '.7z', '.rar'],
    aliases: ['windows', 'win32', 'dos', 'pc-windows'],
    isRetro: false,
    scaffoldMode: 'forced',
    setHashAlgo: 'sha256',
  },
  'ps1': {
    id: 'ps1',
    name: 'Sony PlayStation',
    manufacturer: 'Sony',
    category: 'console',
    extensions: ['.bin', '.cue', '.iso', '.chd', '.pbp'],
    aliases: ['psx', 'playstation', 'psone', 'ps-one', 'sony-playstation'],
    isRetro: true,
    scaffoldMode: 'choose',
    setHashAlgo: 'sha1',
    productCodeExample: 'SLUS-00594',
  },
  'nes': {
    id: 'nes',
    name: 'Nintendo Entertainment System',
    manufacturer: 'Nintendo',
    category: 'console',
    extensions: ['.nes', '.fds', '.zip', '.7z'],
    aliases: ['famicom', 'nintendo-entertainment-system'],
    isRetro: true,
    scaffoldMode: 'choose',
    setHashAlgo: 'crc32',
    productCodeExample: 'NES-SM-USA',
  },
  'gba': {
    id: 'gba',
    name: 'Game Boy Advance',
    manufacturer: 'Nintendo',
    category: 'handheld',
    extensions: ['.gba', '.zip', '.7z'],
    aliases: ['gameboy-advance', 'game-boy-advance'],
    isRetro: true,
    scaffoldMode: 'choose',
    setHashAlgo: 'crc32',
    productCodeExample: 'AGB-BPEE-USA',
  }
};

