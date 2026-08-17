import { join } from 'node:path';
import type { 

  OrbitResourceDefinition, 
  OrbitResourceHandler, 
  BiosReferenceEntry,
  QueryParamDescriptor,
  ResourceQueryResult
} from '../types';
import { ClrMameProParser } from '../parsers/clrmamepro';

export const LIBRETRO_SYSTEM_BIOS_DEFINITION: OrbitResourceDefinition = {
  id: 'libretro-system-bios',
  name: 'Libretro System BIOS DAT',
  description: 'Official Libretro / RetroArch BIOS DAT file containing system firmware checksums (CRC32, MD5, SHA1)',
  type: 'data',
  tags: ['#bios', '#data', '#libretro'],
  url: 'https://raw.githubusercontent.com/libretro/libretro-database/master/dat/System.dat',
  license: 'CC-BY-SA 4.0',
  licenseUrl: 'https://github.com/libretro/libretro-database/blob/master/LICENSE',
  version: 'latest'
};

export class LibretroSystemBiosResourceHandler implements OrbitResourceHandler {
  public readonly definition = LIBRETRO_SYSTEM_BIOS_DEFINITION;
  private entriesCache: BiosReferenceEntry[] | null = null;
  private localResourceDir?: string;

  constructor(localResourceDir?: string) {
    this.localResourceDir = localResourceDir;
  }

  public initialize(manager: any, def: OrbitResourceDefinition) {
    this.localResourceDir = manager.getResourceDir(def.id, def.version);
  }

  /**
   * Reads and parses System.dat from local AppData resource directory.
   */
  public async loadEntries(): Promise<BiosReferenceEntry[]> {
    if (this.entriesCache) return this.entriesCache;

    const datPath = join(this.localResourceDir, 'System.dat');
    try {
      const file = Bun.file(datPath);
      if (!(await file.exists())) return [];
      const rawContent = await file.text();
      this.entriesCache = ClrMameProParser.parseSystemBiosDat(rawContent);
      return this.entriesCache;
    } catch {
      return [];
    }

  }

  /**
   * Looks up a BIOS entry by hash (CRC32, MD5, or SHA1, case-insensitive).
   */
  public async lookupByHash(hash: string): Promise<BiosReferenceEntry | null> {
    const entries = await this.loadEntries();
    const normalized = hash.trim().toLowerCase();

    for (const entry of entries) {
      if (
        (entry.sha1 && entry.sha1.toLowerCase() === normalized) ||
        (entry.md5 && entry.md5.toLowerCase() === normalized) ||
        (entry.crc32 && entry.crc32.toLowerCase() === normalized)
      ) {
        return entry;
      }

    }
    return null;
  }

  /**
   * Retrieves all known BIOS entries for a specific platform (e.g. 'ps1', 'gba').
   */
  public async getHashesByPlatform(platform: string): Promise<BiosReferenceEntry[]> {
    const entries = await this.loadEntries();
    const targetPlatform = platform.trim().toLowerCase();
    return entries.filter(e => e.platform.toLowerCase() === targetPlatform);
  }

  /**
   * Describes supported CLI query parameter inputs.
   */
  public getDescriptors(): QueryParamDescriptor[] {
    return [
      { key: 'hash', label: 'Checksum (CRC32, MD5, SHA1)', description: 'Match firmware by hash' },
      { key: 'platform', label: 'Platform name (e.g. ps1, gba)', description: 'Filter firmware entries by system' },
      { key: 'filename', label: 'Firmware filename', description: 'Search by exact or partial filename' }
    ];
  }

  /**
   * Elastic query handler for CLI and dynamic invocations.
   */
  public async query(params: Record<string, any>): Promise<ResourceQueryResult> {
    const entries = await this.loadEntries();

    if (params.hash) {
      const match = await this.lookupByHash(String(params.hash));
      return {
        matched: !!match,
        results: match ? [match] : []
      };
    }

    if (params.platform) {
      const results = await this.getHashesByPlatform(String(params.platform));
      return {
        matched: results.length > 0,
        results
      };
    }

    if (params.filename || params.name) {
      const queryName = String(params.filename || params.name).toLowerCase();
      const results = entries.filter(e => e.filename.toLowerCase().includes(queryName));
      return {
        matched: results.length > 0,
        results
      };
    }

    return { matched: false, results: [] };
  }
}
