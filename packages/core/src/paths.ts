import { join, relative } from 'node:path';
import type { OrbitConfig } from './models/config';

export class PathService {
  constructor(private config: OrbitConfig) {}

  /**
   * Returns the absolute path to a library component (Games, UserData, etc.)
   */
  getLibraryPath(component?: string): string {
    const root = this.config.currentLibraryPath || '';
    return component ? join(root, component) : root;
  }

  /**
   * Sanitizes a string and formats it as a valid folder name: "Name (Year)".
   */
  static getSafeFolderName(name: string, year?: string | number): string {
    // Windows illegal: \ / : * ? " < > |
    const cleanName = name
      .replace(/[\\/:*?"<>|]/g, '')
      .trim()
      .replace(/\.+$/, '');
    
    return year ? `${cleanName} (${year})` : cleanName;
  }

  /**
   * Calculates paths for a game result.
   */
  getGamePaths(platform: string, folderName: string, year?: string | number) {
    const safeName = PathService.getSafeFolderName(folderName, year);
    const relativePath = join('Games', platform, safeName);
    const absolutePath = join(this.getLibraryPath(), relativePath);
    
    return {
      relative: relativePath,
      absolute: absolutePath
    };
  }

  /**
   * Returns the central metadata path for a game.
   */
  getMetadataPath(platform: string, folderName: string, year?: string | number) {
    const safeName = PathService.getSafeFolderName(folderName, year);
    const relativePath = join('Metadata', platform, safeName);
    const absolutePath = join(this.getLibraryPath(), relativePath);
    
    return {
      relative: relativePath,
      absolute: absolutePath,
      file: join(absolutePath, 'metadata.toml')
    };
  }
}
