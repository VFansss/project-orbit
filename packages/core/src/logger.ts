import type { LogLevel } from './models/config';

const levels: Record<LogLevel, number> = {
  'ERROR': 0,
  'INFO': 1,
  'DEBUG': 2
};

let currentLevel: LogLevel = 'ERROR';

/**
 * Agnostic logger that respects the configured LogLevel.
 */
export const Logger = {
  /**
   * Set the logging level at runtime.
   */
  setLogLevel(level: LogLevel) {
    currentLevel = level;
  },

  error(msg: string, newline = false) {
    const prefix = newline ? '\n' : '';
    console.error(`${prefix}\x1b[31m[ERROR]\x1b[0m ${msg}`);
  },

  warn(msg: string, newline = false) {
    const prefix = newline ? '\n' : '';
    console.warn(`${prefix}\x1b[33m[WARN]\x1b[0m ${msg}`);
  },

  info(msg: string, newline = false) {
    if (levels[currentLevel] >= levels['INFO']) {
      const prefix = newline ? '\n' : '';
      console.log(`${prefix}\x1b[34m[INFO]\x1b[0m ${msg}`);
    }
  },

  debug(msg: string, newline = false) {
    if (levels[currentLevel] >= levels['DEBUG']) {
      const prefix = newline ? '\n' : '';
      console.log(`${prefix}\x1b[2m[DEBUG] ${msg}\x1b[0m`);
    }
  },

  perf(msg: string, newline = false) {
    if (levels[currentLevel] >= levels['DEBUG']) {
      const prefix = newline ? '\n' : '';
      console.log(`${prefix}\x1b[31m[!] PERF HINT:\x1b[0m \x1b[33m${msg}\x1b[0m`);
    }
  }
};
