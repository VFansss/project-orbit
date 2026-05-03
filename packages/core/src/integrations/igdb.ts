import type { SearchType } from '../models/search';
import { Logger } from '../logger';

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

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const url = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) throw new Error(`IGDB Authentication failed.`);
  const data = await response.json() as any;
  return data.access_token;
}

export async function searchGames(
  query: string, 
  clientId: string, 
  clientSecret: string, 
  type: SearchType = 'name',
  detailLevel: IGDBDetailLevel = 'basic'
): Promise<IGDBGame[]> {
  const token = await getAccessToken(clientId, clientSecret);
  
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
  
  const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    body: apicalypseBody,
  });

  if (!response.ok) {
    const errorText = await response.text();
    Logger.error(`IGDB API Error: ${errorText}`);
    throw new Error(`IGDB API request failed.`);
  }

  const rawData = await response.json() as any[];
  Logger.debug(`[IGDB] Raw JSON Response: ${JSON.stringify(rawData)}`);

  if (type === 'steam') {
    return rawData
      .filter(item => item && item.game)
      .map(item => item.game); // Return the full game object
  }

  return rawData as IGDBGame[];
}
