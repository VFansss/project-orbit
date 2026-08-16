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
  franchise?: { id: number; name: string };
  franchises?: Array<{ id: number; name: string }>;
  collection?: { id: number; name: string };
  collections?: Array<{ id: number; name: string }>;
}

