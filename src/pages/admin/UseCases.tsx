
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
import { Edit, Plus, Trash, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { UseCaseEditDialog } from "@/components/use-cases/UseCaseEditDialog";
import { UpdateEmbeddingsButton } from "@/components/use-cases/UpdateEmbeddingsButton";
import CreateKnowledgeArticleButton from "@/components/knowledge-articles/CreateKnowledgeArticleButton";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function UseCases() {
  const [open, setOpen] = React.useState(false);
  const [selectedUseCase, setSelectedUseCase] = React.useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [useCaseToDelete, setUseCaseToDelete] = React.useState(null);
  const [hasRelatedData, setHasRelatedData] = React.useState({
    hasArticles: false,
    hasTasks: false
  });
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

  const checkRelatedData = async (useCaseId) => {
    // Check for related knowledge articles
    const { data: articlesData, error: articlesError } = await supabase
      .from("knowledge_articles")
      .select("id")
      .eq("use_case_id", useCaseId);

    if (articlesError) {
      console.error("Error checking related articles:", articlesError);
    }
    
    // Check for related tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .select("id")
      .eq("matched_use_case_id", useCaseId);

    if (tasksError) {
      console.error("Error checking related tasks:", tasksError);
    }
    
    return {
      hasArticles: articlesData && articlesData.length > 0,
      hasTasks: tasksData && tasksData.length > 0
    };
  };

  const handleDeleteClick = async (useCase) => {
    setUseCaseToDelete(useCase);
    
    const relatedData = await checkRelatedData(useCase.id);
    setHasRelatedData(relatedData);
    setDeleteDialogOpen(true);
  };

  const { mutateAsync: deleteUseCase } = useMutation({
    mutationFn: async (id: string) => {
      // Use the new database function to handle cascade deletion
      const { error } = await supabase.rpc('delete_use_case_cascade', { use_case_id_param: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["use_cases"] });
      toast.success("Use Case erfolgreich gelöscht");
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
      setDeleteDialogOpen(false);
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
                <TableCell className="max-w-[300px] truncate">{useCase.title}</TableCell>
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
                    onClick={() => handleDeleteClick(useCase)}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertCircle className="text-red-500 mr-2 h-5 w-5" />
              Use Case löschen
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {(hasRelatedData.hasArticles || hasRelatedData.hasTasks) ? (
                <>
                  <p>Dieser Use Case hat:</p>
                  <ul className="list-disc pl-5">
                    {hasRelatedData.hasArticles && (
                      <li>Verknüpfte Wissensartikel, deren Verknüpfung aufgehoben wird</li>
                    )}
                    {hasRelatedData.hasTasks && (
                      <li>Verknüpfte Aufgaben, deren Verknüpfung aufgehoben wird</li>
                    )}
                  </ul>
                  <p>
                    Beim Löschen bleiben die Artikel und Aufgaben erhalten, 
                    aber die Verknüpfungen werden aufgehoben. Möchten Sie fortfahren?
                  </p>
                </>
              ) : (
                <p>
                  Sind Sie sicher, dass Sie diesen Use Case löschen möchten? 
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => useCaseToDelete && deleteUseCase(useCaseToDelete.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
