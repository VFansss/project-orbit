import type { GatewayHandler, DataRequest } from './types';
import { readFile } from 'node:fs/promises';

export class LocalFsHandler implements GatewayHandler {
  labels = ['local', 'fs'];

  async handle(req: DataRequest): Promise<any> {
    const path = req.uri.replace(/^file:\/\//, '');
    try {
      const content = await readFile(path, 'utf-8');
      return content;
    } catch (e: any) {
      throw new Error(`Failed to read file ${path}: ${e.message}`);
    }
  }
}
