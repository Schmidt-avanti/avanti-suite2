
import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CreateKnowledgeArticleButtonProps {
  useCaseId: string;
}

const CreateKnowledgeArticleButton = ({ useCaseId }: CreateKnowledgeArticleButtonProps) => {
  const navigate = useNavigate();
  
  const { data: existingArticle, isLoading } = useQuery({
    queryKey: ['knowledge-article', useCaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_articles')
        .select('id')
        .eq('use_case_id', useCaseId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return null;
  if (existingArticle) return null;

  return (
    <Button 
      onClick={() => navigate(`/admin/knowledge-articles/create/${useCaseId}`)}
      className="bg-avanti-500 hover:bg-avanti-600"
    >
      <FileText className="h-4 w-4 mr-2" />
      Wissensartikel erstellen
    </Button>
  );
};

export default CreateKnowledgeArticleButton;
