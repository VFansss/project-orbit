import type { GatewayHandler, DataRequest } from './types';

export class IgdbHandler implements GatewayHandler {
  labels = ['remote', 'api', 'igdb'];

  constructor(private clientId: string, private clientSecret: string) {}

  private async getAccessToken(): Promise<string> {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=client_credentials`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) throw new Error(`IGDB Authentication failed.`);
    const data = await response.json() as any;
    return data.access_token;
  }

  async handle(req: DataRequest): Promise<any> {
    const token = await this.getAccessToken();
    const endpoint = req.uri.replace(/^igdb:\/\//, '');
    
    const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
      method: req.method || 'POST',
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        ...req.headers,
      },
      body: req.body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IGDB API request failed: ${errorText}`);
    }

    return await response.json();
  }
}
