import type { GatewayHandler, DataRequest, IDataGateway } from './types';

export class HasheousHandler implements GatewayHandler {
  labels = ['remote', 'api', 'hasheous'];

  constructor(
    private apiKey: string | undefined,
    private gateway: IDataGateway
  ) {}

  async handle(req: DataRequest): Promise<any> {
    const endpoint = req.uri.replace(/^hasheous:\/\//, '');
    
    const headers: Record<string, string> = {
      'x-api-version': '1.0',
      'Accept': 'application/json',
      ...req.headers,
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    if (req.method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }

    const response: Response = await this.gateway.handle({
      uri: `https://hasheous.org/${endpoint}`,
      method: req.method || 'GET',
      headers,
      body: req.body ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : undefined,
    });

    return await response.json();
  }
}
