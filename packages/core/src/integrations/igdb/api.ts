import type { SearchType } from '../../models/search';
import { Logger } from '../../logger';
import type { IDataGateway } from '../../gateway/types';
import type { IGDBGame, IGDBDetailLevel } from './models';

/**
 * Low-level search function using the DataGateway.
 */
export async function searchGames(
  gateway: IDataGateway,
  query: string, 
  type: SearchType = 'name',
  detailLevel: IGDBDetailLevel = 'basic'
): Promise<IGDBGame[]> {
  let endpoint = 'games';
  let apicalypseBody = '';

  let fields = 'name, url, first_release_date, summary, platforms, alternative_names.name, external_games.*, franchise.name, franchises.name, collection.name, collections.name';
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

  if (type === 'steam') {
    return rawData
      .filter(item => item && item.game)
      .map(item => item.game);
  }

  return rawData as IGDBGame[];
}
