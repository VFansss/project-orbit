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

    // Pre-calculate user paths to avoid doing readdir inside the O(N) games loop
    const gamesRoot = this.paths.getLibraryPath('Games');
    const userDataRoot = this.paths.getLibraryPath('UserData');
    const activeUserPaths: { screenshots?: string, savedata?: string }[] = [];
    
    try {
      const users = await readdir(userDataRoot);
      for (const user of users) {
        const userRoot = join(userDataRoot, user);
        const userContents = await readdir(userRoot).catch(() => []);
        const sFolder = userContents.find(f => f.toLowerCase() === 'screenshots');
        const dFolder = userContents.find(f => f.toLowerCase() === 'savedata');
        
        activeUserPaths.push({
          screenshots: sFolder ? join(userRoot, sFolder) : undefined,
          savedata: dFolder ? join(userRoot, dFolder) : undefined
        });
      }
    } catch {}

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

      // 4. Authoritative Metadata check
      let metadata: any = null;
      const metadataPath = this.paths.getMetadataPath(platform, folder).file;
      const hasMetadata = await this.checkPathExists(metadataPath);

      if (hasMetadata) {
        try {
          const tomlContent = await readFile(metadataPath, 'utf-8');
          metadata = parseToml(tomlContent) as any;
          
          const getField = (obj: any, key: string) => obj.ids?.[key] || obj[key] || obj.source?.[key] || obj.general?.[key];
          
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
        // Try to extract year from metadata or folder name
        let year: number | undefined = metadata?.general?.release_year;
        if (!year) {
          const yearMatch = folder.match(/\((\d{4})\)/);
          if (yearMatch) year = parseInt(yearMatch[1]);
        }

        const gameFolderPath = join(gamesRoot, platform, folder);
        const existsInGames = await this.checkPathExists(gameFolderPath);

        // Check UserData across ALL users to see if Screenshots/Savedata exist anywhere
        let hasScreenshots = false;
        let hasSavedata = false;
        
        for (const uPaths of activeUserPaths) {
          if (!hasScreenshots && uPaths.screenshots) {
            hasScreenshots = await this.checkPathExists(join(uPaths.screenshots, platform, folder));
          }
          if (!hasSavedata && uPaths.savedata) {
            hasSavedata = await this.checkPathExists(join(uPaths.savedata, platform, folder));
          }
        }

        results.push({
          confidence,
          confidenceDescription: CONFIDENCE_MAP[confidence],
          name: folder,
          year,
          platform,
          source: 'local',
          ids,
          local: {
            path: gameFolderPath,
            relativePath: join('Games', platform, folder),
            exists: existsInGames,
            hasMetadata,
            hasScreenshots,
            hasSavedata,
          },
          metadata
        });
      }
    }

    return results;
  }

  async resolve(query: OrbitQuery, options: ResolveOptions): Promise<ResolveResult[]> {
    const results: ResolveResult[] = [];
    const contents = options.content || ['games', 'userdata', 'metadata'];
    const libraryRoot = this.paths.getLibraryPath();
    
    // Collect all platforms to scan
    let platforms = options.platforms;
    if (!platforms) {
      const pSet = new Set<string>();
      if (contents.includes('games')) {
        const p = await readdir(join(libraryRoot, 'Games')).catch(() => []);
        p.forEach(x => pSet.add(x));
      }
      if (contents.includes('metadata')) {
        const p = await readdir(join(libraryRoot, 'Metadata')).catch(() => []);
        p.forEach(x => pSet.add(x));
      }
      if (contents.includes('userdata')) {
        try {
          const users = await readdir(join(libraryRoot, 'UserData'));
          for (const user of users) {
            const userRoot = join(libraryRoot, 'UserData', user);
            const userContents = await readdir(userRoot).catch(() => []);
            const screenshotsFolder = userContents.find(f => f.toLowerCase() === 'screenshots');
            const savedataFolder = userContents.find(f => f.toLowerCase() === 'savedata');

            if (screenshotsFolder) {
              const sPlats = await readdir(join(userRoot, screenshotsFolder)).catch(() => []);
              sPlats.forEach(p => pSet.add(p));
            }
            if (savedataFolder) {
              const dPlats = await readdir(join(userRoot, savedataFolder)).catch(() => []);
              dPlats.forEach(p => pSet.add(p));
            }
          }
        } catch {}
      }
      platforms = Array.from(pSet);
    }

    for (const platform of platforms) {
      const platformResults: Map<string, ResolveResult> = new Map();

      const mergeResults = (newResults: ResolveResult[]) => {
        for (const res of newResults) {
          const existing = platformResults.get(res.name);
          if (existing) {
            // Merge status flags
            if (res.local) {
              existing.local = {
                ...existing.local!,
                exists: existing.local!.exists || res.local.exists,
                hasMetadata: existing.local!.hasMetadata || res.local.hasMetadata,
                hasScreenshots: existing.local!.hasScreenshots || res.local.hasScreenshots,
                hasSavedata: existing.local!.hasSavedata || res.local.hasSavedata,
              };
            }
            // Prefer better confidence
            if (res.confidence < existing.confidence) {
              existing.confidence = res.confidence;
              existing.confidenceDescription = res.confidenceDescription;
            }
            // Merge IDs
            existing.ids = { ...existing.ids, ...res.ids };
            // Merge Metadata
            if (!existing.metadata && res.metadata) existing.metadata = res.metadata;
          } else {
            platformResults.set(res.name, res);
          }
        }
      };

      // 1. Scan Games
      if (contents.includes('games')) {
        mergeResults(await this.scanDirectory(join(libraryRoot, 'Games'), platform, query));
      }
      
      // 2. Scan Metadata
      if (contents.includes('metadata')) {
        mergeResults(await this.scanDirectory(join(libraryRoot, 'Metadata'), platform, query));
      }

      // 3. Scan UserData
      if (contents.includes('userdata')) {
        try {
          const users = await readdir(join(libraryRoot, 'UserData'));
          for (const user of users) {
            const userRoot = join(libraryRoot, 'UserData', user);
            const userContents = await readdir(userRoot).catch(() => []);
            const screenshotsFolder = userContents.find(f => f.toLowerCase() === 'screenshots');
            const savedataFolder = userContents.find(f => f.toLowerCase() === 'savedata');

            if (screenshotsFolder) {
              mergeResults(await this.scanDirectory(join(libraryRoot, 'UserData', user, screenshotsFolder), platform, query));
            }
            if (savedataFolder) {
              mergeResults(await this.scanDirectory(join(libraryRoot, 'UserData', user, savedataFolder), platform, query));
            }
          }
        } catch {}
      }

      results.push(...Array.from(platformResults.values()));
    }

    return results;
  }
}
