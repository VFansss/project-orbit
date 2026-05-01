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
   * Calculates paths for a game result.
   */
  getGamePaths(platform: string, folderName: string) {
    const relativePath = join('Games', platform, folderName);
    const absolutePath = join(this.getLibraryPath(), relativePath);
    
    return {
      relative: relativePath,
      absolute: absolutePath
    };
  }

  /**
   * Returns the staging area path.
   */
  getStagingPath(subPath?: string): string {
    const staging = join(this.getLibraryPath(), '_Staging');
    return subPath ? join(staging, subPath) : staging;
  }

  /**
   * Helper to make a path relative to the library root for display.
   */
  toLibraryRelative(fullPath: string): string {
    const root = this.getLibraryPath();
    if (!fullPath.startsWith(root)) return fullPath;
    return relative(root, fullPath);
  }

  /**
   * Returns the central metadata path for a game.
   */
  getMetadataPath(platform: string, folderName: string) {
    const relativePath = join('Metadata', platform, folderName);
    const absolutePath = join(this.getLibraryPath(), relativePath);
    
    return {
      relative: relativePath,
      absolute: absolutePath,
      file: join(absolutePath, 'metadata.toml')
    };
  }
}
