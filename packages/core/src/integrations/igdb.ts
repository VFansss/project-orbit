import type { SearchType } from '../models/search';
import { Logger } from '../logger';
import type { IDataGateway } from '../gateway/types';

export type IGDBDetailLevel = 'basic' | 'full';

export interface IGDBGame {
  id: number;
  name: string;
  url?: string;
  first_release_date?: number;
  summary?: string;
  platforms?: number[];
  alternative_names?: Array<{ id: number; name: string }>;
  external_games?: Array<{
    uid: string;
    external_game_source: number;
  }>;
  genres?: Array<{ id: number; name: string }>;
  involved_companies?: Array<{
    id: number;
    developer: boolean;
    publisher: boolean;
    company: { id: number; name: string };
  }>;
}

export async function searchGames(
  gateway: IDataGateway,
  query: string, 
  type: SearchType = 'name',
  detailLevel: IGDBDetailLevel = 'basic'
): Promise<IGDBGame[]> {
  let endpoint = 'games';
  let apicalypseBody = '';

  let fields = 'name, url, first_release_date, summary, platforms, alternative_names.name, external_games.*';
  if (detailLevel === 'full') {
    fields += ', genres.name, involved_companies.developer, involved_companies.publisher, involved_companies.company.name';
  }

  if (type === 'steam') {
    endpoint = 'external_games';
    apicalypseBody = `fields game.${fields.replace(/, /g, ', game.')}; where uid = "${query}" & external_game_source = 1;`;
  } else if (type === 'igdb') {
    apicalypseBody = `fields ${fields}; where id = ${query};`;
  } else {
    // Requesting external_games to get Steam IDs (source 1)
    apicalypseBody = `search "${query}"; fields ${fields}; limit 10;`;
  }

  Logger.debug(`[IGDB] Requesting endpoint: ${endpoint}`);
  Logger.debug(`[IGDB] Query body: ${apicalypseBody}`);
  
  const rawData = await gateway.request<any[]>({
    uri: `igdb://${endpoint}`,
    body: apicalypseBody
  });

  Logger.debug(`[IGDB] Raw JSON Response: ${JSON.stringify(rawData)}`);

  if (type === 'steam') {
    return rawData
      .filter(item => item && item.game)
      .map(item => item.game); // Return the full game object
  }

  return rawData as IGDBGame[];
}
