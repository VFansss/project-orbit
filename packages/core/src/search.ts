import { searchGames } from './integrations/igdb';
import type { SearchResult, SearchType } from './models/search';
import type { OrbitConfig } from './models/config';
import { Logger } from './logger';
import { mapIGDBToGame } from './mappers/igdb';
import type { IDataGateway } from './gateway/types';

export interface SearchOptions {
  type: SearchType;
  query: any;
  offline?: boolean;
}

/**
 * TODO: Unified search orchestrator using the global Logger.
 */
export async function performSearch(gateway: IDataGateway, options: SearchOptions, config: OrbitConfig): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  Logger.info(`Starting ${options.type} search for: "${typeof options.query === 'object' ? JSON.stringify(options.query) : options.query}"`);
  
  if (!options.offline) {
    if (options.type === 'hash') {
      try {
        const body = typeof options.query === 'object' ? options.query : { md5: options.query };
        const data = await gateway.request<any>({
          uri: 'hasheous://api/v1/Lookup/ByHash',
          method: 'POST',
          body
        });
        
        if (data && data.name) {
          const ids: Record<string, string> = {};
          if (data.metadata && Array.isArray(data.metadata)) {
            for (const item of data.metadata) {
              if (item.objectType === 'Game') {
                if (item.source === 'IGDB') ids.igdb = String(item.id);
                if (item.source === 'Steam') ids.steam = String(item.id);
                if (item.source === 'RetroAchievements') ids.retroachievements = String(item.id);
              }
            }
          }
          results.push({
            source: 'hasheous',
            id: String(data.id),
            name: data.name,
            ids,
            metadata: data
          });
        }
      } catch (e) {
        Logger.error(`Hasheous search failed.`);
      }
    } else {
      try {
        const igdbGames = await searchGames(
          gateway,
          options.query, 
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
          const queryLower = String(options.query).toLowerCase();
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
