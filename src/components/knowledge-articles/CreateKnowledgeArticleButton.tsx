
import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import KnowledgeArticleChat from "./KnowledgeArticleChat";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CreateKnowledgeArticleButtonProps {
  useCaseId: string;
}

const CreateKnowledgeArticleButton = ({ useCaseId }: CreateKnowledgeArticleButtonProps) => {
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
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-avanti-500 hover:bg-avanti-600">
          <FileText className="h-4 w-4 mr-2" />
          Wissensartikel erstellen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh]">
        <KnowledgeArticleChat useCaseId={useCaseId} />
      </DialogContent>
    </Dialog>
  );
};

export default CreateKnowledgeArticleButton;
