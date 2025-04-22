
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, Book } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import KnowledgeList from '@/components/knowledge/KnowledgeList';
import KnowledgeDetail from '@/components/knowledge/KnowledgeDetail';

type ViewType = 'articles' | 'cases';

const Knowledge = () => {
  const [viewType, setViewType] = React.useState<ViewType>('articles');
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);

  const { data: articles } = useQuery({
    queryKey: ['knowledge-articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_articles')
        .select('id, title, content, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: cases } = useQuery({
    queryKey: ['use-cases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('use_cases')
        .select('id, title, type, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="content-container section-spacing">
      <div className="flex items-center justify-between">
        <h1>Wissen</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Wissensdatenbank</CardTitle>
            <ToggleGroup
              type="single"
              value={viewType}
              onValueChange={(value) => {
                if (value) {
                  setViewType(value as ViewType);
                  setSelectedItemId(null);
                }
              }}
            >
              <ToggleGroupItem value="articles" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Wissensartikel</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="cases" className="flex items-center gap-2">
                <Book className="h-4 w-4" />
                <span>Use Cases</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedItemId ? (
            <KnowledgeList
              items={viewType === 'articles' ? articles : cases}
              type={viewType}
              onItemClick={setSelectedItemId}
            />
          ) : (
            <KnowledgeDetail
              id={selectedItemId}
              type={viewType}
              onBack={() => setSelectedItemId(null)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Knowledge;

