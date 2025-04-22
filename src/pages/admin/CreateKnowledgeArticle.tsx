import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ChevronLeft, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import KnowledgeArticleChat from '@/components/knowledge-articles/KnowledgeArticleChat';
import KnowledgeArticlePreview from '@/components/knowledge-articles/KnowledgeArticlePreview';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const CreateKnowledgeArticle = () => {
  const navigate = useNavigate();
  const { useCaseId } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [content, setContent] = React.useState('');

  const { data: useCase } = useQuery({
    queryKey: ['use-case', useCaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('use_cases')
        .select('customer_id, title')
        .eq('id', useCaseId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { mutate: saveArticle, isPending } = useMutation({
    mutationFn: async () => {
      if (!useCase?.customer_id) throw new Error('Kunde nicht gefunden');
      
      const { error } = await supabase
        .from('knowledge_articles')
        .insert([
          {
            use_case_id: useCaseId,
            content: content,
            title: useCase.title || 'Wissensartikel',
            customer_id: useCase.customer_id,
            created_by: user?.id,
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
