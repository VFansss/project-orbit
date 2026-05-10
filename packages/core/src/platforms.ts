import { SUPPORTED_PLATFORMS, type GamePlatformDefinition, type PlatformCategory } from './models/platform';

/**
 * Repository for supported game platforms.
 * Provides methods to query and filter platform metadata.
 */
export class PlatformRegistry {
  private static platforms = SUPPORTED_PLATFORMS;

  /**
   * Returns all registered platform definitions.
   */
  static getAll(): GamePlatformDefinition[] {
    return Object.values(this.platforms);
  }

  /**
   * Finds a platform by its internal slug (id).
   */
  static getById(id: string): GamePlatformDefinition | undefined {
    return this.platforms[id.toLowerCase()];
  }

  /**
   * Returns platforms filtered by category.
   */
  static getByCategory(category: PlatformCategory): GamePlatformDefinition[] {
    return this.getAll().filter(p => p.category === category);
  }

  /**
   * Returns only retro platforms.
   */
  static getRetro(): GamePlatformDefinition[] {
    return this.getAll().filter(p => p.isRetro);
  }

  /**
   * Returns a flat list of all supported extensions across all platforms.
   */
  static getAllExtensions(): string[] {
    const extSet = new Set<string>();
    this.getAll().forEach(p => p.extensions.forEach(e => extSet.add(e.toLowerCase())));
    return Array.from(extSet).sort();
  }

  /**
   * Finds the platform(s) that support a specific file extension.
   */
  static getByExtension(ext: string): GamePlatformDefinition[] {
    const targetExt = ext.toLowerCase().startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
    return this.getAll().filter(p => p.extensions.includes(targetExt));
  }

  /**
   * Validates if a platform ID is supported.
   */
  static isSupported(id: string): boolean {
    return !!this.getById(id);
  }
}
