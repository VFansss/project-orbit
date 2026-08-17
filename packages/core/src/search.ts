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

          // If we found an IGDB ID, let's chain the request to get rich metadata immediately
          if (ids.igdb) {
            try {
              const igdbGames = await searchGames(gateway, ids.igdb, 'igdb', 'basic');
              if (igdbGames && igdbGames.length > 0) {
                const game = mapIGDBToGame(igdbGames[0]);
                // Merge IDs from Hasheous that IGDB might not have (like RA)
                const mergedIds = { ...ids, ...game.ids };
                
                results.push({
                  source: 'hasheous',
                  id: String(data.id),
                  name: game.name,
                  year: game.metadata.general.release_year,
                  platform: game.platform === 'unknown' ? undefined : game.platform,
                  ids: mergedIds,
                  metadata: igdbGames[0] // Raw IGDB metadata for the UI
                });
                return results; // Return early, we got the rich data
              }
            } catch (err) {
               Logger.debug(`Failed to chain IGDB search after Hasheous match: ${err}`);
            }
          }

          // Fallback to basic Hasheous metadata if no IGDB link or IGDB request failed
          results.push({
            source: 'hasheous',
            id: String(data.id),
            name: data.name,
            ids,
            metadata: {
              general: {
                name: data.name,
                aliases: [],
                summary: '',
                release_year: undefined,
                genres: [],
                developers: [],
                publishers: data.publisher?.name ? [data.publisher.name] : [],
              },
              ids,
              sources: [
                { name: 'Hasheous', url: 'https://hasheous.org/' }
              ]
            }
          });
        }
      } catch (e: any) {
        if (e.message?.toLowerCase().includes('not found')) {
          Logger.debug(`Hasheous: Hash not found in database.`);
        } else {
          Logger.error(`Hasheous search failed: ${e.message}`, true);
        }
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
      } catch (e: any) {
        Logger.error(`Remote search failed: ${e.message}`);
      }

    }
  }

  return results;
}
