import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useCaseTypeLabels } from "@/types/use-case";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Use Cases</h1>
        <Button 
          onClick={() => navigate("/admin/use-cases/create")}
          size="lg"
          className="bg-avanti-500 hover:bg-avanti-600"
        >
          Neuen Use Case anlegen
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-4 text-muted-foreground">
          Lade Daten…
        </div>
      )}
      
      {error && (
        <div className="text-center py-4 text-red-500">
          Fehler: {(error as any).message}
        </div>
      )}

      {data && (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Titel</TableHead>
                <TableHead className="font-semibold">Typ</TableHead>
                <TableHead className="font-semibold">Aktiv</TableHead>
                <TableHead className="font-semibold">Erstellt am</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((uc: any) => (
                <TableRow 
                  key={uc.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/admin/use-cases/${uc.id}`)}
                >
                  <TableCell className="font-medium">{uc.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {useCaseTypeLabels[uc.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${uc.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                      {uc.is_active ? "Ja" : "Nein"}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(uc.created_at).toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
