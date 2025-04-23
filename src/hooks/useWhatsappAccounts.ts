
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WhatsappAccount = {
  id: string;
  customer_id: string;
  name?: string | null;
  pphone_number?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const useWhatsappAccounts = () => {
  const [accounts, setAccounts] = useState<WhatsappAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("whatsapp_accounts")
        .select("*");
      
      if (fetchError) {
        console.error("Fehler beim Laden von WhatsApp-Konten:", fetchError);
        setError(fetchError.message);
      } else if (data) {
        setAccounts(data);
      } else {
        setAccounts([]);
      }
    } catch (err) {
      console.error("Unerwarteter Fehler beim Laden der Konten:", err);
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return { accounts, loading, error, refetch: fetchAccounts };
};
