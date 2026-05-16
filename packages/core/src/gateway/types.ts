export interface DataRequest {
  uri: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  ignoreLabels?: string[];
}

export interface GatewayHandler {
  labels: string[];
  handle(req: DataRequest): Promise<any>;
  getStream?(req: DataRequest): Promise<ReadableStream>;
}

export interface GatewayMiddleware {
  labels: string[];
  handle(req: DataRequest, next: (req: DataRequest) => Promise<any>): Promise<any>;
}

export interface IDataGateway {
  request<T>(req: DataRequest | string): Promise<T>;
  getStream(req: DataRequest | string): Promise<ReadableStream>;
  
  registerHandler(prefix: string, handler: GatewayHandler): void;
  useMiddleware(prefixes: string[], middleware: GatewayMiddleware): void;
}
