
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, Book, Search } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import KnowledgeList from '@/components/knowledge/KnowledgeList';
import KnowledgeDetail from '@/components/knowledge/KnowledgeDetail';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ViewType = 'articles' | 'cases';

const Knowledge = () => {
  const [viewType, setViewType] = React.useState<ViewType>('articles');
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCustomer, setSelectedCustomer] = React.useState<string>('all');

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: articles } = useQuery({
    queryKey: ['knowledge-articles', selectedCustomer],
    queryFn: async () => {
      let query = supabase
        .from('knowledge_articles')
        .select('id, title, content, created_at')
        .eq('is_active', true);
      
      if (selectedCustomer !== 'all') {
        query = query.eq('customer_id', selectedCustomer);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: cases } = useQuery({
    queryKey: ['use-cases', selectedCustomer],
    queryFn: async () => {
      let query = supabase
        .from('use_cases')
        .select('id, title, type, created_at')
        .eq('is_active', true);
      
      if (selectedCustomer !== 'all') {
        query = query.eq('customer_id', selectedCustomer);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredItems = React.useMemo(() => {
    const items = viewType === 'articles' ? articles : cases;
    if (!items) return [];
    
    return items.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [articles, cases, viewType, searchQuery]);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1>Wissen</h1>
      </div>

      <Card className="w-full">
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
          {!selectedItemId && (
            <div className="flex gap-4 mt-4">
              <div className="flex-1 relative">
                <Input
                  placeholder="Suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9"
                />
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              </div>
              <Select
                value={selectedCustomer}
                onValueChange={setSelectedCustomer}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Kunde auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kunden</SelectItem>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!selectedItemId ? (
            <KnowledgeList
              items={filteredItems}
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
