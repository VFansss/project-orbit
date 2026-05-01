import type { Game, GameMetadata } from '../models/game';
import type { IGDBGame } from '../integrations/igdb';

/**
 * IGDB Platform ID to Orbit Slug Mapping
 * This is kept here to keep core models decoupled from integration-specific IDs.
 */
const IGDB_PLATFORM_MAP: Record<number, string> = {
  6: 'pc',   // PC (Windows)
  7: 'ps1',  // PlayStation
  18: 'nes', // Nintendo Entertainment System
};

/**
 * Returns the Orbit platform slug given an IGDB platform ID.
 */
export function getPlatformSlugFromIGDB(igdbId: number): string | undefined {
  return IGDB_PLATFORM_MAP[igdbId];
}

export function mapIGDBToGame(igdbGame: IGDBGame): Game {
  const ids: Record<string, string> = { igdb: String(igdbGame.id) };
  
  // Extract Steam ID if available (external_game_source 1 is Steam)
  const steamEntry = igdbGame.external_games?.find(ext => ext.external_game_source === 1);
  if (steamEntry) ids.steam = steamEntry.uid;

  // Determine platform by checking IGDB platforms against our supported list
  let platform = 'unknown';
  if (igdbGame.platforms && igdbGame.platforms.length > 0) {
    // We prioritize the first platform we recognize
    for (const p of igdbGame.platforms) {
      const slug = getPlatformSlugFromIGDB(p);
      if (slug) {
        platform = slug;
        break;
      }
    }
  }

  // Extract aliases from alternative names
  const aliases = igdbGame.alternative_names?.map(an => an.name) || [];

  const metadata: GameMetadata = {
    general: {
      name: igdbGame.name,
      aliases: aliases,
      summary: igdbGame.summary,
      release_year: igdbGame.first_release_date 
        ? new Date(igdbGame.first_release_date * 1000).getFullYear() 
        : undefined,
      genres: [], // Mapping genres would require additional API calls or data
      developers: [],
      publishers: [],
    },
    source: {
      source: ['IGDB'],
      url: `https://www.igdb.com/games/${igdbGame.id}`
    }
  };

  return {
    name: igdbGame.name,
    platform,
    ids,
    metadata
  };
}
