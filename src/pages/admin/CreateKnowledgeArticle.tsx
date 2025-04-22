
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ChevronLeft, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import KnowledgeArticleChat from '@/components/knowledge-articles/KnowledgeArticleChat';
import KnowledgeArticlePreview from '@/components/knowledge-articles/KnowledgeArticlePreview';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const CreateKnowledgeArticle = () => {
  const navigate = useNavigate();
  const { useCaseId } = useParams();
  const { toast } = useToast();
  const [content, setContent] = React.useState('');

  const { mutate: saveArticle, isPending } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('knowledge_articles')
        .insert([
          {
            use_case_id: useCaseId,
            content: content,
            title: 'Wissensartikel', // We could extract this from content later
            customer_id: '00000000-0000-0000-0000-000000000000', // This should come from the use case
            created_by: '00000000-0000-0000-0000-000000000000', // This should come from auth context
          }
        ]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Artikel gespeichert",
        description: "Der Wissensartikel wurde erfolgreich gespeichert.",
      });
      navigate(`/admin/use-cases/${useCaseId}`);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Fehler beim Speichern",
        description: error.message,
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/admin/use-cases/${useCaseId}`)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">
            Neuen Wissensartikel anlegen
          </h1>
        </div>
        <Button 
          onClick={() => saveArticle()}
          disabled={!content.trim() || isPending}
          className="bg-avanti-500 hover:bg-avanti-600"
        >
          <Save className="h-4 w-4 mr-2" />
          Wissensartikel speichern
        </Button>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <KnowledgeArticleChat 
            useCaseId={useCaseId!} 
            onContentChange={setContent} 
          />
        </Card>
        
        <div className="w-full">
          <KnowledgeArticlePreview 
            content={content} 
            loading={isPending}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateKnowledgeArticle;
