export type OS = 'windows' | 'linux' | 'macos' | 'android' | 'ios' | 'unknown';

export interface PlatformStatus {
  os: OS;
  arch: string;
  isMobile: boolean;
}

/**
 * Registry of supported game platforms in Orbit.
 * The key is the internal Orbit slug used for folders (e.g., 'pc', 'ps1').
 */
export interface GamePlatformDefinition {
  id: string;          // Orbit slug (e.g. 'pc')
  name: string;        // Human readable name (e.g. 'Personal Computer')
}

export const SUPPORTED_PLATFORMS: Record<string, GamePlatformDefinition> = {
  'pc': {
    id: 'pc',
    name: 'Personal Computer',
  },
  'ps1': {
    id: 'ps1',
    name: 'Sony PlayStation',
  },
  'nes': {
    id: 'nes',
    name: 'Nintendo Entertainment System',
  }
};
