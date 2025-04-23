
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

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_accounts")
      .select("*");
    if (!error && data) {
      setAccounts(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return { accounts, loading, refetch: fetchAccounts };
};
