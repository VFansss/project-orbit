import { join, basename } from 'node:path';
import { readdir, mkdir, stat } from 'node:fs/promises';
import { calculateFileHashes } from '../utils/hashing';
import { ResourceManager } from '../resources/manager';
import type { LibretroSystemBiosResourceHandler } from '../resources/definitions/libretro-system-bios';
import type { OrbitConfig } from '../models/config';
import type { BiosReferenceEntry } from '../resources/types';
import { PlatformRegistry } from '../platforms';
import type { IDataGateway } from '../gateway/types';

const MAX_BIOS_FILE_SIZE_BYTES = 64 * 1024 * 1024; // 64 MB
const KNOWN_BIOS_EXTENSIONS = new Set(['.bin', '.rom', '.pce', '.dat', '.bios', '.img', '.sfc', '.pbp', '.cue', '.iso']);

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
   * - Strict HASH matching (SHA1, MD5, CRC32) against DAT index.
   * - Curated platforms (ps1, gba, etc.) are placed in Bios/<platform>/<filename>.
   * - Writes .crc32, .md5, .sha1, and .sha256 sidecars into Bios/<platform>/checksum/.
   */
  public async importBios(
    sourcePath: string,
    options?: { copy?: boolean; platformFallback?: string; force?: boolean; recursive?: boolean; allowFilenameFallback?: boolean; scanZip?: boolean }
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
      const dotIdx = origName.lastIndexOf('.');
      const ext = dotIdx !== -1 ? origName.substring(dotIdx).toLowerCase() : '';

      // Fast check: extension whitelist, zip flag, and max file size (64MB)
      const isAllowedExt = ext === '.zip' ? !!options?.scanZip : (ext === '' || KNOWN_BIOS_EXTENSIONS.has(ext));
      const fileStat = isAllowedExt ? await stat(filePath).catch(() => null) : null;

      if (!fileStat || fileStat.size > MAX_BIOS_FILE_SIZE_BYTES) {
        results.push({
          sourcePath: filePath,
          filename: origName,
          platform: 'unknown',
          identified: false,
          isSupportedPlatform: false,
          crc32: '', md5: '', sha1: '', sha256: '',
          actionTaken: 'ignored_unidentified'
        });
        continue;
      }

      // Calculate hashes with resilience against locked/corrupted files
      const resList = await calculateFileHashes(filePath, ['crc32', 'md5', 'sha1', 'sha256'], false, options?.scanZip).catch(() => []);
      if (resList.length === 0) {
        results.push({
          sourcePath: filePath,
          filename: origName,
          platform: 'unknown',
          identified: false,
          isSupportedPlatform: false,
          crc32: '', md5: '', sha1: '', sha256: '',
          actionTaken: 'ignored_unidentified'
        });
        continue;
      }

      const hashes = resList[0]?.hashes || {};
      const sha1 = hashes.sha1 || '';
      const md5 = hashes.md5 || '';
      const crc32 = hashes.crc32 || '';
      const sha256 = hashes.sha256 || '';

      // Lookup strictly by HASH in Libretro System BIOS DAT (SHA1 -> MD5 -> CRC32)
      let matchMethod: 'sha1' | 'md5' | 'crc32' | 'filename' | undefined;
      let matchedEntry: BiosReferenceEntry | null = (sha1 ? await handler.lookupByHash(sha1) : null);
      if (matchedEntry) {
        matchMethod = 'sha1';
      } else if (md5 && (matchedEntry = await handler.lookupByHash(md5))) {
        matchMethod = 'md5';
      } else if (crc32 && (matchedEntry = await handler.lookupByHash(crc32))) {
        matchMethod = 'crc32';
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
      if (!identified) {
        results.push({
          sourcePath: filePath,
          filename: origName,
          platform: 'unknown',
          identified: false,
          isSupportedPlatform: false,
          crc32, md5, sha1, sha256,
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
        results.push({
          sourcePath: filePath,
          filename: targetFilename,
          platform: rawPlatform,
          identified: true,
          isSupportedPlatform: false,
          matchedEntry,
          matchMethod,
          crc32, md5, sha1, sha256,
          actionTaken: 'warn_unsupported_platform'
        });
        continue;
      }

      // Curated destination: Bios/<platform>/<filename>
      const platformDir = join(libraryRoot, 'Bios', platform);
      const checksumDir = join(platformDir, 'checksum');
      await mkdir(checksumDir, { recursive: true });

      const destPath = join(platformDir, targetFilename);
      const destFile = Bun.file(destPath);

      if (await destFile.exists() && !options?.force) {
        const destHashes = await calculateFileHashes(destPath);
        if (destHashes[0]?.hashes?.sha1 === sha1) {
          results.push({
            sourcePath: filePath,
            filename: targetFilename,
            platform,
            identified: true,
            isSupportedPlatform: true,
            matchedEntry,
            matchMethod,
            targetPath: destPath,
            crc32, md5, sha1, sha256,
            actionTaken: 'skipped_already_exists'
          });
          continue;
        }
      }

      // Write sidecar checksum files
      if (sha1) await Bun.write(join(checksumDir, `${targetFilename}.sha1`), sha1);
      if (md5) await Bun.write(join(checksumDir, `${targetFilename}.md5`), md5);
      if (crc32) await Bun.write(join(checksumDir, `${targetFilename}.crc32`), crc32);
      if (sha256) await Bun.write(join(checksumDir, `${targetFilename}.sha256`), sha256);

      // Perform file import: default is COPY (safety first)
      if (options?.copy === false) {
        await Bun.write(destPath, await Bun.file(filePath).arrayBuffer());
        const { unlink } = await import('node:fs/promises');
        await unlink(filePath);
      } else {
        await Bun.write(destPath, await Bun.file(filePath).arrayBuffer());
      }

      results.push({
        sourcePath: filePath,
        filename: targetFilename,
        platform,
        identified: true,
        isSupportedPlatform: true,
        matchedEntry,
        matchMethod,
        targetPath: destPath,
        crc32, md5, sha1, sha256,
        actionTaken: 'imported'
      });
    }

    return results;
  }

  /**
   * Verifies installed BIOS files against their stored sidecar checksums.
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
      let files: string[] = [];
      try {
        const entries = await readdir(platDir, { withFileTypes: true });
        files = entries.filter(e => e.isFile()).map(e => e.name);
      } catch {
        continue;
      }

      for (const fn of files) {
        const filePath = join(platDir, fn);
        const sha1Sidecar = join(platDir, 'checksum', `${fn}.sha1`);

        let expectedSha1: string | undefined;
        try {
          const sFile = Bun.file(sha1Sidecar);
          if (await sFile.exists()) {
            expectedSha1 = (await sFile.text()).trim();
          }
        } catch {}

        if (!expectedSha1) {
          const match = await handler.query({ filename: fn });
          if (match.matched && match.results[0]?.sha1) {
            expectedSha1 = match.results[0].sha1;
          }
        }

        const resList = await calculateFileHashes(filePath);
        const actualSha1 = resList[0]?.hashes?.sha1 || '';

        const isValid = expectedSha1 ? (actualSha1.toLowerCase() === expectedSha1.toLowerCase()) : true;

        reports.push({
          platform: plat,
          filename: fn,
          status: isValid ? 'valid' : 'corrupted',
          expectedSha1,
          foundSha1: actualSha1
        });
      }
    }

    return reports;
  }
}
