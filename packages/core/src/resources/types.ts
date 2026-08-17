export type ResourceType = 'data' | 'tool' | 'emulator';

export interface OrbitResourceDefinition {
  id: string;
  name: string;
  description?: string;
  type: ResourceType;
  tags: string[];
  url: string;
  license: string;
  licenseUrl: string;
  version?: string;
}

export interface OrbitResourceManifest {
  id: string;
  version: string;
  downloadedAt: string;
  etag?: string;
  lastModified?: string;
}

export interface OrbitResourceStatus {
  definition: OrbitResourceDefinition;
  downloaded: boolean;
  localPath: string;
  manifest: OrbitResourceManifest | null;
}
