/**
 * Hasheous API Response Models
 * Based on OpenAPI spec
 */

export interface HasheousMetadataItem {
  objectType: 'Company' | 'Platform' | 'Game' | 'ROM' | 'App' | 'None';
  id: string;
  source: 'None' | 'IGDB' | 'TheGamesDb' | 'RetroAchievements' | 'GiantBomb' | 'Steam' | 'GOG' | 'EpicGameStore' | 'Wikipedia' | 'SteamGridDb' | 'ScreenScraper';
  link?: string;
  status: 'NotMapped' | 'Mapped' | 'MappedWithErrors';
}

export interface HasheousSignatureResult {
  game?: {
    id: string;
    name: string;
    gameId: string;
  };
  rom?: {
    id: string;
    name: string;
    size: number;
    crc: string;
    mD5: string;
    shA1: string;
  };
}

export interface HasheousHashLookupResponse {
  id: number;
  name: string;
  metadata?: HasheousMetadataItem[];
  signatures?: Record<string, HasheousSignatureResult[]>;
}

export interface HasheousStatusResponse {
  version: string;
  status: string;
  uptime: string;
}
