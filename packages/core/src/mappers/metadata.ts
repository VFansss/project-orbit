import type { Game, GameMetadata } from '../models/game';

/**
 * Maps our internal Pivot Model to the structure expected by orbit.metadata.toml
 */
export function mapGameToMetadata(game: Game): any {
  // We merge basic info and IDs into the metadata structure for the TOML file
  const tomlData = JSON.parse(JSON.stringify(game.metadata));

  // Add standard identifiers to the general section if they exist
  if (game.ids.igdb) tomlData.general.igdb = game.ids.igdb;
  if (game.ids.steam) tomlData.general.steam = game.ids.steam;
  if (game.ids.serial) tomlData.general.serial = game.ids.serial;
  if (game.ids.hash) tomlData.general.hash = game.ids.hash;

  return tomlData;
}

/**
 * Maps a parsed orbit.metadata.toml (and context) back to our Pivot Model
 */
export function mapMetadataToGame(metadata: any, platform: string, folderName: string): Game {
  const ids: Record<string, string> = {};
  
  // Helper to find ID in common places (root, general, or source)
  const findId = (key: string) => metadata[key] || metadata.general?.[key] || metadata.source?.[key];

  const igdb = findId('igdb');
  const steam = findId('steam');
  const serial = findId('serial');
  const hash = findId('hash');

  if (igdb) ids.igdb = String(igdb);
  if (steam) ids.steam = String(steam);
  if (serial) ids.serial = String(serial);
  if (hash) ids.hash = String(hash);

  // Reconstruct the standardized metadata object
  const cleanMetadata: GameMetadata = {
    general: {
      name: metadata.general?.name || folderName,
      aliases: metadata.general?.aliases || [],
      summary: metadata.general?.summary,
      release_year: metadata.general?.release_year,
      genres: metadata.general?.genres || [],
      developers: metadata.general?.developers || [],
      publishers: metadata.general?.publishers || [],
    },
    source: {
      source: metadata.source?.source || [],
      url: metadata.source?.url
    }
  };

  return {
    name: cleanMetadata.general.name,
    platform,
    ids,
    metadata: cleanMetadata
  };
}
