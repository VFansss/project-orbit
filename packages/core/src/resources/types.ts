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

export interface BiosReferenceEntry {
  platform: string;
  filename: string;
  description: string;
  size: number;
  crc32?: string;
  md5?: string;
  sha1?: string;
}

export interface QueryParamDescriptor {
  key: string;
  label: string;
  description?: string;
}

export interface ResourceQueryResult {
  matched: boolean;
  results: any[];
}

export interface OrbitResourceHandler {
  definition: OrbitResourceDefinition;
  getDescriptors?(): QueryParamDescriptor[];
  query?(params: Record<string, any>): Promise<ResourceQueryResult>;
}
