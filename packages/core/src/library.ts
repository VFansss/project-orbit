import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import { 
  type ConfidenceLevel, 
  type ResolveOptions, 
  type ResolveResult,
  CONFIDENCE_MAP 
} from './models/library';
import type { SearchType } from './models/search';
import { Logger } from './logger';
import { performSearch } from './search';
import { PathService } from './paths';
import type { OrbitConfig } from './models/config';

export interface OrbitQuery {
  type: SearchType;
  value: string;
  platform?: string;
  isUrn: boolean;
}

export class LibraryService {
  private paths: PathService;

  constructor(private config: OrbitConfig) {
    this.paths = new PathService(config);
  }

  /**
   * Parses a string into an OrbitQuery.
   */
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

  private async resolveCache(query: OrbitQuery): Promise<ResolveResult[]> {
    Logger.debug('Cache resolution not implemented yet.');
    return [];
  }

  private async resolveLocal(query: OrbitQuery, options: ResolveOptions): Promise<ResolveResult[]> {
    const gamesPath = this.paths.getLibraryPath('Games');
    const results: ResolveResult[] = [];

    try {
      const platforms = options.platforms || await readdir(gamesPath);
      
      for (const platform of platforms) {
        const platformPath = join(gamesPath, platform);
        let gameFolders: string[] = [];
        try {
          gameFolders = await readdir(platformPath);
        } catch {
          continue;
        }

        for (const folder of gameFolders) {
          const gamePaths = this.paths.getGamePaths(platform, folder);
          let confidence: ConfidenceLevel = -1;
          const ids: Record<string, string> = {};

          if (query.type === 'name') {
            if (folder.toLowerCase() === query.value.toLowerCase()) {
              confidence = 1;
            } else if (folder.toLowerCase().includes(query.value.toLowerCase())) {
              confidence = 2;
            }
          }

          if (query.type === 'serial') {
            const serialMatch = folder.match(/\[(.*?)\]/);
            if (serialMatch && serialMatch[1].toLowerCase() === query.value.toLowerCase()) {
              confidence = query.platform === platform ? 0 : 1;
              ids.serial = serialMatch[1];
            }
          }

          if (query.type === 'path' && (gamePaths.absolute === query.value || folder === query.value)) {
            confidence = 0;
          }

          if (confidence !== -1 || ['steam', 'igdb', 'serial'].includes(query.type)) {
            const metadataPath = join(gamePaths.absolute, 'metadata', 'metadata.toml');
            const orbitMetadataPath = join(gamePaths.absolute, 'orbit.metadata.toml');
            
            try {
              const tomlContent = await readFile(metadataPath, 'utf-8').catch(() => readFile(orbitMetadataPath, 'utf-8'));
              const metadata = parseToml(tomlContent) as any;
              
              if (metadata.source) {
                if (metadata.source.steam) ids.steam = String(metadata.source.steam);
                if (metadata.source.igdb) ids.igdb = String(metadata.source.igdb);
              }

              if (query.type === 'steam' && ids.steam === query.value) confidence = 0;
              if (query.type === 'igdb' && ids.igdb === query.value) confidence = 0;
              
              if (confidence !== -1) {
                results.push({
                  confidence,
                  confidenceDescription: CONFIDENCE_MAP[confidence],
                  path: gamePaths.absolute,
                  relativePath: gamePaths.relative,
                  platform,
                  name: folder,
                  ids,
                  metadata
                });
              }
            } catch {
              if (confidence !== -1) {
                results.push({ 
                  confidence, 
                  confidenceDescription: CONFIDENCE_MAP[confidence],
                  path: gamePaths.absolute, 
                  relativePath: gamePaths.relative,
                  platform, 
                  name: folder, 
                  ids 
                });
              }
            }
          }
        }
      }
    } catch (e) {
      Logger.error(`Local resolution failed: ${e}`);
    }

    return results;
  }

  async resolve(queryString: string, options: ResolveOptions = {}): Promise<ResolveResult[]> {
    const query = this.parseQuery(queryString);
    Logger.info(`Resolving ${query.type}: "${query.value}" (URN: ${query.isUrn})`);

    const cacheResults = await this.resolveCache(query);
    if (cacheResults.length > 0) return cacheResults;

    let localResults: ResolveResult[] = [];
    if (!options.remote) {
      localResults = await this.resolveLocal(query, options);
    }

    if (localResults.some(r => r.confidence === 0)) {
      return localResults.filter(r => r.confidence === 0);
    }

    if (!options.offline && (options.remote || localResults.length === 0)) {
      const remoteResults = await performSearch({
        type: query.type === 'serial' || query.type === 'path' || query.type === 'urn' ? 'name' : query.type,
        query: query.value,
        offline: false
      }, this.config);

      const mappedRemote = remoteResults.map(r => {
        const confidence: ConfidenceLevel = 2;
        return {
          confidence,
          confidenceDescription: CONFIDENCE_MAP[confidence],
          name: r.name,
          ids: r.ids,
          platform: r.platform
        };
      });

      return [...localResults, ...mappedRemote];
    }

    return localResults;
  }
}
