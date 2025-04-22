
import React from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { UseCaseEditDialog } from "@/components/use-cases/UseCaseEditDialog";
import { UpdateEmbeddingsButton } from "@/components/use-cases/UpdateEmbeddingsButton";
import CreateKnowledgeArticleButton from "@/components/knowledge-articles/CreateKnowledgeArticleButton";

export default function UseCases() {
  const [open, setOpen] = React.useState(false);
  const [selectedUseCase, setSelectedUseCase] = React.useState(null);
  const queryClient = useQueryClient();

  const { data: useCases = [], isLoading } = useQuery({
    queryKey: ["use_cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("use_cases")
        .select("*, knowledge_articles(id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { mutateAsync: deleteUseCase } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("use_cases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["use_cases"] });
      toast.success("Use Case erfolgreich gelöscht");
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Use Cases</h1>
        <div className="flex gap-4">
          <UpdateEmbeddingsButton />
          <Button asChild>
            <Link to="/admin/use-cases/create">
              <Plus className="mr-2 h-4 w-4" />
              Neu erstellen
            </Link>
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titel</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Wissensartikel</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : useCases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                Keine Use Cases gefunden.
              </TableCell>
            </TableRow>
          ) : (
            useCases.map((useCase) => (
              <TableRow key={useCase.id}>
                <TableCell>{useCase.title}</TableCell>
                <TableCell>{useCase.type}</TableCell>
                <TableCell>
                  {useCase.knowledge_articles && useCase.knowledge_articles.length > 0 ? (
                    <span className="text-green-600 font-medium">Vorhanden</span>
                  ) : (
                    <CreateKnowledgeArticleButton useCaseId={useCase.id} />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedUseCase(useCase);
                      setOpen(true);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Bearbeiten
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteUseCase(useCase.id)}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Löschen
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <UseCaseEditDialog
        open={open}
        onOpenChange={setOpen}
        useCase={selectedUseCase}
      />
    </div>
  );
}
