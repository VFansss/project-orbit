import type { Game, GameMetadata } from '../models/game';

/**
 * Ensures a value is an array. 
 * Useful for TOML where a user might write a single string instead of ["string"].
 */
function toArray(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

/**
 * Maps our internal Pivot Model to the structure expected by orbit.metadata.toml
 */
export function mapGameToMetadata(game: Game): any {
  // We merge basic info and IDs into the metadata structure for the TOML file
  const tomlData = JSON.parse(JSON.stringify(game.metadata));

  // Ensure sections exist
  if (!tomlData.ids) tomlData.ids = {};
  if (!tomlData.sources) tomlData.sources = [];

  // Add standard identifiers to the ids section if they exist
  if (game.ids.igdb) tomlData.ids.igdb = game.ids.igdb;
  if (game.ids.steam) tomlData.ids.steam = game.ids.steam;
  if (game.ids.serial) tomlData.ids.serial = game.ids.serial;
  if (game.ids.hash) tomlData.ids.hash = game.ids.hash;

  return tomlData;
}

/**
 * Maps a parsed orbit.metadata.toml (and context) back to our Pivot Model
 */
export function mapMetadataToGame(metadata: any, platform: string, folderName: string): Game {
  const ids: Record<string, string> = {};
  
  // Helper to find ID in common places (root, ids, general)
  const findId = (key: string) => metadata.ids?.[key] || metadata.general?.[key] || metadata[key];

  const igdb = findId('igdb');
  const steam = findId('steam');
  const serial = findId('serial');
  const hash = findId('hash');

  if (igdb) ids.igdb = String(igdb);
  if (steam) ids.steam = String(steam);
  if (serial) ids.serial = String(serial);
  if (hash) ids.hash = String(hash);

  // Reconstruct the standardized metadata object with "array-fication"
  const cleanMetadata: GameMetadata = {
    general: {
      name: metadata.general?.name || folderName,
      aliases: toArray(metadata.general?.aliases).map(String),
      summary: metadata.general?.summary,
      release_year: metadata.general?.release_year ? String(metadata.general.release_year) : undefined,
      genres: toArray(metadata.general?.genres).map(String),
      developers: toArray(metadata.general?.developers).map(String),
      publishers: toArray(metadata.general?.publishers).map(String),
      franchise: metadata.general?.franchise ? String(metadata.general.franchise) : undefined,
      series: metadata.general?.series ? String(metadata.general.series) : undefined,
    },
    ids: metadata.ids || {},
    relations: {
      same_game_as: toArray(metadata.relations?.same_game_as).map(String),
      remake_of: toArray(metadata.relations?.remake_of).map(String),
      included_in: toArray(metadata.relations?.included_in).map(String),
    },
    sources: toArray(metadata.sources || metadata.source)
  };



  return {
    name: cleanMetadata.general.name,
    platform,
    ids,
    metadata: cleanMetadata
  };
}
