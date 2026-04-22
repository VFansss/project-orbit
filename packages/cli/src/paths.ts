import { homedir, platform } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * TODO: Resolve the base directory for Orbit data.
 */
const isWin = platform() === 'win32';
const baseDir = isWin 
  ? join(process.env.APPDATA || homedir(), 'orbit') 
  : join(homedir(), '.config', 'orbit');

export const PATHS = {
  configDir: baseDir,
  configFile: join(baseDir, 'config.json')
};

/**
 * TODO: Expands ~/ to the user's home directory and resolves the path.
 */
export function resolvePath(input: string): string {
  let p = input;
  if (p.startsWith('~/')) {
    p = join(homedir(), p.slice(2));
  }
  return resolve(p);
}

/**
 * TODO: Provides a sensible default path for a new library based on the OS.
 */
export function getSuggestedLibraryPath(): string {
  if (platform() === 'win32') {
    return join(homedir(), 'Documents', 'orbit-library');
  }
  return join(homedir(), 'orbit-library');
}
