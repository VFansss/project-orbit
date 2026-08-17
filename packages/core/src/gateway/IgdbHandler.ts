import type { GatewayHandler, DataRequest, IDataGateway } from './types';

export class IgdbHandler implements GatewayHandler {
  labels = ['remote', 'api', 'igdb'];

  constructor(
    private clientId: string,
    private clientSecret: string,
    private gateway: IDataGateway
  ) {}

  private async getAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error(`IGDB Credentials missing. Set igdb_client_id and igdb_client_secret in orbit.config.toml.`);
    }

    const url = `https://id.twitch.tv/oauth2/token?client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=client_credentials`;
    try {
      const response: Response = await this.gateway.handle({ uri: url, method: 'POST' });
      const data = await response.json() as any;
      if (!data.access_token) {
        throw new Error(`Invalid authentication response from Twitch OAuth.`);
      }
      return data.access_token;
    } catch (err: any) {
      throw new Error(`IGDB Twitch OAuth authentication failed: ${err.message}`);
    }
  }

  async handle(req: DataRequest): Promise<any> {
    const token = await this.getAccessToken();
    const endpoint = req.uri.replace(/^igdb:\/\//, '');
    
    const response: Response = await this.gateway.handle({
      uri: `https://api.igdb.com/v4/${endpoint}`,
      method: req.method || 'POST',
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        ...req.headers,
      },
      body: req.body,
    });

    return await response.json();
  }
}
