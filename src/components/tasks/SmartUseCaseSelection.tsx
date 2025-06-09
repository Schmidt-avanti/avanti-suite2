
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight, Lightbulb, Clock, User, CheckCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface DatabaseUseCase {
  id: string;
  title: string;
  information_needed: string | null;
  type: string | null;
  is_active: boolean;
  customer_id: string | null;
}

interface SmartUseCaseSelectionProps {
  taskId: string;
  customerId: string;
  taskDescription: string;
  taskTitle: string;
  onUseCaseSelected: (useCaseId: string) => void;
  onManualProcessing: () => void;
}

export const SmartUseCaseSelection: React.FC<SmartUseCaseSelectionProps> = ({
  taskId,
  customerId,
  taskDescription,
  taskTitle,
  onUseCaseSelected,
  onManualProcessing
}) => {
  const [useCases, setUseCases] = useState<DatabaseUseCase[]>([]);
  const [suggestedUseCases, setSuggestedUseCases] = useState<DatabaseUseCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAndAnalyzeUseCases();
  }, [customerId, taskDescription]);

  const fetchAndAnalyzeUseCases = async () => {
    try {
      setIsLoading(true);
      
      // Fetch available use cases for this customer
      const { data, error } = await supabase
        .from('use_cases')
        .select('id, title, information_needed, type, is_active, customer_id')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      
      setUseCases(data || []);
      
      // Smart analysis: find the most relevant use cases based on keywords
      const analyzed = analyzeUseCaseRelevance(data || [], taskDescription);
      setSuggestedUseCases(analyzed.slice(0, 3)); // Top 3 suggestions
      
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

  const analyzeUseCaseRelevance = (useCases: DatabaseUseCase[], description: string): DatabaseUseCase[] => {
    const keywords = description.toLowerCase().split(/\s+/);
    
    const scored = useCases.map(useCase => {
      let score = 0;
      const useCaseText = `${useCase.title} ${useCase.information_needed || ''}`.toLowerCase();
      
      // Score based on keyword matches
      keywords.forEach(keyword => {
        if (keyword.length > 3 && useCaseText.includes(keyword)) {
          score += keyword.length;
        }
      });
      
      return { ...useCase, relevanceScore: score };
    });
    
    return scored
      .filter(useCase => useCase.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
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
        title: "Workflow ausgewählt",
        description: "Die strukturierte Bearbeitung wird jetzt gestartet."
      });

      onUseCaseSelected(useCaseId);
    } catch (error: any) {
      console.error('Error assigning use case:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Workflow konnte nicht zugewiesen werden."
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
          <p>Suche passende Workflows für Ihre Aufgabe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3 text-blue-900">
          <Search className="inline h-8 w-8 mr-3 text-blue-600" />
          Workflow-Auswahl
        </h1>
        <p className="text-lg text-gray-700 mb-4">
          Wählen Sie den passenden Workflow für Ihre Kundenanfrage aus
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-3xl mx-auto">
          <h3 className="font-semibold text-blue-900 mb-2">Ihre Kundenanfrage:</h3>
          <p className="text-blue-800 font-medium">"{taskTitle}"</p>
          <p className="text-blue-700 text-sm mt-1">{taskDescription}</p>
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestedUseCases.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-2 rounded-full">
              <Lightbulb className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-green-800">Empfohlene Workflows</h2>
              <p className="text-green-700">Basierend auf Ihrer Anfrage haben wir diese passenden Workflows gefunden:</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {suggestedUseCases.map((useCase, index) => (
              <Card key={useCase.id} className="hover:shadow-lg transition-all duration-200 border-2 border-green-300 bg-green-50">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <CardTitle className="text-xl text-green-800">{useCase.title}</CardTitle>
                        <Badge variant="default" className="bg-green-500 mt-1">
                          Beste Empfehlung
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-700">
                      <strong>Was wird gemacht:</strong> {useCase.information_needed || 'Strukturierte Bearbeitung Ihrer Kundenanfrage mit Schritt-für-Schritt Anleitung'}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Clock className="h-4 w-4" />
                      <span>Geschätzte Bearbeitungszeit: 5-15 Minuten</span>
                    </div>
                    <Button 
                      onClick={() => handleUseCaseSelect(useCase.id)}
                      disabled={isAssigning}
                      className="w-full bg-green-600 hover:bg-green-700 text-lg py-3"
                      size="lg"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Diesen Workflow verwenden
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Alternative Workflows */}
      {useCases.length > suggestedUseCases.length && (
        <div className="space-y-4">
          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Weitere verfügbare Workflows</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {useCases
                .filter(uc => !suggestedUseCases.find(suc => suc.id === uc.id))
                .map((useCase) => (
                  <Card key={useCase.id} className="hover:shadow-md transition-shadow border border-gray-300">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-gray-800">{useCase.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        {useCase.information_needed || 'Strukturierte Bearbeitung verfügbar'}
                      </p>
                      <Button 
                        onClick={() => handleUseCaseSelect(useCase.id)}
                        disabled={isAssigning}
                        variant="outline"
                        className="w-full"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Workflow wählen
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* No matching workflows */}
      {useCases.length === 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Keine passenden Workflows gefunden
            </h3>
            <p className="text-yellow-700 mb-4">
              Für diese Art von Anfrage ist noch kein automatischer Workflow verfügbar.
            </p>
            <Button 
              onClick={onManualProcessing}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Manuelle Bearbeitung starten
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manual Processing Option */}
      <Card className="border-orange-300 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-orange-500 mt-1" />
              <div>
                <h3 className="font-semibold text-lg text-orange-800">Individuelle Bearbeitung</h3>
                <p className="text-orange-700 mt-1">
                  Falls kein Workflow passt, können Sie die Anfrage individuell bearbeiten. 
                  Sie erhalten dabei trotzdem KI-Unterstützung und Hilfestellung.
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={onManualProcessing}
              className="border-orange-400 hover:bg-orange-100 ml-4 whitespace-nowrap"
            >
              Individuell bearbeiten
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
