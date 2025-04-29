
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
  use_case_id?: string; // Added use_case_id as optional property
  similarity?: number;  // Added similarity as optional property
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
        // Fetch only the most relevant article for this task description
        const {
          data,
          error
        } = await supabase.from('knowledge_articles').select('id, title, content').eq('customer_id', customerId).eq('is_active', true).limit(1);
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
  return <>
      <Card className="rounded-xl shadow-md border-none bg-white/85">
        <CardContent className="p-6 pb-3">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            
            Relevante Wissensartikel
          </h2>
          
          <Button variant="outline" className="w-full justify-start text-left bg-blue-50/50 hover:bg-blue-100/80 border-blue-100 px-3 py-2 h-auto" onClick={() => handleOpenArticle(articles[0])}>
            <span className="break-words whitespace-normal">{articles[0].title}</span>
          </Button>
        </CardContent>
      </Card>

      {/* Only render modal if we're not using external handler */}
      {!onOpenArticle && <KnowledgeArticleModal open={isModalOpen} onClose={() => setIsModalOpen(false)} article={selectedArticle} />}
    </>;
}
