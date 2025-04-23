
import React from 'react';
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SuggestedResponsesProps {
  customerId: string | null;
  onSelectResponse: (response: string) => void;
}

export const SuggestedResponses = ({ customerId, onSelectResponse }: SuggestedResponsesProps) => {
  const { data: suggestions } = useQuery({
    queryKey: ['use-case-suggestions', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data: useCases, error } = await supabase
        .from('use_cases')
        .select('title, steps, information_needed')
        .eq('customer_id', customerId)
        .eq('is_active', true);
        
      if (error) throw error;
      
      // Aus den Use-Cases mögliche Antworten generieren
      return useCases.map(useCase => ({
        title: useCase.title,
        responses: [
          useCase.information_needed ? 
            `Für "${useCase.title}" benötige ich folgende Informationen:\n${useCase.information_needed}` : null,
          useCase.steps ?
            `Hier sind die nächsten Schritte für "${useCase.title}":\n${useCase.steps}` : null
        ].filter(Boolean)
      }));
    },
    enabled: !!customerId
  });

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mt-4 space-y-4">
      <div className="text-sm font-medium text-avanti-700 flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Antwortvorschläge
      </div>
      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
        {suggestions.map((suggestion, i) => (
          <div key={i} className="space-y-2">
            {suggestion.responses.map((response, j) => (
              <Button
                key={`${i}-${j}`}
                variant="outline"
                className="w-full justify-start text-left normal-case font-normal text-sm hover:bg-avanti-50"
                onClick={() => onSelectResponse(response)}
              >
                <span className="line-clamp-2">{response}</span>
              </Button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
