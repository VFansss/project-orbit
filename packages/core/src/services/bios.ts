import { join, basename } from 'node:path';
import { readdir, mkdir } from 'node:fs/promises';
import { calculateFileHashes } from '../utils/hashing';
import { ResourceManager } from '../resources/manager';
import type { LibretroSystemBiosResourceHandler } from '../resources/definitions/libretro-system-bios';
import type { OrbitConfig } from '../models/config';
import type { BiosReferenceEntry } from '../resources/types';
import { Logger } from '../logger';
import { PlatformRegistry } from '../platforms';

export interface BiosImportResult {
  sourcePath: string;
  filename: string;
  platform: string;
  identified: boolean;
  isSupportedPlatform: boolean;
  matchedEntry?: BiosReferenceEntry;
  targetPath?: string;
  md5: string;
  sha1: string;
  actionTaken: 'imported' | 'skipped_already_exists' | 'staged_unsupported' | 'ignored_unidentified';
}

export interface BiosVerifyReport {
  platform: string;
  filename: string;
  status: 'valid' | 'corrupted' | 'missing';
  expectedSha1?: string;
  foundSha1?: string;
}

export class BiosService {
  private resourceManager: ResourceManager;

  constructor(private config: OrbitConfig) {
    this.resourceManager = new ResourceManager(config);
  }

  private getLibraryRoot(): string {
    const root = this.config.currentLibraryPath;
    if (!root) throw new Error('No active library. Please load a library first.');
    return root;
  }

  /**
   * Helper to ensure bios resource is loaded and returns the handler.
   */
  private async getBiosHandler(): Promise<LibretroSystemBiosResourceHandler> {
    await this.resourceManager.fetchResource('libretro-system-bios', false);
    const handler = this.resourceManager.getHandler<LibretroSystemBiosResourceHandler>('libretro-system-bios');
    if (!handler) throw new Error('Failed to load Libretro System BIOS resource handler.');
    return handler;
  }

  /**
   * Imports a BIOS binary file or a directory of BIOS files.
   * - Curated platforms (ps1, gba, pc, etc.) are placed in Bios/<platform>/<filename>.
   * - Un-curated platforms are moved to _staging/bios/ with alerts.
   * - Unidentified files are IGNORED (left untouched) and reported.
   * - Already existing identical files are skipped without overwriting.
   */
  public async importBios(
    sourcePath: string,
    options?: { copy?: boolean; platformFallback?: string; force?: boolean }
  ): Promise<BiosImportResult[]> {
    const handler = await this.getBiosHandler();
    const libraryRoot = this.getLibraryRoot();
    const results: BiosImportResult[] = [];

    const file = Bun.file(sourcePath);
    const isSingleFile = await file.exists();

    let filesToProcess: string[] = [];

    if (isSingleFile) {
      filesToProcess.push(sourcePath);
    } else {
      try {
        const entries = await readdir(sourcePath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && !entry.name.startsWith('.')) {
            filesToProcess.push(join(sourcePath, entry.name));
          }
        }
      } catch (err: any) {
        throw new Error(`Invalid source path "${sourcePath}": ${err.message}`);
      }
    }

    for (const filePath of filesToProcess) {
      const origName = basename(filePath);
      
      // Calculate hashes
      const resList = await calculateFileHashes(filePath);
      const hashes = resList[0]?.hashes || {};
      const sha1 = hashes.sha1 || '';
      const md5 = hashes.md5 || '';

      // Lookup in Libretro System BIOS DAT by SHA1, MD5, or CRC32
      let matchedEntry = await handler.lookupByHash(sha1);
      if (!matchedEntry) matchedEntry = await handler.lookupByHash(md5);
      if (!matchedEntry && hashes.crc32) matchedEntry = await handler.lookupByHash(hashes.crc32);

      // Fallback matching by filename if hash lookup yields nothing
      if (!matchedEntry) {
        const byName = await handler.query({ filename: origName });
        if (byName.matched && byName.results.length > 0) {
          matchedEntry = byName.results[0];
        }
      }

      const identified = !!matchedEntry;

      // Case 3: Completely unidentified file - Ignore it completely, leave untouched!
      if (!identified) {
        Logger.info(`[Ignore] File "${origName}" is not a recognized BIOS file. Left untouched.`);
        results.push({
          sourcePath: filePath,
          filename: origName,
          platform: 'unknown',
          identified: false,
          isSupportedPlatform: false,
          md5,
          sha1,
          actionTaken: 'ignored_unidentified'
        });
        continue;
      }

      const rawPlatform = matchedEntry.platform || options?.platformFallback || 'unknown';
      const resolvedSlug = PlatformRegistry.resolveSlug(rawPlatform);
      const platform = resolvedSlug || rawPlatform;
      const isSupportedPlatform = !!resolvedSlug;
      const targetFilename = matchedEntry.filename || origName;


      if (isSupportedPlatform) {
        // Case 1: Curated Platform -> Bios/<platform>/
        const biosDir = join(libraryRoot, 'Bios', platform);
        const checksumDir = join(biosDir, 'checksum');
        const targetPath = join(biosDir, targetFilename);

        const existingFile = Bun.file(targetPath);
        if ((await existingFile.exists()) && !options?.force) {
          // Check if existing file has identical SHA1
          const sha1File = Bun.file(join(checksumDir, `${targetFilename}.sha1`));
          let existingSha1 = '';
          if (await sha1File.exists()) {
            existingSha1 = (await sha1File.text()).trim().toLowerCase();
          }

          if (existingSha1 === sha1.toLowerCase() || existingSha1 === '') {
            Logger.info(`[Skip] BIOS "${targetFilename}" already exists in Bios/${platform}/ with identical checksum.`);
            results.push({
              sourcePath: filePath,
              filename: targetFilename,
              platform,
              identified: true,
              isSupportedPlatform: true,
              matchedEntry,
              targetPath,
              md5,
              sha1,
              actionTaken: 'skipped_already_exists'
            });
            continue;
          }
        }

        await mkdir(biosDir, { recursive: true });
        await mkdir(checksumDir, { recursive: true });

        const sourceFile = Bun.file(filePath);
        await Bun.write(targetPath, sourceFile);

        // Write checksum files according to Orbit Hashing standard
        await Bun.write(join(checksumDir, `${targetFilename}.sha1`), sha1);
        await Bun.write(join(checksumDir, `${targetFilename}.md5`), md5);

        if (!options?.copy && filePath !== targetPath) {
          const { rm } = await import('node:fs/promises');
          await rm(filePath, { force: true });
        }

        Logger.info(`[✓] Imported BIOS "${targetFilename}" -> Bios/${platform}/`);

        results.push({
          sourcePath: filePath,
          filename: targetFilename,
          platform,
          identified: true,
          isSupportedPlatform: true,
          matchedEntry,
          targetPath,
          md5,
          sha1,
          actionTaken: 'imported'
        });

      } else {
        // Case 2: Un-curated platform -> Move to _staging/bios/ with Alert
        const stagingBiosDir = join(libraryRoot, '_staging', 'bios');
        const targetPath = join(stagingBiosDir, targetFilename);

        await mkdir(stagingBiosDir, { recursive: true });

        const sourceFile = Bun.file(filePath);
        await Bun.write(targetPath, sourceFile);

        if (!options?.copy && filePath !== targetPath) {
          const { rm } = await import('node:fs/promises');
          await rm(filePath, { force: true });
        }

        Logger.warn(`[!] BIOS matched platform "${platform}" (Not curated in Orbit). Moved to _staging/bios/`);

        results.push({
          sourcePath: filePath,
          filename: targetFilename,
          platform,
          identified: true,
          isSupportedPlatform: false,
          matchedEntry,
          targetPath,
          md5,
          sha1,
          actionTaken: 'staged_unsupported'
        });
      }
    }

    return results;
  }

  /**
   * Verifies existing BIOS files in Bios/<platform>/ against checksums and DAT entries.
   */
  public async verifyBios(targetPlatform?: string): Promise<BiosVerifyReport[]> {
    const handler = await this.getBiosHandler();
    const libraryRoot = this.getLibraryRoot();
    const reports: BiosVerifyReport[] = [];

    const biosBaseDir = join(libraryRoot, 'Bios');
    let platformsToScan: string[] = [];

    if (targetPlatform) {
      platformsToScan.push(targetPlatform);
    } else {
      try {
        const entries = await readdir(biosBaseDir, { withFileTypes: true });
        platformsToScan = entries.filter(e => e.isDirectory()).map(e => e.name);
      } catch {
        return [];
      }
    }

    for (const plat of platformsToScan) {
      const platDir = join(biosBaseDir, plat);
      const checksumDir = join(platDir, 'checksum');

      let files: string[] = [];
      try {
        const entries = await readdir(platDir, { withFileTypes: true });
        files = entries.filter(e => e.isFile()).map(e => e.name);
      } catch {
        continue;
      }

      for (const fileName of files) {
        const filePath = join(platDir, fileName);
        const resList = await calculateFileHashes(filePath);
        const hashes = resList[0]?.hashes || {};

        // Read stored checksum
        const sha1File = Bun.file(join(checksumDir, `${fileName}.sha1`));
        let expectedSha1: string | undefined;
        if (await sha1File.exists()) {
          expectedSha1 = (await sha1File.text()).trim().toLowerCase();
        }

        const isCorrupted = (expectedSha1 && hashes.sha1) ? expectedSha1 !== hashes.sha1.toLowerCase() : false;

        reports.push({
          platform: plat,
          filename: fileName,
          status: isCorrupted ? 'corrupted' : 'valid',
          expectedSha1,
          foundSha1: hashes.sha1
        });
      }
    }

    return reports;
  }
}
