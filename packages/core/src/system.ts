export class SystemUtils {
  /**
   * Opens a folder or file in the native operating system file explorer (Explorer on Windows, Finder on macOS, xdg-open on Linux) using Bun's native process spawner.
   */
  static openInExplorer(targetPath: string): void {
    const platform = process.platform;
    let command = 'explorer.exe';

    if (platform === 'darwin') {
      command = 'open';
    } else if (platform === 'linux') {
      command = 'xdg-open';
    }

    try {
      if (typeof Bun !== 'undefined' && Bun.spawn) {
        Bun.spawn([command, targetPath], {
          stdout: 'ignore',
          stderr: 'ignore'
        });
      } else {
        // Node.js fallback if not running inside Bun runtime
        const { spawn } = require('node:child_process');
        const child = spawn(command, [targetPath], { detached: true, stdio: 'ignore' });
        child.unref();
      }
    } catch (err: any) {
      throw new Error(`Failed to open path "${targetPath}" in system explorer: ${err.message}`);
    }
  }
}

