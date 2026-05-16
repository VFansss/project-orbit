import type { GatewayHandler, DataRequest } from '../../gateway/types';

export class HasheousApiHandler implements GatewayHandler {
  labels = ['remote', 'api', 'hasheous'];

  constructor(private apiKey: string) {}

  async handle(req: DataRequest): Promise<any> {
    const endpoint = req.uri.replace(/^hasheous:\/\//, '');
    
    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      'x-api-version': '1.0',
      'Accept': 'application/json',
      ...req.headers,
    };

    if (req.method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`https://hasheous.org/${endpoint}`, {
      method: req.method || 'GET',
      headers,
      body: req.body ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hasheous API request failed: ${errorText}`);
    }

    return await response.json();
  }
}
