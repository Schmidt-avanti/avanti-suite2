
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, ArrowRight, Lightbulb, Clock, User, CheckCircle } from "lucide-react";
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
        title: "Use Case zugewiesen",
        description: "Die strukturierte Bearbeitung wird gestartet."
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
          <p>Analysiere passende Workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3">Workflow-Assistent</h2>
        <p className="text-lg text-muted-foreground">
          Ich analysiere Ihre Aufgabe und schlage den besten Bearbeitungsweg vor
        </p>
      </div>

      {/* Task Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Ihre Aufgabe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <h3 className="font-semibold mb-2">{taskTitle}</h3>
          <p className="text-sm text-muted-foreground">{taskDescription}</p>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {suggestedUseCases.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <h3 className="text-xl font-semibold">Empfohlene Workflows</h3>
            <Badge variant="secondary">KI-Analyse</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedUseCases.map((useCase, index) => (
              <Card key={useCase.id} className="hover:shadow-lg transition-all duration-200 border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      {useCase.title}
                    </CardTitle>
                    <Badge variant="default" className="bg-green-500">
                      #{index + 1} Empfehlung
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {useCase.information_needed || 'Strukturierter Workflow für diese Art von Anfrage'}
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-blue-600">Geschätzte Zeit: 5-15 Min.</span>
                  </div>
                  <Button 
                    onClick={() => handleUseCaseSelect(useCase.id)}
                    disabled={isAssigning}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Diesen Workflow starten
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Available Use Cases */}
      {useCases.length > suggestedUseCases.length && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Weitere verfügbare Workflows</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {useCases
              .filter(uc => !suggestedUseCases.find(suc => suc.id === uc.id))
              .map((useCase) => (
                <Card key={useCase.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{useCase.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {useCase.information_needed || 'Strukturierter Workflow verfügbar'}
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
      )}

      {/* Manual Processing Option */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-orange-500 mt-1" />
              <div>
                <h3 className="font-medium text-lg">Manuelle Bearbeitung</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Für spezielle Fälle oder wenn kein Workflow passt. Sie erhalten dabei trotzdem KI-Unterstützung.
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={onManualProcessing}
              className="border-orange-300 hover:bg-orange-100 ml-4"
            >
              Manuell bearbeiten
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
