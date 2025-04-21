
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types";

export function useFetchCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase
      .from("customers")
      .select("id, name, created_at")
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setError(error.message);
          setCustomers([]);
        } else {
          setCustomers(
            (data ?? []).map((row) => ({
              id: row.id,
              name: row.name,
              createdAt: row.created_at,
            }))
          );
        }
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { customers, loading, error };
}
