import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import { 
  type ConfidenceLevel, 
  type ResolveOptions, 
  type ResolveResult,
  CONFIDENCE_MAP 
} from './models/library';
import type { OrbitQuery } from './library';
import { PathService } from './paths';
import type { OrbitConfig } from './models/config';
import { Logger } from './logger';

export class LocalResolverService {
  private paths: PathService;

  constructor(private config: OrbitConfig) {
    this.paths = new PathService(config);
  }

  private async checkPathExists(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scans a specific platform directory for games or userdata.
   */
  private async scanDirectory(
    basePath: string, 
    platform: string, 
    query: OrbitQuery
  ): Promise<ResolveResult[]> {
    const results: ResolveResult[] = [];
    const platformPath = join(basePath, platform);
    
    let folders: string[] = [];
    try {
      folders = await readdir(platformPath);
    } catch {
      return [];
    }

    for (const folder of folders) {
      const fullPath = join(platformPath, folder);
      let confidence: ConfidenceLevel = -1;
      const ids: Record<string, string> = {};

      // 1. Match by name
      if (query.type === 'name') {
        if (folder.toLowerCase() === query.value.toLowerCase()) confidence = 1;
        else if (folder.toLowerCase().includes(query.value.toLowerCase())) confidence = 2;
      }

      // 2. Match by serial in folder name [SERIAL]
      if (query.type === 'serial') {
        const serialMatch = folder.match(/\[(.*?)\]/);
        if (serialMatch && serialMatch[1].toLowerCase() === query.value.toLowerCase()) {
          confidence = query.platform === platform ? 0 : 1;
          ids.serial = serialMatch[1];
        }
      }

      // 3. Match by path
      if (query.type === 'path' && (fullPath === query.value || folder === query.value)) {
        confidence = 0;
      }

      // 4. Metadata check for IDs and extra info
      let metadata: any = null;
      const metadataPath = this.paths.getMetadataPath(platform, folder).file;
      const hasMetadata = await this.checkPathExists(metadataPath);

      if (hasMetadata) {
        try {
          const tomlContent = await readFile(metadataPath, 'utf-8');
          metadata = parseToml(tomlContent) as any;
          
          const getField = (obj: any, key: string) => obj[key] || obj.source?.[key] || obj.general?.[key];
          
          const steamId = getField(metadata, 'steam');
          const igdbId = getField(metadata, 'igdb');
          const serialId = getField(metadata, 'serial');

          if (steamId) ids.steam = String(steamId);
          if (igdbId) ids.igdb = String(igdbId);
          if (serialId) ids.serial = String(serialId);

          if (query.type === 'steam' && ids.steam === query.value) confidence = 0;
          if (query.type === 'igdb' && ids.igdb === query.value) confidence = 0;
        } catch (e) {
          Logger.debug(`Failed to parse metadata for ${folder} at ${metadataPath}: ${e}`);
        }
      }

      if (confidence !== -1) {
        // Build exhaustive local status
        const gamesRoot = this.paths.getLibraryPath('Games');
        const userDataRoot = this.paths.getLibraryPath('UserData');
        
        const gameFolderPath = join(gamesRoot, platform, folder);
        const screenshotPath = join(userDataRoot, 'Screenshots', platform, folder);
        const savedataPath = join(userDataRoot, 'Savedata', platform, folder);

        results.push({
          confidence,
          confidenceDescription: CONFIDENCE_MAP[confidence],
          name: folder,
          platform,
          source: 'local',
          ids,
          local: {
            path: gameFolderPath,
            relativePath: join('Games', platform, folder),
            exists: await this.checkPathExists(gameFolderPath),
            hasMetadata,
            hasScreenshots: await this.checkPathExists(screenshotPath),
            hasSavedata: await this.checkPathExists(savedataPath),
          },
          metadata
        });
      }
    }

    return results;
  }

  async resolve(query: OrbitQuery, options: ResolveOptions): Promise<ResolveResult[]> {
    const results: ResolveResult[] = [];
    const contents = options.content || ['games', 'userdata'];
    const libraryRoot = this.paths.getLibraryPath();
    
    // Collect all platforms to scan
    let platforms = options.platforms;
    if (!platforms) {
      const pSet = new Set<string>();
      if (contents.includes('games')) {
        const p = await readdir(join(libraryRoot, 'Games')).catch(() => []);
        p.forEach(x => pSet.add(x));
      }
      if (contents.includes('userdata')) {
        const screenshotPlatforms = await readdir(join(libraryRoot, 'UserData', 'Screenshots')).catch(() => []);
        const savedataPlatforms = await readdir(join(libraryRoot, 'UserData', 'Savedata')).catch(() => []);
        screenshotPlatforms.forEach(x => pSet.add(x));
        savedataPlatforms.forEach(x => pSet.add(x));
      }
      platforms = Array.from(pSet);
    }

    for (const platform of platforms) {
      if (contents.includes('games')) {
        const res = await this.scanDirectory(join(libraryRoot, 'Games'), platform, query);
        results.push(...res);
      }
      // If userdata is requested, we also look there, but we deduplicate by name+platform
      if (contents.includes('userdata')) {
        const sRes = await this.scanDirectory(join(libraryRoot, 'UserData', 'Screenshots'), platform, query);
        const dRes = await this.scanDirectory(join(libraryRoot, 'UserData', 'Savedata'), platform, query);
        
        // Simple deduplication logic: if name+platform already in results, skip
        [...sRes, ...dRes].forEach(r => {
          if (!results.find(x => x.name === r.name && x.platform === r.platform)) {
            results.push(r);
          }
        });
      }
    }

    return results;
  }
}
