import { join } from 'node:path';
import { mkdir, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import type { OrbitConfig } from '../models/config';
import type { OrbitResourceDefinition, OrbitResourceStatus, OrbitResourceManifest } from './types';
import { LibretroSystemBiosResourceHandler } from './definitions/libretro-system-bios';
import { Logger } from '../logger';
import { version } from '../index';
import type { IDataGateway } from '../gateway/types';
import { LocalNodeGateway } from '../gateway/LocalNodeGateway';

export class ResourceManager {
  private definitions: Map<string, OrbitResourceDefinition> = new Map();
  private handlers: Map<string, any> = new Map();
  private gateway: IDataGateway;

  constructor(private config: OrbitConfig, gateway?: IDataGateway) {
    this.gateway = gateway || new LocalNodeGateway();
    this.registerBuiltinResources();
  }

  /**
   * Registers default internal resource definitions (DAT files, indexes, schemas).
   */
  private registerBuiltinResources() {
    this.registerResource({
      id: 'libretro-system-bios',
      name: 'Libretro System BIOS DAT',
      description: 'Official Libretro / RetroArch System BIOS DAT containing SHA1, MD5, and CRC32 checksums for firmware identification',
      url: 'https://raw.githubusercontent.com/libretro/libretro-database/master/dat/System.dat',
      format: 'clrmamepro',
      version: 'latest',
      license: 'CC-BY-SA 4.0',
      licenseUrl: 'https://github.com/libretro/libretro-database/blob/master/LICENSE',
      tags: ['#bios', '#firmware', '#libretro', '#dat']
    }, new LibretroSystemBiosResourceHandler());
  }

  /**
   * Registers a new resource definition and optional handler.
   */
  public registerResource(def: OrbitResourceDefinition, handler?: any) {
    this.definitions.set(def.id, def);
    if (handler) {
      this.handlers.set(def.id, handler);
      handler.initialize?.(this, def);
    }
  }

  /**
   * Gets root path for storing downloaded Orbit resources.
   */
  public getResourcesRootDir(): string {
    const baseDir = process.env.APPDATA 
      || process.env.XDG_DATA_HOME 
      || join(homedir(), '.orbit');
    return join(baseDir, 'orbit', 'resources');
  }

  /**
   * Resolves local storage directory for a specific resource version.
   */
  public getResourceDir(resourceId: string, versionId?: string): string {
    const versionSubdir = versionId || 'latest';
    return join(this.getResourcesRootDir(), resourceId, versionSubdir);
  }

  /**
   * Retrieves the status of a specific resource.
   */
  public async getStatus(id: string): Promise<OrbitResourceStatus | null> {
    const def = this.definitions.get(id);
    if (!def) return null;

    const versionSubdir = def.version || 'latest';
    const resourceDir = this.getResourceDir(id, versionSubdir);
    const manifestPath = join(resourceDir, 'manifest.json');
    
    let downloaded = false;
    let manifest: OrbitResourceManifest | null = null;

    try {
      const manifestFile = Bun.file(manifestPath);
      if (await manifestFile.exists()) {
        manifest = await manifestFile.json();
        downloaded = true;
      } else {
        // Fallback: Check if payload file exists on disk even if manifest is missing
        const urlParts = def.url.split('/');
        const fileName = urlParts[urlParts.length - 1] || 'resource.data';
        const payloadFile = Bun.file(join(resourceDir, fileName));
        if (await payloadFile.exists()) {
          downloaded = true;
        }
      }
    } catch {
      downloaded = false;
    }

    return {
      definition: def,
      downloaded,
      localPath: resourceDir,
      manifest
    };
  }

  /**
   * Lists all registered resources, optionally filtered by tag.
   */
  public async listResources(tagFilter?: string | string[]): Promise<OrbitResourceStatus[]> {
    const list: OrbitResourceStatus[] = [];

    let targetTags: string[] = [];
    if (typeof tagFilter === 'string') {
      targetTags = tagFilter.split(',').map(t => t.trim().toLowerCase().replace(/^#/, ''));
    } else if (Array.isArray(tagFilter)) {
      targetTags = tagFilter.map(t => t.trim().toLowerCase().replace(/^#/, ''));
    }

    for (const def of this.definitions.values()) {
      if (targetTags.length > 0) {
        const defTags = def.tags.map(t => t.toLowerCase().replace(/^#/, ''));
        const matches = targetTags.some(t => defTags.includes(t));
        if (!matches) continue;
      }

      const status = await this.getStatus(def.id);
      if (status) list.push(status);
    }

    return list;
  }

  /**
   * Fetches/updates a resource via HTTP gateway if not downloaded or if forced.
   */
  public async fetchResource(
    id: string, 
    force = false,
    onProgress?: (bytes: number, total: number) => void
  ): Promise<OrbitResourceStatus> {
    const def = this.definitions.get(id);
    if (!def) throw new Error(`Resource "${id}" is not registered.`);

    const versionSubdir = def.version || 'latest';
    const resourceDir = this.getResourceDir(id, versionSubdir);
    const status = await this.getStatus(id);

    // If resource is already downloaded and force is false, return current status silently
    if (status?.downloaded && !force) {
      Logger.debug(`Resource: ${def.name}`);
      Logger.debug(`License: ${def.license} (${def.licenseUrl})`);
      Logger.debug(`Version: ${status.manifest?.version || versionSubdir}`);
      if (status.manifest?.etag) Logger.debug(`ETag: ${status.manifest.etag}`);
      Logger.debug(`Path: ${resourceDir}`);
      return status;
    }

    const urlParts = def.url.split('/');
    const fileName = urlParts[urlParts.length - 1] || 'resource.data';
    const filePath = join(resourceDir, fileName);
    const payloadFile = Bun.file(filePath);

    // Prominent INFO notification when required resource is missing or being downloaded
    Logger.info(`Downloading required system resource "${def.name}"...`);
    Logger.info(`Source URL: ${def.url}`);
    Logger.info(`License: ${def.license} (${def.licenseUrl})`);

    await mkdir(resourceDir, { recursive: true });

    try {
      // Route request through IDataGateway (HttpHandler choke-point)
      const response: Response = await this.gateway.handle({
        uri: def.url,
        method: 'GET'
      });

      const etag = response.headers.get('etag') || undefined;
      const lastModified = response.headers.get('last-modified') || undefined;
      const rawData = await response.text();

      await Bun.write(filePath, rawData);

      const manifest: OrbitResourceManifest = {
        id: def.id,
        version: versionSubdir,
        downloadedAt: new Date().toISOString(),
        etag,
        lastModified
      };

      await Bun.write(join(resourceDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
      Logger.info(`[✓] Successfully downloaded and cached "${def.name}".`);
    } catch (err: any) {
      // If error occurs during fetch (network error, rate limit 429) and file does NOT exist, EXPLODE immediately!
      if (!(await payloadFile.exists())) {
        throw new Error(`CRITICAL: Failed to download required resource "${def.name}": ${err.message}`);
      }
      Logger.warn(`Fetch error: ${err.message}. Falling back to cached local file at ${filePath}`);
      return {
        definition: def,
        downloaded: true,
        localPath: resourceDir
      };
    }

    return {
      definition: def,
      downloaded: true,
      localPath: resourceDir
    };
  }

  /**
   * Retrieves specific registered resource handler instance.
   */
  public getHandler<T = any>(id: string): T | undefined {
    return this.handlers.get(id);
  }
}
