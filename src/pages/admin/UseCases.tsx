
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";

const fetchUseCases = async () => {
  const { data, error } = await supabase
    .from("use_cases")
    .select("id, title, type, created_at, is_active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export default function UseCasesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["use_cases"],
    queryFn: fetchUseCases,
  });
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Use Cases</h1>
        <Button onClick={() => navigate("/admin/use-cases/create")}>
          Neuen Use Case anlegen
        </Button>
      </div>

      {isLoading && <div>Lade Daten…</div>}
      {error && <div className="text-red-500">Fehler: {(error as any).message}</div>}

      {data && (
        <Table>
          <thead>
            <tr>
              <th>Titel</th>
              <th>Typ</th>
              <th>Aktiv</th>
              <th>Erstellt am</th>
            </tr>
          </thead>
          <tbody>
            {data.map((uc: any) => (
              <tr key={uc.id}>
                <td>{uc.title}</td>
                <td>{uc.type}</td>
                <td>
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${uc.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                  {uc.is_active ? "Ja" : "Nein"}
                </td>
                <td>{new Date(uc.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
