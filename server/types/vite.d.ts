// Custom type declarations to resolve Vite allowedHosts compatibility
declare module 'vite' {
  export interface ServerOptions {
    middlewareMode?: boolean;
    hmr?: {
      server?: any;
    };
    allowedHosts?: boolean | true | string[] | undefined;
  }
}