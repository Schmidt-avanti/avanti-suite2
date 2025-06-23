declare module "https://esm.sh/@supabase/supabase-js@*" {
  export class SupabaseClient {
    from: (table: string) => any;
    auth: any;
    storage: any;
    rpc: any;
  }

  export function createClient(
    url: string, 
    key: string, 
    options?: any
  ): SupabaseClient;
}

export {};
