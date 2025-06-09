
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface UseCase {
  id: string;
  title: string;
  description: string;
  type: string;
  is_active: boolean;
  customer_id: string;
}

interface UseCaseSelectionInterfaceProps {
  taskId: string;
  customerId: string;
  taskDescription: string;
  onUseCaseSelected: (useCaseId: string) => void;
  onNoUseCaseSelected: () => void;
}

export const UseCaseSelectionInterface: React.FC<UseCaseSelectionInterfaceProps> = ({
  taskId,
  customerId,
  taskDescription,
  onUseCaseSelected,
  onNoUseCaseSelected
}) => {
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [filteredUseCases, setFilteredUseCases] = useState<UseCase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUseCases();
  }, [customerId]);

  useEffect(() => {
    const filtered = useCases.filter(useCase =>
      useCase.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      useCase.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUseCases(filtered);
  }, [useCases, searchTerm]);

  const fetchUseCases = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('use_cases')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setUseCases(data || []);
      setFilteredUseCases(data || []);
    } catch (error: any) {
      console.error('Error fetching use cases:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Use Cases konnten nicht geladen werden."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseCaseSelect = async (useCaseId: string) => {
    try {
      setIsAssigning(true);
      
      // Update task with selected use case
      const { error } = await supabase
        .from('tasks')
        .update({
          matched_use_case_id: useCaseId,
          match_confidence: 1.0,
          match_reasoning: 'Manuell ausgewählt durch Benutzer'
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Use Case zugewiesen",
        description: "Der Use Case wurde erfolgreich zugewiesen."
      });

      onUseCaseSelected(useCaseId);
    } catch (error: any) {
      console.error('Error assigning use case:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Use Case konnte nicht zugewiesen werden."
      });
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p>Lade Use Cases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Use Case auswählen</h2>
        <p className="text-muted-foreground mb-4">
          Wählen Sie den passenden Use Case für diese Aufgabe aus:
        </p>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-sm"><strong>Aufgabe:</strong> {taskDescription}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Use Cases durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {filteredUseCases.map((useCase) => (
          <Card key={useCase.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{useCase.title}</CardTitle>
                <Badge variant="secondary">{useCase.type}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                {useCase.description}
              </p>
              <Button 
                onClick={() => handleUseCaseSelect(useCase.id)}
                disabled={isAssigning}
                className="w-full"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Diesen Use Case wählen
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUseCases.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Keine Use Cases gefunden</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'Keine Use Cases entsprechen Ihrer Suche.' : 'Für diesen Kunden sind keine Use Cases verfügbar.'}
          </p>
        </div>
      )}

      <div className="border-t pt-6">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Kein passender Use Case?</h3>
                <p className="text-sm text-muted-foreground">
                  Wenn keiner der Use Cases zu dieser Aufgabe passt, können Sie eine manuelle Bearbeitung starten.
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={onNoUseCaseSelected}
                className="border-orange-300 hover:bg-orange-100"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Kein passender Use Case
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
