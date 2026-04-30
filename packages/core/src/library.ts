import { CONFIDENCE_MAP, type ResolveOptions, type ResolveResult } from './models/library';
import type { SearchType } from './models/search';
import { Logger } from './logger';
import { performSearch } from './search';
import { PathService } from './paths';
import { LocalResolverService } from './local-resolver';
import type { OrbitConfig } from './models/config';

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

  async resolve(queryString: string, options: ResolveOptions = {}): Promise<ResolveResult[]> {
    const query = this.parseQuery(queryString);
    const scope = options.scope || 'both';
    
    // 1. Try Cache
    const cacheResults = await this.resolveCache(query);
    if (cacheResults.length > 0) return cacheResults;

    let localResults: ResolveResult[] = [];
    if (scope === 'offline' || scope === 'both') {
      localResults = await this.localResolver.resolve(query, options);
    }

    // Offline-first: if exact local matches found and scope is not strictly remote, return them
    if (localResults.some(r => r.confidence === 0) && scope !== 'remote') {
      return localResults.filter(r => r.confidence === 0);
    }

    // 2. Remote resolution
    let remoteResults: ResolveResult[] = [];
    if (scope === 'remote' || scope === 'both') {
      const searchRes = await performSearch({
        type: query.type === 'serial' || query.type === 'path' || query.type === 'urn' ? 'name' : query.type,
        query: query.value,
        offline: false
      }, this.config);

      remoteResults = searchRes.map(r => {
        const confidence: ConfidenceLevel = 2;

        // Use r.platform if present, otherwise use the first platform from options as a hint
        const hintedPlatform = r.platform || (options.platforms && options.platforms.length === 1 ? options.platforms[0] : undefined);

        // Calculate potential paths for remote results if platform is known or hinted
        let potentialLocal = undefined;
        if (hintedPlatform) {
          const gamePaths = this.paths.getGamePaths(hintedPlatform, r.name);
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
          ids: r.ids,
          platform: hintedPlatform,
          source: r.source,
          local: potentialLocal,
          metadata: r.metadata || r // Preserve full raw metadata
        };
      });
    }

    // Combine and return
    const allResults = [...localResults, ...remoteResults];
    
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
