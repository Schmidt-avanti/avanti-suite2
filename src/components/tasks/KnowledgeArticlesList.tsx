
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KnowledgeArticleModal } from '../knowledge-articles/KnowledgeArticleModal';

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
}

interface KnowledgeArticlesListProps {
  customerId?: string | null;
  taskDescription?: string;
  onOpenArticle?: (article: KnowledgeArticle) => void;
}

export function KnowledgeArticlesList({
  customerId,
  taskDescription,
  onOpenArticle
}: KnowledgeArticlesListProps) {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRelevantArticles() {
      if (!customerId) return;
      
      setIsLoading(true);
      
      try {
        // Generiere ein Embedding für die Aufgabenbeschreibung, wenn vorhanden
        let relevantArticlesQuery;
        
        if (taskDescription && taskDescription.trim().length > 5) {
          // Wenn eine Aufgabenbeschreibung vorhanden ist, verwenden wir eine semantische Suche
          const { data: embeddingData } = await supabase.functions.invoke('generate-embeddings', {
            body: { text: taskDescription }
          });
          
          if (embeddingData?.embedding) {
            // Wenn wir ein Embedding haben, führen wir eine Ähnlichkeitssuche durch
            relevantArticlesQuery = supabase
              .rpc('match_relevant_knowledge_articles', {
                query_embedding: embeddingData.embedding,
                match_threshold: 0.5,
                match_count: 3,
                customer_id_param: customerId
              });
          }
        }
        
        // Wenn keine semantische Suche möglich ist, fallen wir auf die einfache Abfrage zurück
        if (!relevantArticlesQuery) {
          relevantArticlesQuery = supabase
            .from('knowledge_articles')
            .select('id, title, content')
            .eq('customer_id', customerId)
            .eq('is_active', true)
            .order('updated_at', { ascending: false })
            .limit(3);
        }
        
        const { data, error } = await relevantArticlesQuery;
        
        if (error) throw error;
        setArticles(data || []);
      } catch (error) {
        console.error('Error fetching knowledge articles:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchRelevantArticles();
  }, [customerId, taskDescription]);

  const handleOpenArticle = (article: KnowledgeArticle) => {
    if (onOpenArticle) {
      // If external handler is provided, use it
      onOpenArticle(article);
    } else {
      // Otherwise use internal modal state
      setSelectedArticle(article);
      setIsModalOpen(true);
    }
  };

  if (isLoading) {
    return <div className="mt-3 text-sm text-muted-foreground">Lade Wissensartikel...</div>;
  }

  if (articles.length === 0) {
    return null; // Keine Artikel vorhanden, nichts anzeigen
  }

  return (
    <>
      <Card className="rounded-xl shadow-md border-none bg-white/85">
        <CardContent className="p-6 pb-3">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <BookOpen size={18} className="text-blue-500" />
            Relevante Wissensartikel
          </h2>
          
          <div className="space-y-2">
            {articles.map(article => (
              <Button 
                key={article.id}
                variant="outline" 
                className="w-full justify-start text-left bg-blue-50/50 hover:bg-blue-100/80 border-blue-100 px-3 py-2 h-auto" 
                onClick={() => handleOpenArticle(article)}
              >
                <span className="break-words whitespace-normal">{article.title}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Only render modal if we're not using external handler */}
      {!onOpenArticle && <KnowledgeArticleModal open={isModalOpen} onClose={() => setIsModalOpen(false)} article={selectedArticle} />}
    </>
  );
}
