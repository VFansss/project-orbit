import type { LogLevel } from './models/config';

const levels: Record<LogLevel, number> = {
  'ERROR': 0,
  'INFO': 1,
  'DEBUG': 2
};

let currentLevel: LogLevel = 'ERROR';

/**
 * TODO: Agnostic logger that respects the configured LogLevel.
 */
export const Logger = {
  /**
   * Set the logging level at runtime.
   */
  setLogLevel(level: LogLevel) {
    currentLevel = level;
  },

  error(msg: string) {
    // Error is always shown unless we specifically implement a 'NONE' level.
    console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
  },

  info(msg: string) {
    if (levels[currentLevel] >= levels['INFO']) {
      console.log(`\x1b[34m[INFO]\x1b[0m ${msg}`);
    }
  },

  debug(msg: string) {
    if (levels[currentLevel] >= levels['DEBUG']) {
      console.log(`\x1b[2m[DEBUG] ${msg}\x1b[0m`);
    }
  }
};
