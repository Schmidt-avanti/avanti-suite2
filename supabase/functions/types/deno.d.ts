declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): { [key: string]: string };
  }
  
  export const env: Env;
  
  export interface ConnInfo {
    localAddr: Deno.Addr;
    remoteAddr: Deno.Addr;
  }
  
  export interface Addr {
    transport: "tcp" | "udp";
    hostname: string;
    port: number;
  }
}
