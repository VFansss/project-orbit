import { join, basename } from 'node:path';
import { readdir, mkdir } from 'node:fs/promises';
import { calculateFileHashes } from '../utils/hashing';
import { ResourceManager } from '../resources/manager';
import type { LibretroSystemBiosResourceHandler } from '../resources/definitions/libretro-system-bios';
import type { OrbitConfig } from '../models/config';
import type { BiosReferenceEntry } from '../resources/types';
import { Logger } from '../logger';


export interface BiosImportResult {
  sourcePath: string;
  filename: string;
  platform: string;
  identified: boolean;
  matchedEntry?: BiosReferenceEntry;
  targetPath: string;
  md5: string;
  sha1: string;
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
   * Imports a BIOS binary file or a directory of BIOS files into Bios/<platform>/<filename>.
   */
  public async importBios(
    sourcePath: string,
    options?: { copy?: boolean; platformFallback?: string }
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
      // Scan directory for binary files
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
      const platform = matchedEntry?.platform || options?.platformFallback || 'unknown';
      const targetFilename = matchedEntry?.filename || origName;

      const biosDir = join(libraryRoot, 'Bios', platform);
      const checksumDir = join(biosDir, 'checksum');
      const targetPath = join(biosDir, targetFilename);

      await mkdir(biosDir, { recursive: true });
      await mkdir(checksumDir, { recursive: true });

      // Copy or Move binary file
      const sourceFile = Bun.file(filePath);
      await Bun.write(targetPath, sourceFile);

      if (!options?.copy && filePath !== targetPath) {
        const { rm } = await import('node:fs/promises');
        await rm(filePath, { force: true });
      }

      // Write checksum files according to Orbit Hashing standard
      await Bun.write(join(checksumDir, `${targetFilename}.sha1`), sha1);
      await Bun.write(join(checksumDir, `${targetFilename}.md5`), md5);

      Logger.info(`[✓] Imported BIOS "${targetFilename}" -> Bios/${platform}/ (SHA1: ${sha1.substring(0, 8)}...)`);

      results.push({
        sourcePath: filePath,
        filename: targetFilename,
        platform,
        identified,
        matchedEntry: matchedEntry || undefined,
        targetPath,
        md5,
        sha1
      });
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
