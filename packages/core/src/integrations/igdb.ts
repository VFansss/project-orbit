import type { SearchType } from '../models/search';
import { Logger } from '../logger';

export interface IGDBGame {
  id: number;
  name: string;
  first_release_date?: number;
  summary?: string;
  external_games?: Array<{
    uid: string;
    external_game_source: number;
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
  type: SearchType = 'name'
): Promise<IGDBGame[]> {
  const token = await getAccessToken(clientId, clientSecret);
  
  let endpoint = 'games';
  let apicalypseBody = '';

  if (type === 'steam') {
    endpoint = 'external_games';
    apicalypseBody = `fields game.name, game.first_release_date, game.id; where uid = "${query}" & external_game_source = 1;`;
  } else if (type === 'igdb') {
    apicalypseBody = `fields name, first_release_date, summary; where id = ${query};`;
  } else {
    // Requesting external_games to get Steam IDs (source 1)
    apicalypseBody = `search "${query}"; fields name, first_release_date, summary, external_games.uid, external_games.external_game_source; limit 10;`;
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
      .map(item => ({
        id: item.game.id,
        name: item.game.name || item.name || 'Unknown Game',
        first_release_date: item.game.first_release_date,
        summary: '' 
      }));
  }

  return rawData as IGDBGame[];
}

export async function getIGDBGame(id: string, clientId: string, clientSecret: string): Promise<any> {
  const token = await getAccessToken(clientId, clientSecret);
  const apicalypseBody = `fields *, external_games.*; where id = ${id};`;
  const response = await fetch(`https://api.igdb.com/v4/games`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    body: apicalypseBody,
  });
  if (!response.ok) throw new Error(`IGDB API details request failed.`);
  return await response.json();
}

export async function getGameByExternalId(externalId: string, sourceId: number, clientId: string, clientSecret: string): Promise<any> {
  const token = await getAccessToken(clientId, clientSecret);
  const query = `fields game; where uid = "${externalId}" & external_game_source = ${sourceId};`;
  const response = await fetch(`https://api.igdb.com/v4/external_games`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${token}`,
    },
    body: query
  });
  const data = await response.json() as any[];
  if (!data || data.length === 0 || !data[0].game) return null;
  return await getIGDBGame(data[0].game, clientId, clientSecret);
}
