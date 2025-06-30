import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Save } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import KnowledgeArticleChat from '@/components/knowledge-articles/KnowledgeArticleChat';
import { KnowledgeArticlePreview } from '@/components/knowledge-articles/KnowledgeArticlePreview';

interface SaveArticlePayload {
  use_case_id: string;
  content: string;
  title: string;
  created_by: string;
  customer_id: string;
}

const CreateKnowledgeArticle = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const useCaseId = searchParams.get('useCaseId');
  const { user } = useAuth();

  const [articleContent, setArticleContent] = useState('');

  const { data: useCase } = useQuery({
    queryKey: ['useCase', useCaseId],
    queryFn: async () => {
      if (!useCaseId) return null;
      const { data, error } = await supabase
        .from('use_cases')
        .select('*')
        .eq('id', useCaseId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!useCaseId,
  });

  const saveArticleMutation = useMutation<void, Error, SaveArticlePayload>({
    mutationFn: async (payload) => {
      const { error } = await supabase.from('knowledge_articles').insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Wissensartikel erfolgreich gespeichert!');
      navigate('/knowledge');
    },
    onError: (error) => {
      toast.error('Fehler beim Speichern des Wissensartikels: ' + error.message);
    },
  });

  const handleSaveArticle = (contentToSave: string) => {
    if (!useCaseId || !useCase || !user) {
      toast.error('Informationen zum Speichern unvollständig. Use Case oder Benutzer nicht geladen.');
      return;
    }
    
    saveArticleMutation.mutate({
      use_case_id: useCaseId,
      content: contentToSave,
      title: useCase.title + ' - Wissensartikel',
      created_by: user.id,
      customer_id: useCase.customer_id,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wissensartikel erstellen</h1>
          <p className="text-muted-foreground">
            Erstelle einen neuen Wissensartikel basierend auf einem Use Case.
          </p>
        </div>
        <Button 
          onClick={() => handleSaveArticle(articleContent)}
          disabled={!articleContent.trim() || saveArticleMutation.isPending}
          className="bg-avanti-500 hover:bg-avanti-600"
        >
          <Save className="h-4 w-4 mr-2" />
          Speichern
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Ava Vorschlag</h2>
          <KnowledgeArticleChat 
            useCaseId={useCaseId}
            onContentUpdate={setArticleContent}
          />
        </Card>
        
        <KnowledgeArticlePreview 
          content={articleContent}
          onSave={handleSaveArticle}
        />
      </div>
    </div>
  );
};

export default CreateKnowledgeArticle;
