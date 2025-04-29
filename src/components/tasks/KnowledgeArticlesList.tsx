import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KnowledgeArticleModal } from '../knowledge-articles/KnowledgeArticleModal';
import { useToast } from '@/components/ui/use-toast';

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  use_case_id?: string;
  similarity?: number;
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
  const { toast } = useToast();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRelevantArticles() {
      if (!customerId || !taskDescription) return;
      
      setIsLoading(true);
      try {
        console.log('Fetching relevant articles for customer:', customerId);
        console.log('Task description:', taskDescription?.substring(0, 50) + '...');

        // First generate embedding for the task description
        const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-task-embedding', {
          body: { text: taskDescription }
        });
        
        if (embeddingError) {
          console.error('Error generating embedding:', embeddingError);
          return;
        }
        
        // If no embedding was generated, fall back to basic customer ID filter
        if (!embeddingData?.embedding) {
          const { data: basicArticles, error: basicError } = await supabase
            .from('knowledge_articles')
            .select('id, title, content, use_case_id')
            .eq('customer_id', customerId)
            .eq('is_active', true)
            .limit(1);
            
          if (basicError) throw basicError;
          setArticles(basicArticles || []);
          return;
        }
        
        // Use the embedding to find similar knowledge articles
        const { data: matchedArticles, error: matchError } = await supabase.rpc(
          'match_relevant_knowledge_articles',
          {
            query_embedding: embeddingData.embedding,
            match_threshold: 0.5,
            match_count: 1,
            customer_id_param: customerId
          }
        );
        
        if (matchError) {
          console.error('Error matching knowledge articles:', matchError);
          throw matchError;
        }
        
        console.log('Found matching articles:', matchedArticles?.length || 0);
        
        if (matchedArticles && matchedArticles.length > 0) {
          // Format the articles for display
          // Add explicit type assertion to include use_case_id
          const formattedArticles: KnowledgeArticle[] = matchedArticles.map(article => ({
            id: article.id,
            title: article.title,
            content: article.content,
            use_case_id: article.use_case_id, // This line was causing the error since it wasn't in the return type
            similarity: article.similarity
          }));
          
          setArticles(formattedArticles);
        } else {
          setArticles([]);
        }
      } catch (error) {
        console.error('Error fetching knowledge articles:', error);
        toast({
          variant: "destructive",
          title: "Fehler beim Laden der Wissensartikel",
          description: "Bitte versuchen Sie es später erneut."
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchRelevantArticles();
  }, [customerId, taskDescription, toast]);

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
  
  return <>
      <Card className="rounded-xl shadow-md border-none bg-white/85">
        <CardContent className="p-6 pb-3">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            Relevante Wissensartikel
          </h2>
          
          {articles.map(article => (
            <Button 
              key={article.id}
              variant="outline" 
              className="w-full justify-start text-left bg-blue-50/50 hover:bg-blue-100/80 border-blue-100 px-3 py-2 h-auto mb-2" 
              onClick={() => handleOpenArticle(article)}
            >
              <span className="break-words whitespace-normal">{article.title}</span>
              {article.similarity && (
                <span className="ml-2 text-xs text-gray-500">
                  ({Math.round(article.similarity * 100)}% Relevanz)
                </span>
              )}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Only render modal if we're not using external handler */}
      {!onOpenArticle && <KnowledgeArticleModal open={isModalOpen} onClose={() => setIsModalOpen(false)} article={selectedArticle} />}
    </>;
}
