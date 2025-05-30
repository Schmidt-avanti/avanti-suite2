declare module "https://esm.sh/@supabase/supabase-js@*" {
  export function createClient(
    url: string, 
    key: string, 
    options?: any
  ): {
    from: (table: string) => any;
    auth: any;
    storage: any;
    rpc: any;
  };
}
