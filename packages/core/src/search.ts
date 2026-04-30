import { searchGames } from './integrations/igdb';
import type { SearchResult, SearchType } from './models/search';
import type { OrbitConfig } from './models/config';
import { Logger } from './logger';

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
          const resIds: Record<string, string> = { igdb: String(g.id) };
          
          // Find Steam ID in external_games if available (source 1)
          const steamEntry = g.external_games?.find(ext => ext.external_game_source === 1);
          if (steamEntry) resIds.steam = steamEntry.uid;

          return {
            source: 'igdb' as const,
            id: String(g.id),
            name: g.name,
            year: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : undefined,
            ids: resIds,
            metadata: g
          };
        });
        
        results.push(...mapped);
      } catch (e) {
        Logger.error(`Remote search failed. Try --offline mode.`);
      }
    }
  }

  return results;
}
