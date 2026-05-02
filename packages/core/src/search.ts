import { searchGames } from './integrations/igdb';
import type { SearchResult, SearchType } from './models/search';
import type { OrbitConfig } from './models/config';
import { Logger } from './logger';
import { mapIGDBToGame } from './mappers/igdb';

export interface SearchOptions {
  type: SearchType;
  query: string;
  offline?: boolean;
}

/**
 * TODO: Unified search orchestrator using the global Logger.
 */
export async function performSearch(options: SearchOptions, config: OrbitConfig): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  Logger.info(`Starting ${options.type} search for: "${options.query}"`);
  
  if (!options.offline) {
    const { igdbClientId, igdbClientSecret } = config.secrets;
    
    if (igdbClientId && igdbClientSecret) {
      try {
        const igdbGames = await searchGames(
          options.query, 
          igdbClientId, 
          igdbClientSecret, 
          options.type
        );
        
        const mapped = igdbGames.map(g => {
          const game = mapIGDBToGame(g);
          
          return {
            source: 'igdb' as const,
            id: String(g.id),
            name: game.name,
            year: game.metadata.general.release_year,
            platform: game.platform === 'unknown' ? undefined : game.platform,
            ids: game.ids,
            metadata: g // We still keep the raw IGDB metadata for the UI if needed
          };
        });
        
        results.push(...mapped);

        // Sort results: 1. Exact matches first, 2. Shortest name first
        results.sort((a, b) => {
          const queryLower = options.query.toLowerCase();
          const aExact = a.name.toLowerCase() === queryLower;
          const bExact = b.name.toLowerCase() === queryLower;

          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;

          return a.name.length - b.name.length;
        });
      } catch (e) {
        Logger.error(`Remote search failed. Try --offline mode.`);
      }
    }
  }

  return results;
}
