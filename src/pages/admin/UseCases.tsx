
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Verwende any für JSON-Daten
type Json = any;
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

import { CustomerFilter } from "@/components/payments/CustomerFilter";
import { useCustomers } from "@/hooks/useCustomers";

// Vereinfachte Typen für Use Cases
type UseCase = {
  id: string;
  title: string;
  type: string;
  created_at: string;
  created_by: string;
  customer_id: string;
  expected_result: string;
  information_needed: string;
  steps: string;
  typical_activities: string;
  next_question: string;
  chat_response: Json;
  decision_logic: Json[];
  embedding: string | null;
  knowledge_articles: { id: string }[];
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
  const [showMissingArticlesOnly, setShowMissingArticlesOnly] = React.useState(false);
  const [sortConfig, setSortConfig] = React.useState({
    key: 'created_at',
    direction: 'desc'
  });
  const queryClient = useQueryClient();
  
  // Use the global search field
  const { searchQuery } = useGlobalSearch();

  const { user } = useAuth();

  // Kundenliste holen (auch für Agenten/Kunden korrekt)
  const { customers, isLoading: isCustomersLoading } = useCustomers();

  // selectedCustomer: Für Kunden = ihr customer_id, sonst erster Kunde oder 'all'
  const initialCustomerId = React.useMemo(() => {
    if (user?.role === "customer" && customers.length > 0) {
      return customers[0].id;
    } else if (customers.length > 0) {
      return customers[0].id;
    }
    return "";
  }, [user, customers]);

  const [selectedCustomer, setSelectedCustomer] = React.useState<string>("");

  // selectedCustomer initial setzen, wenn Kunden geladen
  React.useEffect(() => {
    if (!selectedCustomer && initialCustomerId) {
      setSelectedCustomer(initialCustomerId);
    }
  }, [initialCustomerId, selectedCustomer]);

  const { data: useCases = [], isLoading } = useQuery<UseCase[]>({
    queryKey: ["use_cases", selectedCustomer],
    queryFn: async () => {
      try {
        let query = supabase
          .from("use_cases")
          .select("*, knowledge_articles(id)")
          .order("created_at", { ascending: false });
        if (selectedCustomer && selectedCustomer !== "all") {
          query = query.eq("customer_id", selectedCustomer);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data as UseCase[];
      } catch (error) {
        console.error("Error in use cases query:", error);
        throw error;
      }
    },
    enabled: !!selectedCustomer,
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

  // Mutation zum Erstellen von Embeddings
  const createEmbeddingMutation = useMutation({
    mutationFn: async (useCaseId: string) => {
      // API-Aufruf zum Erstellen des Embeddings mit der korrekten Edge Function
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: JSON.stringify({ useCaseIds: [useCaseId] })
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["use_cases"] });
      toast.success("Embedding erfolgreich erstellt", {
        description: data?.processed?.length 
          ? `Use Case erfolgreich aktualisiert` 
          : "Keine Aktualisierung erforderlich"
      });
    },
    onError: (error) => {
      console.error("Error creating embedding:", error);
      toast.error("Fehler beim Erstellen des Embeddings", {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    },
  });

  // Sortierungsfunktion
  const requestSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort use cases based on search query, missing articles filter, and sort config
  const filteredUseCases = React.useMemo(() => {
    // Start with all use cases
    let filtered = [...useCases];

    // Apply search filter if there is a search query
    if (searchQuery.trim()) {
      const normalizedQuery = searchQuery.toLowerCase().trim();
      const searchTerms = normalizedQuery.split(/\s+/);

      filtered = filtered.filter(useCase => {
        // Fields to search in
        const fieldsToSearch = [
          useCase.title || '',
          useCase.type || '',
          useCase.expected_result || '',
          useCase.information_needed || '',
          useCase.steps || '',
          useCase.typical_activities || '',
          useCase.next_question || ''
        ];

        // Check if any search term is found in any field
        return searchTerms.some(term => {
          return fieldsToSearch.some(field =>
            field.toLowerCase().includes(term)
          );
        });
      });
    }

    // Apply missing articles filter if enabled
    if (showMissingArticlesOnly) {
      filtered = filtered.filter(useCase =>
        !useCase.knowledge_articles || useCase.knowledge_articles.length === 0
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      // Handle special case for knowledge_articles
      if (sortConfig.key === 'knowledge_articles') {
        const aHasArticles = a.knowledge_articles && a.knowledge_articles.length > 0;
        const bHasArticles = b.knowledge_articles && b.knowledge_articles.length > 0;
        return sortConfig.direction === 'asc'
          ? (aHasArticles === bHasArticles ? 0 : aHasArticles ? 1 : -1)
          : (aHasArticles === bHasArticles ? 0 : aHasArticles ? -1 : 1);
      }
      // Handle special case for embedding
      else if (sortConfig.key === 'embedding') {
        const aHasEmbedding = !!a.embedding;
        const bHasEmbedding = !!b.embedding;
        return sortConfig.direction === 'asc'
          ? (aHasEmbedding === bHasEmbedding ? 0 : aHasEmbedding ? 1 : -1)
          : (aHasEmbedding === bHasEmbedding ? 0 : aHasEmbedding ? -1 : 1);
      }
      // For title, type and other string fields
      else if (typeof a[sortConfig.key] === 'string' && typeof b[sortConfig.key] === 'string') {
        return sortConfig.direction === 'asc'
          ? a[sortConfig.key].localeCompare(b[sortConfig.key])
          : b[sortConfig.key].localeCompare(a[sortConfig.key]);
      }
      // For date fields (like created_at)
      else if (sortConfig.key === 'created_at') {
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
      }
      // Default comparison for other fields
      else {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      }
    });
  }, [useCases, searchQuery, showMissingArticlesOnly, sortConfig]);

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Use Cases</h1>
        <div className="flex items-center gap-2">
          <UpdateEmbeddingsButton />
          <Button asChild>
            <Link to="/admin/use-cases/create">
              <Plus className="mr-2 h-4 w-4" />
              Neu erstellen
            </Link>
          </Button>
        </div>
      </div>

      {/* Customer Dropdown immer sichtbar */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <CustomerFilter
          selectedCustomerId={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
        />
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="missingArticlesFilter"
            checked={showMissingArticlesOnly}
            onChange={(e) => setShowMissingArticlesOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="missingArticlesFilter" className="text-sm font-medium">
            Nur Use Cases ohne Wissensartikel anzeigen
          </label>
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
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => requestSort('title')}
            >
              Titel {sortConfig.key === 'title' && (
                <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => requestSort('type')}
            >
              Typ {sortConfig.key === 'type' && (
                <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => requestSort('knowledge_articles')}
            >
              Wissensartikel {sortConfig.key === 'knowledge_articles' && (
                <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => requestSort('embedding')}
            >
              Embedding vorhanden {sortConfig.key === 'embedding' && (
                <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : filteredUseCases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
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
                <TableCell>
                  {useCase.embedding ? (
                    <span className="text-green-600 font-medium">Ja</span>
                  ) : (
                    <span className="text-red-600 font-medium">Nein</span>
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
                  {!useCase.embedding && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => useCase.id && createEmbeddingMutation.mutate(useCase.id)}
                      disabled={createEmbeddingMutation.isPending}
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      {createEmbeddingMutation.isPending ? 'Wird erstellt...' : 'Embedding erstellen'}
                    </Button>
                  )}
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
