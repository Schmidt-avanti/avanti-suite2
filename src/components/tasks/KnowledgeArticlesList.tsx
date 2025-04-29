
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { KnowledgeArticleModal } from '../knowledge-articles/KnowledgeArticleModal';

interface KnowledgeArticlesListProps {
  customerId?: string | null;
  taskDescription?: string;
}

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
}

export function KnowledgeArticlesList({ customerId, taskDescription }: KnowledgeArticlesListProps) {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRelevantArticles() {
      if (!customerId) return;
      
      setIsLoading(true);
      try {
        // Fetch articles associated with this customer
        const { data, error } = await supabase
          .from('knowledge_articles')
          .select('id, title, content')
          .eq('customer_id', customerId)
          .eq('is_active', true)
          .limit(5);
        
        if (error) throw error;
        setArticles(data || []);
      } catch (error) {
        console.error('Error fetching knowledge articles:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchRelevantArticles();
  }, [customerId]);

  const handleOpenArticle = (article: KnowledgeArticle) => {
    setSelectedArticle(article);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <div className="mt-3 text-sm text-muted-foreground">Lade Wissensartikel...</div>;
  }
  
  if (articles.length === 0) {
    return null; // Keine Artikel vorhanden, nichts anzeigen
  }

  return (
    <>
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <BookOpen className="h-4 w-4" />
          <span className="font-medium">Relevante Wissensartikel</span>
        </div>
        <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {articles.map((article) => (
            <Button
              key={article.id}
              variant="outline"
              className="justify-start text-left bg-blue-50/50 hover:bg-blue-100/80 border-blue-100 px-3 py-2 h-auto"
              onClick={() => handleOpenArticle(article)}
            >
              <div className="truncate">{article.title}</div>
            </Button>
          ))}
        </div>
      </div>

      <KnowledgeArticleModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        article={selectedArticle}
      />
    </>
  );
}
