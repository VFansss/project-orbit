import { homedir, platform } from 'node:os'
import { join } from 'node:path'

/**
 * TODO: Resolve the base directory for Orbit data.
 * This logic separates where things live on different Operating Systems.
 */
const isWin = platform() === 'win32';
const baseDir = isWin 
  ? join(process.env.APPDATA || homedir(), 'orbit') 
  : join(homedir(), '.config', 'orbit');

export const PATHS = {
  configDir: baseDir,
  configFile: join(baseDir, 'config.json')
};
