
import React, { useState } from 'react';
import { KnowledgeArticlesList } from './KnowledgeArticlesList';
import { KnowledgeArticleModal } from '../knowledge-articles/KnowledgeArticleModal';

interface KnowledgeArticleManagerProps {
  customerId?: string | null;
  taskDescription?: string;
}

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
}

// Diese Komponente kombiniert die Liste und das Modal
export function KnowledgeArticleManager({ customerId, taskDescription }: KnowledgeArticleManagerProps) {
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleOpenArticle = (article: KnowledgeArticle) => {
    setSelectedArticle(article);
    setIsModalOpen(true);
  };

  return (
    <>
      <KnowledgeArticlesList 
        customerId={customerId}
        taskDescription={taskDescription}
        onOpenArticle={handleOpenArticle}
      />
      
      <KnowledgeArticleModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        article={selectedArticle}
      />
    </>
  );
}
