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
   * Finds a platform by its internal slug (id) or any registered alias (e.g., 'psx' -> 'ps1').
   */
  static getById(input: string): GamePlatformDefinition | undefined {
    if (!input) return undefined;
    const normalized = input.trim().toLowerCase();

    // 1. Direct match by ID
    if (this.platforms[normalized]) {
      return this.platforms[normalized];
    }

    // 2. Alias match
    for (const plat of Object.values(this.platforms)) {
      if (plat.aliases && plat.aliases.some(a => a.toLowerCase() === normalized)) {
        return plat;
      }
    }

    return undefined;
  }

  /**
   * Resolves any input alias or slug to the canonical Orbit platform ID (slug).
   * E.g. 'psx' -> 'ps1', 'famicom' -> 'nes'.
   */
  static resolveSlug(input: string): string | undefined {
    const plat = this.getById(input);
    return plat?.id;
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
   * Validates if a platform ID or alias is supported.
   */
  static isSupported(id: string): boolean {
    return !!this.getById(id);
  }
}
