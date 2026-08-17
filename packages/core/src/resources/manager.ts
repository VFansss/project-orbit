import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdir, readFile, writeFile, stat, rm } from 'node:fs/promises';

import { parse as parseToml } from 'smol-toml';
import type { 
  OrbitResourceDefinition, 
  OrbitResourceManifest, 
  OrbitResourceStatus 
} from './types';
import { biosResources, LibretroSystemBiosResourceHandler } from './definitions/bios';
import { Logger } from '../logger';
import type { OrbitConfig } from '../models/config';
import type { IDataGateway } from '../gateway/types';

export class ResourceManager {
  private definitions: Map<string, OrbitResourceDefinition> = new Map();

  constructor(private config: OrbitConfig, private gateway?: IDataGateway) {
    this.registerDefinitions(biosResources);
  }

  /**
   * Instantiates and retrieves the handler for a specific resource ID.
   */
  public getHandler<T = any>(id: string): T | null {
    const def = this.definitions.get(id);
    if (!def) return null;

    const resourceDir = this.getResourceDir(id, def.version || 'latest');

    if (id === 'libretro-system-bios') {
      return new LibretroSystemBiosResourceHandler(resourceDir) as unknown as T;
    }

    return null;
  }



  /**
   * Register a batch of resource definitions.
   */
  public registerDefinitions(defs: OrbitResourceDefinition[]): void {
    for (const def of defs) {
      this.definitions.set(def.id, def);
    }
  }

  /**
   * Resolves the root AppData directory for Orbit resources.
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
  public getResourceDir(resourceId: string, version?: string): string {
    const versionSubdir = version || 'latest';
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
      const file = Bun.file(manifestPath);
      if (await file.exists()) {
        manifest = await file.json();
        downloaded = true;
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

    // If resource is already downloaded and force is false, return current status
    if (status?.downloaded && !force) {
      Logger.debug(`Resource: ${def.name}`);
      Logger.debug(`License: ${def.license} (${def.licenseUrl})`);
      Logger.debug(`Version: ${status.manifest?.version || versionSubdir}`);
      if (status.manifest?.etag) Logger.debug(`ETag: ${status.manifest.etag}`);
      Logger.debug(`Path: ${resourceDir}`);
      return status;
    }

    Logger.debug(`Downloading resource "${def.name}"...`);
    Logger.debug(`Source: ${def.url}`);
    Logger.debug(`License: ${def.license} (${def.licenseUrl})`);


    await mkdir(resourceDir, { recursive: true });

    // Download payload via HTTP fetch
    const response = await fetch(def.url);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status} when downloading resource from ${def.url}`);
    }

    const etag = response.headers.get('etag') || undefined;
    const lastModified = response.headers.get('last-modified') || undefined;

    const rawData = await response.text();
    
    // Extract filename from URL (e.g. System.dat)
    const urlParts = def.url.split('/');
    const fileName = urlParts[urlParts.length - 1] || 'resource.data';
    const filePath = join(resourceDir, fileName);

    await Bun.write(filePath, rawData);

    const manifest: OrbitResourceManifest = {
      id: def.id,
      version: versionSubdir,
      downloadedAt: new Date().toISOString(),
      etag,
      lastModified
    };

    await Bun.write(join(resourceDir, 'manifest.json'), JSON.stringify(manifest, null, 2));


    Logger.info(`Resource saved successfully at ${resourceDir}`);

    return {
      definition: def,
      downloaded: true,
      localPath: resourceDir,
      manifest
    };
  }

  /**
   * Purges / deletes local downloaded resource files from disk.
   */
  public async purgeResource(id?: string): Promise<string[]> {
    const purgedIds: string[] = [];
    if (id) {
      const def = this.definitions.get(id);
      const targetDir = join(this.getResourcesRootDir(), id);
      await rm(targetDir, { recursive: true, force: true });
      purgedIds.push(id);
      Logger.info(`Purged local resource "${def?.name || id}" at ${targetDir}`);
    } else {
      const rootDir = this.getResourcesRootDir();
      await rm(rootDir, { recursive: true, force: true });
      Logger.info(`Purged all local external resources at ${rootDir}`);
    }
    return purgedIds;
  }
}
