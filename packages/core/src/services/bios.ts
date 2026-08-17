import { join, basename } from 'node:path';
import { readdir, mkdir } from 'node:fs/promises';
import { calculateFileHashes } from '../utils/hashing';
import { ResourceManager } from '../resources/manager';
import type { LibretroSystemBiosResourceHandler } from '../resources/definitions/libretro-system-bios';
import type { OrbitConfig } from '../models/config';
import type { BiosReferenceEntry } from '../resources/types';
import { PlatformRegistry } from '../platforms';

export interface BiosImportResult {
  sourcePath: string;
  filename: string;
  platform: string;
  identified: boolean;
  isSupportedPlatform: boolean;
  matchedEntry?: BiosReferenceEntry;
  matchMethod?: 'sha1' | 'md5' | 'crc32' | 'filename';
  targetPath?: string;
  crc32: string;
  md5: string;
  sha1: string;
  sha256: string;
  actionTaken: 'imported' | 'skipped_already_exists' | 'warn_unsupported_platform' | 'ignored_unidentified';
}

export interface BiosVerifyReport {
  platform: string;
  filename: string;
  status: 'valid' | 'corrupted' | 'missing';
  expectedSha1?: string;
  foundSha1?: string;
}

import type { IDataGateway } from '../gateway/types';

export class BiosService {
  private resourceManager: ResourceManager;

  constructor(private config: OrbitConfig, gateway?: IDataGateway) {
    this.resourceManager = new ResourceManager(config, gateway);
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
   * Helper to scan files in a directory (optionally recursive).
   */
  private async scanDirectory(dirPath: string, recursive = false): Promise<string[]> {
    const filePaths: string[] = [];
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = join(dirPath, entry.name);
      if (entry.isFile()) {
        filePaths.push(fullPath);
      } else if (entry.isDirectory() && recursive) {
        const subFiles = await this.scanDirectory(fullPath, true);
        filePaths.push(...subFiles);
      }
    }
    return filePaths;
  }

  /**
   * Imports a BIOS binary file or a directory of BIOS files.
   * - BIOS files MUST match by HASH (SHA1, MD5, CRC32) against DAT index.
   * - Loose filename includes ("1000") is disabled to prevent non-BIOS file collisions.
   * - Curated platforms (ps1, gba, pc, etc.) are placed in Bios/<platform>/<filename>.
   * - Un-curated platforms are NOT moved/staged: reported as explicit warning, left untouched.
   * - Unidentified files are IGNORED (left untouched) and reported.
   * - Already existing identical files are skipped without overwriting.
   * - Writes .crc32, .md5, .sha1, and .sha256 sidecar files into checksum/.
   */
  public async importBios(
    sourcePath: string,
    options?: { copy?: boolean; platformFallback?: string; force?: boolean; recursive?: boolean; allowFilenameFallback?: boolean }
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
        filesToProcess = await this.scanDirectory(sourcePath, options?.recursive ?? false);
      } catch (err: any) {
        throw new Error(`Invalid source path "${sourcePath}": ${err.message}`);
      }
    }

    for (const filePath of filesToProcess) {
      const origName = basename(filePath);
      
      // Calculate all hashes in single streaming pass
      const resList = await calculateFileHashes(filePath);
      const hashes = resList[0]?.hashes || {};
      const sha1 = hashes.sha1 || '';
      const md5 = hashes.md5 || '';
      const crc32 = hashes.crc32 || '';
      const sha256 = hashes.sha256 || '';

      // Lookup strictly by HASH in Libretro System BIOS DAT
      let matchMethod: 'sha1' | 'md5' | 'crc32' | 'filename' | undefined;
      let matchedEntry = await handler.lookupByHash(sha1);
      if (matchedEntry) matchMethod = 'sha1';

      if (!matchedEntry && md5) {
        matchedEntry = await handler.lookupByHash(md5);
        if (matchedEntry) matchMethod = 'md5';
      }

      if (!matchedEntry && crc32) {
        matchedEntry = await handler.lookupByHash(crc32);
        if (matchedEntry) matchMethod = 'crc32';
      }

      // Optional fallback: Match ONLY if exact filename match AND explicitly allowed
      if (!matchedEntry && options?.allowFilenameFallback) {
        const byName = await handler.query({ filename: origName });
        const exactMatch = byName.results.find(r => r.filename.toLowerCase() === origName.toLowerCase());
        if (exactMatch) {
          matchedEntry = exactMatch;
          matchMethod = 'filename';
        }
      }

      const identified = !!matchedEntry;

      // Case 3: Completely unidentified file - Ignore completely, leave untouched!
      if (!identified) {
        results.push({
          sourcePath: filePath,
          filename: origName,
          platform: 'unknown',
          identified: false,
          isSupportedPlatform: false,
          crc32,
          md5,
          sha1,
          sha256,
          actionTaken: 'ignored_unidentified'
        });
        continue;
      }

      const rawPlatform = matchedEntry.platform || options?.platformFallback || 'unknown';
      const resolvedSlug = PlatformRegistry.resolveSlug(rawPlatform);
      const platform = resolvedSlug || rawPlatform;
      const isSupportedPlatform = !!resolvedSlug;
      const targetFilename = matchedEntry.filename || origName;

      if (!isSupportedPlatform) {
        // Case 2: Recognized BIOS but platform NOT curated in Orbit -> DO NOT MOVE, DO NOT STAGE, just warn!
        results.push({
          sourcePath: filePath,
          filename: targetFilename,
          platform: rawPlatform,
          identified: true,
          isSupportedPlatform: false,
          matchedEntry,
          matchMethod,
          crc32,
          md5,
          sha1,
          sha256,
          actionTaken: 'warn_unsupported_platform'
        });
        continue;
      }

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
          results.push({
            sourcePath: filePath,
            filename: targetFilename,
            platform,
            identified: true,
            isSupportedPlatform: true,
            matchedEntry,
            matchMethod,
            targetPath,
            crc32,
            md5,
            sha1,
            sha256,
            actionTaken: 'skipped_already_exists'
          });
          continue;
        }
      }

      await mkdir(biosDir, { recursive: true });
      await mkdir(checksumDir, { recursive: true });

      const sourceFile = Bun.file(filePath);
      await Bun.write(targetPath, sourceFile);

      // Write checksum files according to Orbit Hashing standard (.sha1, .md5, .crc32, .sha256)
      await Bun.write(join(checksumDir, `${targetFilename}.sha1`), sha1);
      await Bun.write(join(checksumDir, `${targetFilename}.md5`), md5);
      if (crc32) {
        await Bun.write(join(checksumDir, `${targetFilename}.crc32`), crc32);
      }
      if (sha256) {
        await Bun.write(join(checksumDir, `${targetFilename}.sha256`), sha256);
      }

      const isCopyDefault = options?.copy !== false;

      if (!isCopyDefault && filePath !== targetPath) {
        const { rm } = await import('node:fs/promises');
        await rm(filePath, { force: true });
      }

      results.push({
        sourcePath: filePath,
        filename: targetFilename,
        platform,
        identified: true,
        isSupportedPlatform: true,
        matchedEntry,
        matchMethod,
        targetPath,
        crc32,
        md5,
        sha1,
        sha256,
        actionTaken: 'imported'
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
