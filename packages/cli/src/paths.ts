import { homedir, platform } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * Resolve the base directory for Orbit data.
 */
const isWin = platform() === 'win32';
const baseDir = isWin 
  ? join(process.env.APPDATA || homedir(), 'orbit') 
  : join(homedir(), '.config', 'orbit');

export const PATHS = {
  configDir: baseDir,
  configFile: join(baseDir, 'config.toml')
};

/**
 * Expands ~/ to the user's home directory and resolves the path.
 */
export function resolvePath(input: string): string {
  let p = input;
  if (p.startsWith('~/')) {
    p = join(homedir(), p.slice(2));
  }
  return resolve(p);
}

export type SuggestedPathType = 'library' | 'import-source' | 'desktop' | 'downloads';

/**
 * Provides a sensible suggested path based on context type and OS.
 */
export function getSuggestedPath(type: SuggestedPathType = 'library'): string {
  const home = homedir();
  const isWin = platform() === 'win32';

  switch (type) {
    case 'library':
      return isWin ? join(home, 'Documents', 'orbit-library') : join(home, 'orbit-library');
    case 'import-source':
    case 'desktop':
      return join(home, 'Desktop');
    case 'downloads':
      return join(home, 'Downloads');
    default:
      return home;
  }
}

/**
 * Backward-compatible helper for library path creation suggestion.
 */
export function getSuggestedLibraryPath(): string {
  return getSuggestedPath('library');
}
