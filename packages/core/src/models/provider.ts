import type { Game } from './game';
import type { OrbitQuery } from '../library';

export type EnrichmentCapability = 'identity' | 'metadata' | 'assets' | 'achievements';

/**
 * Interface for a metadata provider in the enrichment pipeline.
 */
export interface MetadataProvider {
  name: string;
  capabilities: EnrichmentCapability[];
  
  /**
   * Returns true if the provider can handle the current game state or query.
   */
  canHandle(game: Partial<Game>, query?: OrbitQuery): boolean;
  
  /**
   * Enriches the game object with new data.
   */
  enrich(game: Partial<Game>, query?: OrbitQuery): Promise<Partial<Game>>;
}
