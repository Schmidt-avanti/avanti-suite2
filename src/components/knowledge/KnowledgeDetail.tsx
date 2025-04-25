
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ChevronLeft, Edit } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { KnowledgeArticle } from '@/types/use-case';

interface KnowledgeDetailProps {
  id: string;
  type: 'articles' | 'cases';
  onBack: () => void;
}

interface UseCase {
  id: string;
  title: string;
  information_needed?: string | null;
  expected_result?: string | null;
  steps?: string | null;
  created_at: string;
  chat_response?: {
    steps_block?: string[];
  } | null;
}

const KnowledgeDetail: React.FC<KnowledgeDetailProps> = ({ id, type, onBack }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
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

  const canEdit = user?.role === 'admin' || user?.role === 'client';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        
        {type === 'articles' && canEdit && (
          <Button
            onClick={() => navigate(`/knowledge/edit/${id}`)}
            variant="outline"
            className="mb-4"
          >
            <Edit className="h-4 w-4 mr-2" />
            Bearbeiten
          </Button>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">{item.title}</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Erstellt am {format(new Date(item.created_at), 'PP', { locale: de })}
        </p>
        
        {type === 'articles' ? (
          <div 
            className="prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: (item as KnowledgeArticle).content
            }} 
          />
        ) : (
          <div className="space-y-6">
            {/* If we have chat_response with steps_block, render them in a more conversational way */}
            {(item as UseCase).chat_response?.steps_block?.length > 0 ? (
              <div>
                <h3 className="text-lg font-medium mb-4">Dialogschritte</h3>
                <div className="space-y-3">
                  {(item as UseCase).chat_response.steps_block.map((step, index) => (
                    <div 
                      key={index} 
                      className="p-3 rounded-lg bg-blue-50 border border-blue-100"
                    >
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Fall back to the old format if chat_response is not available */}
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default KnowledgeDetail;
