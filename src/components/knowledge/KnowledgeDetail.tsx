
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { KnowledgeArticle } from '@/types/use-case';

interface KnowledgeDetailProps {
  id: string;
  type: 'articles' | 'cases';
  onBack: () => void;
}

// Define types for use cases
interface UseCase {
  id: string;
  title: string;
  information_needed?: string | null;
  expected_result?: string | null;
  steps?: string | null;
  created_at: string;
}

const KnowledgeDetail: React.FC<KnowledgeDetailProps> = ({ id, type, onBack }) => {
  const { data: item, isLoading } = useQuery({
    queryKey: [type === 'articles' ? 'knowledge-article' : 'use-case', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(type === 'articles' ? 'knowledge_articles' : 'use_cases')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-4">Lade Daten...</div>;
  }

  if (!item) {
    return <div className="text-center py-4">Eintrag nicht gefunden</div>;
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-4"
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Zurück
      </Button>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{item.title}</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Erstellt am {format(new Date(item.created_at), 'PP', { locale: de })}
        </p>
        
        {type === 'articles' ? (
          // For knowledge articles
          <div className="prose prose-gray max-w-none">
            {(item as KnowledgeArticle).content}
          </div>
        ) : (
          // For use cases
          <div className="space-y-6">
            {(item as UseCase).information_needed && (
              <div>
                <h3 className="text-lg font-medium mb-2">Benötigte Informationen</h3>
                <p className="whitespace-pre-wrap">{(item as UseCase).information_needed}</p>
              </div>
            )}
            {(item as UseCase).expected_result && (
              <div>
                <h3 className="text-lg font-medium mb-2">Erwartetes Ergebnis</h3>
                <p className="whitespace-pre-wrap">{(item as UseCase).expected_result}</p>
              </div>
            )}
            {(item as UseCase).steps && (
              <div>
                <h3 className="text-lg font-medium mb-2">Schritte</h3>
                <p className="whitespace-pre-wrap">{(item as UseCase).steps}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeDetail;
