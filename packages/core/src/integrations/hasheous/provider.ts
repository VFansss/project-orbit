import type { MetadataProvider, EnrichmentCapability } from '../../models/provider';
import type { Game } from '../../models/game';
import type { OrbitQuery } from '../../library';
import type { IDataGateway } from '../../gateway/types';
import type { HasheousHashLookupResponse, HasheousStatusResponse } from './models';

export class HasheousProvider implements MetadataProvider {
  name = 'Hasheous';
  capabilities: EnrichmentCapability[] = ['identity'];

  constructor(private gateway: IDataGateway) {}

  /**
   * Checks the health of the Hasheous API.
   */
  async checkStatus(): Promise<HasheousStatusResponse> {
    return await this.gateway.request<HasheousStatusResponse>('hasheous://api/v1/Status');
  }

  canHandle(game: Partial<Game>, query?: OrbitQuery): boolean {
    // Hasheous is great for Hashing and Serials.
    // Supports query values that are objects { md5, sha1, crc, sha256 }
    return !!(query?.type === 'hash' || query?.type === 'serial');
  }

  async enrich(game: Partial<Game>, query?: OrbitQuery): Promise<Partial<Game>> {
    if (!query) return game;

    try {
      let data: HasheousHashLookupResponse | null = null;

      if (query.type === 'hash') {
        if (typeof query.value === 'object') {
          // Multi-hash lookup (POST)
          data = await this.gateway.request<HasheousHashLookupResponse>({
            uri: 'hasheous://api/v1/Lookup/ByHash',
            method: 'POST',
            body: query.value
          });
        } else {
          // Legacy single MD5 lookup (GET) - fallback
          data = await this.gateway.request<HasheousHashLookupResponse>(`hasheous://api/v1/Lookup/ByHash/md5/${query.value}`);
        }
      } else if (query.type === 'serial') {
        // Future: Serial lookup implementation
        return game;
      }

      if (!data) return game;

      const enrichedIds = { ...game.ids };
      
      // Map metadata IDs from Hasheous to Orbit
      if (data.metadata && Array.isArray(data.metadata)) {
        for (const item of data.metadata) {
          if (item.objectType === 'Game') {
            if (item.source === 'IGDB') enrichedIds.igdb = String(item.id);
            if (item.source === 'Steam') enrichedIds.steam = String(item.id);
            if (item.source === 'RetroAchievements') enrichedIds.retroachievements = String(item.id);
            if (item.source === 'SteamGridDb') enrichedIds.steamgriddb = String(item.id);
          }
        }
      }

      return {
        ...game,
        name: data.name || game.name,
        ids: enrichedIds
      };
    } catch (e) {
      // If Hasheous fails, we just return what we have
      return game;
    }
  }
}
