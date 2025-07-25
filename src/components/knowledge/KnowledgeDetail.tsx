
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ChevronLeft, Edit } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { KnowledgeArticle } from '@/types/use-case';
import ReactMarkdown from 'react-markdown';
import parse from 'html-react-parser';
import rehypeRaw from 'rehype-raw';

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
    title?: string;
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

  const canEdit = user?.role === 'admin' || user?.role === 'customer';

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
          <div className="space-y-4">
            {/* Debug-Ausgabe - kann später entfernt werden */}
            <div className="hidden">
              <p>Inhaltstyp: {typeof (item as KnowledgeArticle).content}</p>
              <p>Erste 50 Zeichen: {JSON.stringify((item as KnowledgeArticle).content?.substring(0, 50))}</p>
            </div>
            
            {/* Inhalt mit HTML und Markdown-Unterstützung */}
            <div className="prose prose-gray max-w-none">
              {(() => {
                const rawContent = String((item as KnowledgeArticle).content || '');
                const markdownContent = rawContent.replace(/\\n/g, '\n');
                const isHtml = /^\s*<.+?>/.test(markdownContent);
                if (isHtml) {
                  return parse(markdownContent);
                } else {
                  return (
                    <ReactMarkdown
                      components={{
                        p: ({node, ...props}) => <div {...props} className="mb-4" />,
                        strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4" {...props} />,
                        li: ({node, ...props}) => <li className="mb-1" {...props} />,
                      }}
                    >
                      {markdownContent}
                    </ReactMarkdown>
                  );
                }
              })()}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Priorisiere chat_response.steps_block für die dialogorientierte Darstellung */}
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
                {/* Fallback für ältere Use Cases ohne chat_response.steps_block */}
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
