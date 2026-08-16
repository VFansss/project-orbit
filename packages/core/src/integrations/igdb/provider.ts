import type { MetadataProvider, EnrichmentCapability } from '../../models/provider';
import type { Game } from '../../models/game';
import type { OrbitQuery } from '../../library';
import type { IDataGateway } from '../../gateway/types';
import { searchGames } from './api';
import { mapIGDBToGame } from '../../mappers/igdb';

export class IGDBProvider implements MetadataProvider {
  name = 'IGDB';
  capabilities: EnrichmentCapability[] = ['metadata'];

  constructor(private gateway: IDataGateway) {}

  canHandle(game: Partial<Game>, query?: OrbitQuery): boolean {
    // IGDB can handle search by name or enrichment if we already have an IGDB ID
    return !!(game.ids?.igdb || query?.type === 'name' || query?.type === 'igdb' || query?.type === 'steam');
  }

  async enrich(game: Partial<Game>, query?: OrbitQuery): Promise<Partial<Game>> {
    const idToFetch = game.ids?.igdb || (query?.type === 'igdb' ? query.value : undefined);
    
    try {
      let igdbResults = [];
      
      if (idToFetch) {
        // Direct ID lookup (Full detail)
        igdbResults = await searchGames(this.gateway, idToFetch, 'igdb', 'full');
      } else if (query?.type === 'name') {
        // Search by name (Basic detail for list, or Full if specifically requested in future)
        igdbResults = await searchGames(this.gateway, query.value, 'name', 'basic');
      } else if (query?.type === 'steam') {
        // Search by steam ID
        igdbResults = await searchGames(this.gateway, query.value, 'steam', 'full');
      }

      if (igdbResults.length === 0) return game;

      // For now, we take the first result to enrich the context
      const rawPayload = igdbResults[0];
      const enrichedGame = mapIGDBToGame(rawPayload);
      
      return {
        ...game,
        name: enrichedGame.name || game.name,
        ids: { ...game.ids, ...enrichedGame.ids },
        metadata: { ...game.metadata, ...enrichedGame.metadata },
        _rawSources: { ...(game._rawSources || {}), igdb: rawPayload }
      };

    } catch (e) {
      return game;
    }
  }
}
