import { CONFIDENCE_MAP, type ResolveOptions, type ResolveResult, type ConfidenceLevel } from './models/library';
import type { SearchType } from './models/search';
import { Logger } from './logger';
import { performSearch } from './search';
import { PathService } from './paths';
import { LocalResolverService } from './local-resolver';
import type { OrbitConfig } from './models/config';
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stringify, parse as parseToml } from 'smol-toml';
import { mapGameToMetadata } from './mappers/metadata';
import type { Game } from './models/game';

export interface OrbitQuery {
  type: SearchType;
  value: string;
  platform?: string;
  isUrn: boolean;
}

export class LibraryService {
  private paths: PathService;
  private localResolver: LocalResolverService;

  constructor(private config: OrbitConfig) {
    this.paths = new PathService(config);
    this.localResolver = new LocalResolverService(config);
  }

  /**
   * Reads the aliases cache from the library root.
   */
  async getAliases(): Promise<Record<string, string>> {
    try {
      const aliasPath = join(this.paths.getLibraryPath(), 'orbit.aliases.toml');
      const content = await readFile(aliasPath, 'utf8');
      return parseToml(content) as Record<string, string>;
    } catch {
      return {};
    }
  }

  /**
   * Saves a string alias mapped to an ID.
   */
  async saveAlias(aliasName: string, targetId: string): Promise<void> {
    const aliases = await this.getAliases();
    aliases[aliasName] = targetId;
    const aliasPath = join(this.paths.getLibraryPath(), 'orbit.aliases.toml');
    await writeFile(aliasPath, stringify(aliases));
  }

  /**
   * Reads the ignore list from the library root.
   */
  async getIgnores(): Promise<string[]> {
    try {
      const ignorePath = join(this.paths.getLibraryPath(), 'orbit.ignores.toml');
      const content = await readFile(ignorePath, 'utf8');
      const data = parseToml(content) as { ignores?: string[] };
      return data.ignores || [];
    } catch {
      return [];
    }
  }

  /**
   * Adds a group name to the permanent ignore list.
   */
  async saveIgnore(groupName: string): Promise<void> {
    const ignores = await this.getIgnores();
    if (!ignores.includes(groupName)) {
      ignores.push(groupName);
      const ignorePath = join(this.paths.getLibraryPath(), 'orbit.ignores.toml');
      await writeFile(ignorePath, stringify({ ignores }));
    }
  }

  /**
   * Persists a Game object's metadata to the central Metadata folder.
   */
  async saveMetadata(game: Game): Promise<string> {
    if (game.platform === 'unknown') {
      throw new Error(`Cannot save metadata for unknown platform: ${game.name}`);
    }

    const metaPath = this.paths.getMetadataPath(game.platform, game.name, game.metadata.general.release_year);
    const tomlData = mapGameToMetadata(game);
    const content = stringify(tomlData);

    await mkdir(metaPath.absolute, { recursive: true });
    await writeFile(metaPath.file, content);

    Logger.info(`Metadata saved for ${game.name} [${game.platform}] at ${metaPath.relative}`);
    return metaPath.file;
  }


  parseQuery(query: string): OrbitQuery {
    if (query.startsWith('urn:orbit:')) {
      const parts = query.split(':');
      if (parts.length === 4) {
        return { type: parts[2] as SearchType, value: parts[3], isUrn: true };
      }
      if (parts.length === 5) {
        return { type: parts[2] as SearchType, platform: parts[3], value: parts[4], isUrn: true };
      }
    }

    const shorthandMatch = query.match(/^([a-z_]+):(.+)$/);
    if (shorthandMatch) {
      const [, type, value] = shorthandMatch;
      return { type: type as SearchType, value, isUrn: false };
    }

    return { type: 'name', value: query, isUrn: false };
  }

  /**
   * Returns a list of all platforms currently present in the library (Games and Metadata).
   */
  async getPlatforms(): Promise<string[]> {
    const pSet = new Set<string>();
    const libraryRoot = this.paths.getLibraryPath();

    const gamesPlats = await readdir(join(libraryRoot, 'Games')).catch(() => []);
    gamesPlats.forEach(p => pSet.add(p));

    const metaPlats = await readdir(join(libraryRoot, 'Metadata')).catch(() => []);
    metaPlats.forEach(p => pSet.add(p));

    return Array.from(pSet).sort();
  }

  private async resolveCache(query: OrbitQuery): Promise<ResolveResult[]> {
    Logger.debug('Cache resolution not implemented yet.');
    return [];
  }

  async resolve(queryString: string, options: ResolveOptions = {}): Promise<ResolveResult[]> {
    // Check aliases first (only for plain name searches)
    if (!queryString.includes(':')) {
      const aliases = await this.getAliases();
      if (aliases[queryString]) {
        Logger.info(`Alias cache hit: "${queryString}" -> "${aliases[queryString]}"`);
        const targetResults = await this.resolve(aliases[queryString], options);
        if (targetResults.length > 0) {
          const res = targetResults[0];
          res.confidence = 1;
          res.confidenceDescription = 'Cache Hit';
          return [res];
        }
      }
    }

    const query = this.parseQuery(queryString);
    const scope = options.scope || 'both';
    
    // 1. Try Cache
    const cacheResults = await this.resolveCache(query);
    if (cacheResults.length > 0) return cacheResults;

    let localResults: ResolveResult[] = [];
    if (scope === 'local' || scope === 'both') {
      localResults = await this.localResolver.resolve(query, options);
    }

    // Offline-first: if exact local matches found and scope is not strictly online, return them
    if (localResults.some(r => r.confidence === 0) && scope !== 'online') {
      return localResults.filter(r => r.confidence === 0);
    }

    // 2. Online resolution
    let onlineResults: ResolveResult[] = [];
    if (scope === 'online' || scope === 'both') {
      const searchRes = await performSearch({
        type: query.type === 'serial' || query.type === 'path' || query.type === 'urn' ? 'name' : query.type,
        query: query.value,
        offline: false
      }, this.config);

      onlineResults = searchRes.map(r => {
        const confidence: ConfidenceLevel = 2;

        // Use r.platform if present, otherwise use the first platform from options as a hint
        const hintedPlatform = r.platform || (options.platforms && options.platforms.length === 1 ? options.platforms[0] : undefined);

        // Calculate potential paths for online results if platform is known or hinted
        let potentialLocal = undefined;
        if (hintedPlatform) {
          const gamePaths = this.paths.getGamePaths(hintedPlatform, r.name, r.year);
          potentialLocal = {
            path: gamePaths.absolute,
            relativePath: gamePaths.relative,
            exists: false,
            hasMetadata: false,
            hasScreenshots: false,
            hasSavedata: false,
          };
        }

        return {
          confidence,
          confidenceDescription: CONFIDENCE_MAP[2],
          name: r.name,
          year: r.year,
          ids: r.ids,
          platform: hintedPlatform,
          source: r.source,
          local: potentialLocal,
          metadata: r.metadata || r // Preserve full raw metadata
        };
      });
    }

    // Combine and return
    const allResults = [...localResults, ...onlineResults];
    
    // Simple deduplication by IDs if possible
    const seen = new Set<string>();
    return allResults.filter(r => {
      // Create a unique key based on IDs or name+platform
      const idKey = r.ids.igdb ? `igdb:${r.ids.igdb}` : 
                   (r.ids.steam ? `steam:${r.ids.steam}` : 
                   (r.ids.serial ? `serial:${r.ids.serial}` : `name:${r.name}:${r.platform}`));
      
      if (seen.has(idKey)) return false;
      seen.add(idKey);
      return true;
    });
  }
}
