
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText } from "lucide-react";

export default function UseCasesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["use_cases"],
    queryFn: async () => {
      const { data: useCases, error: useCasesError } = await supabase
        .from("use_cases")
        .select(`
          id, 
          title, 
          type, 
          created_at, 
          is_active,
          knowledge_articles (
            id
          )
        `)
        .order("created_at", { ascending: false });
      
      if (useCasesError) throw useCasesError;
      return useCases;
    },
  });
  const navigate = useNavigate();

  return (
    <div className="section-spacing">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-2xl">Use Cases</CardTitle>
          <Button 
            onClick={() => navigate("/admin/use-cases/create")}
            size="sm"
            className="bg-avanti-500 hover:bg-avanti-600"
          >
            <Plus className="h-5 w-5" />
            <span>Neuen Use Case anlegen</span>
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading && (
            <div className="text-center py-6 text-muted-foreground">
              Lade Daten…
            </div>
          )}
          
          {error && (
            <div className="text-center py-6 text-red-500">
              Fehler: {(error as any).message}
            </div>
          )}

          {data && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-medium text-foreground">Titel</TableHead>
                    <TableHead className="font-medium text-foreground">Typ</TableHead>
                    <TableHead className="font-medium text-foreground">Status</TableHead>
                    <TableHead className="font-medium text-foreground">Wissensartikel</TableHead>
                    <TableHead className="font-medium text-foreground">Erstellt am</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((uc: any) => (
                    <TableRow 
                      key={uc.id}
                      className="cursor-pointer hover:bg-gray-50 group"
                      onClick={() => navigate(`/admin/use-cases/${uc.id}`)}
                    >
                      <TableCell className="font-medium group-hover:text-primary transition-colors">{uc.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {useCaseTypeLabels[uc.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${uc.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                          <span>{uc.is_active ? "Aktiv" : "Inaktiv"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {uc.knowledge_articles?.length > 0 ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <FileText className="h-4 w-4" />
                            <span>Vorhanden</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Nicht vorhanden</span>
                        )}
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
        </CardContent>
      </Card>
    </div>
  );
}
