import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from '../editor/RichTextEditor';

export default function KnowledgeArticleEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = React.useState({
    title: '',
    content: ''
  });

  const { data: article, isLoading } = useQuery({
    queryKey: ['knowledge-article', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_articles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  React.useEffect(() => {
    if (article) {
      setFormData({
        title: article.title,
        content: article.content
      });
    }
  }, [article]);

  const mutation = useMutation({
    mutationFn: async (values: typeof formData) => {
      const { error } = await supabase
        .from('knowledge_articles')
        .update(values)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['knowledge-article', id]});
      toast({
        title: "Erfolgreich gespeichert",
        description: "Der Wissensartikel wurde aktualisiert."
      });
      navigate(-1);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Fehler beim Speichern",
        description: error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten."
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="text-center py-4">Lade Daten...</div>;
  }

  if (!article) {
    return <div className="text-center py-4">Artikel nicht gefunden</div>;
  }

  return (
    <div className="page-container">
      <Card>
        <CardHeader>
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 hover:bg-transparent"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <CardTitle>Wissensartikel bearbeiten</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Titel"
                className="mb-4"
              />
              <RichTextEditor
                content={formData.content}
                onChange={(content) => setFormData(prev => ({ ...prev, content }))}
              />
            </div>
            <div className="flex justify-end">
              <Button 
                type="submit"
                className="bg-avanti-500 hover:bg-avanti-600"
                disabled={mutation.isPending}
              >
                Speichern
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
