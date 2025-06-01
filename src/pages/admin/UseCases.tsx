
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

// Hook to access and use the global search field
const useGlobalSearch = () => {
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    // Get the global search input element
    const globalSearchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
    
    if (globalSearchInput) {
      // Set initial value from global search if it exists
      if (globalSearchInput.value) {
        setSearchQuery(globalSearchInput.value);
      }
      
      // Add event listener to update our state when global search changes
      const handleSearchChange = (e: Event) => {
        setSearchQuery((e.target as HTMLInputElement).value);
      };
      
      globalSearchInput.addEventListener('input', handleSearchChange);
      
      // Clean up event listener on unmount
      return () => {
        globalSearchInput.removeEventListener('input', handleSearchChange);
      };
    }
  }, []);
  
  return { searchQuery };
};

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
  
  // Use the global search field
  const { searchQuery } = useGlobalSearch();

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

  // Filter and score use cases based on search query
  const filteredUseCases = React.useMemo(() => {
    if (!searchQuery.trim()) return useCases;
    
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const searchTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 1);
    
    // If no valid search terms, return all use cases
    if (searchTerms.length === 0) return useCases;
    
    // Calculate a relevance score for each use case
    const scoredUseCases = useCases.map(useCase => {
      let score = 0;
      let matches = false;
      
      // Function to check and score matches in a field
      const scoreField = (fieldValue: string | null | undefined, fieldWeight: number) => {
        if (!fieldValue) return 0;
        
        const normalizedField = fieldValue.toLowerCase();
        let fieldScore = 0;
        
        // Check for exact matches of each search term
        for (const term of searchTerms) {
          // Exact match as a whole word
          const wholeWordRegex = new RegExp(`\\b${term}\\b`, 'i');
          if (wholeWordRegex.test(normalizedField)) {
            fieldScore += fieldWeight * 2;
            matches = true;
          }
          // Partial match
          else if (normalizedField.includes(term)) {
            fieldScore += fieldWeight;
            matches = true;
          }
          
          // Bonus for matches in the beginning of the field
          if (normalizedField.indexOf(term) === 0) {
            fieldScore += fieldWeight * 0.5;
          }
        }
        
        // Bonus for exact match of the entire query
        if (normalizedField.includes(normalizedQuery)) {
          fieldScore += fieldWeight * 1.5;
        }
        
        return fieldScore;
      };
      
      // Score different fields with different weights
      score += scoreField(useCase.title, 10);              // Title is most important
      score += scoreField(useCase.type, 8);                // Type is very important
      score += scoreField(useCase.expected_result, 6);     // Expected result is important
      score += scoreField(useCase.information_needed, 5);  // Information needed is somewhat important
      score += scoreField(useCase.steps, 4);               // Steps are somewhat important
      score += scoreField(useCase.typical_activities, 3);  // Activities are less important
      score += scoreField(useCase.next_question, 3);       // Next question is less important
      
      // Score chat_response if it's stringifiable
      try {
        if (useCase.chat_response) {
          const chatResponseStr = typeof useCase.chat_response === 'string' 
            ? useCase.chat_response 
            : JSON.stringify(useCase.chat_response);
          score += scoreField(chatResponseStr, 2);  // Chat response is least important
        }
      } catch (e) {
        // Ignore errors in JSON stringification
      }
      
      return { useCase, score, matches };
    });
    
    // Filter to only cases with matches and sort by score (highest first)
    return scoredUseCases
      .filter(item => item.matches)
      .sort((a, b) => b.score - a.score)
      .map(item => item.useCase);
  }, [useCases, searchQuery]);

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
      {/* Display search results count when searching */}
      {searchQuery && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredUseCases.length} Ergebnisse für "{searchQuery}"
          </p>
        </div>
      )}
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
          ) : filteredUseCases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                {searchQuery ? `Keine Use Cases für "${searchQuery}" gefunden.` : 'Keine Use Cases gefunden.'}
              </TableCell>
            </TableRow>
          ) : (
            filteredUseCases.map((useCase) => (
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
