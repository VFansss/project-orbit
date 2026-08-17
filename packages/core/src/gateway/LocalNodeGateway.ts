import type { IDataGateway, DataRequest, GatewayHandler, GatewayMiddleware } from './types';
import { HttpHandler } from './HttpHandler';
import { LocalFsHandler } from './LocalFsHandler';

export class LocalNodeGateway implements IDataGateway {
  private handlers = new Map<string, GatewayHandler>();
  private middlewares: { prefixes: string[], middleware: GatewayMiddleware }[] = [];

  constructor() {
    // Register builtin handlers
    const httpHandler = new HttpHandler();
    this.registerHandler('http', httpHandler);
    this.registerHandler('https', httpHandler);
    this.registerHandler('file', new LocalFsHandler());
  }

  registerHandler(prefix: string, handler: GatewayHandler): void {
    this.handlers.set(prefix, handler);
  }

  useMiddleware(prefixes: string[], middleware: GatewayMiddleware): void {
    this.middlewares.push({ prefixes, middleware });
  }

  private parseRequest(req: DataRequest | string): DataRequest {
    if (typeof req === 'string') {
      return { uri: req };
    }
    return req;
  }

  private getPrefix(uri: string): string {
    const match = uri.match(/^([a-z0-9_-]+):\/\//i);
    if (!match) throw new Error(`Invalid URI format: ${uri}`);
    return match[1].toLowerCase();
  }

  private async executePipeline(req: DataRequest, isStream: boolean = false): Promise<any> {
    const prefix = this.getPrefix(req.uri);
    const handler = this.handlers.get(prefix);
    
    if (!handler) {
      throw new Error(`No handler registered for URI prefix: ${prefix}`);
    }

    // Build the middleware chain for this specific prefix
    const applicableMiddlewares = this.middlewares
      .filter(m => m.prefixes.includes(prefix) || m.prefixes.includes('*'))
      .map(m => m.middleware);

    let index = -1;

    const dispatch = async (currentReq: DataRequest): Promise<any> => {
      index++;
      if (index < applicableMiddlewares.length) {
        const middleware = applicableMiddlewares[index];
        // Check if middleware is ignored
        if (currentReq.ignoreLabels && middleware.labels.some(l => currentReq.ignoreLabels!.includes(l))) {
          return dispatch(currentReq);
        }
        return middleware.handle(currentReq, dispatch);
      } else {
        // Base handler
        if (isStream) {
          if (!handler.getStream) throw new Error(`Handler for ${prefix} does not support streaming.`);
          return handler.getStream(currentReq);
        }
        return handler.handle(currentReq);
      }
    };

    return dispatch(req);
  }

  public async request<T = any>(req: DataRequest | string): Promise<T> {
    const parsedReq = this.parseRequest(req);
    return this.executePipeline(parsedReq, false);
  }

  public async handle(req: DataRequest | string): Promise<any> {
    return this.request(req);
  }

  public async getStream(req: DataRequest | string): Promise<ReadableStream<Uint8Array>> {
    const parsedReq = this.parseRequest(req);
    return this.executePipeline(parsedReq, true);
  }
}
