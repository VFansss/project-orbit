import type { GatewayHandler, DataRequest } from './types';
import { version } from '../index';
import { Logger } from '../logger';

export class HttpHandler implements GatewayHandler {
  labels = ['remote', 'http', 'network'];

  async handle(req: DataRequest): Promise<any> {
    const method = req.method || 'GET';
    const uri = req.uri;

    const headers: Record<string, string> = {
      'User-Agent': `OrbitApp/${version} (https://github.com/VFansss/project-orbit)`,
      'Accept': '*/*',
      ...req.headers,
    };

    const startTime = performance.now();
    Logger.debug(`[HTTP] ${method} ${uri}`);

    try {
      const response = await fetch(uri, {
        method,
        headers,
        body: req.body ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : undefined,
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (!response.ok) {
        const errorText = await response.text();
        Logger.debug(`[HTTP Error] ${method} ${uri} -> ${response.status} ${response.statusText} (${elapsed}ms)`);

        // Dump raw response headers and body in DEBUG mode
        const rawHeaders: string[] = [];
        response.headers.forEach((val, key) => {
          rawHeaders.push(`${key}: ${val}`);
        });

        if (rawHeaders.length > 0) {
          Logger.debug(`[HTTP Response Headers]\n  ${rawHeaders.join('\n  ')}`);
        }
        if (errorText.trim()) {
          Logger.debug(`[HTTP Response Body]\n  ${errorText.trim()}`);
        }

        throw new Error(`HTTP error ${response.status} (${response.statusText}): ${errorText.trim()}`);
      }

      Logger.debug(`[HTTP OK] ${method} ${uri} -> ${response.status} (${elapsed}ms)`);
      return response;
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      if (!err.message?.startsWith('HTTP error')) {
        Logger.debug(`[HTTP Fail] ${method} ${uri} -> ${err.message} (${elapsed}ms)`);
      }
      throw err;
    }
  }
}
