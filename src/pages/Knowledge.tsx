import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { FileText, Book, Search } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import KnowledgeList from '@/components/knowledge/KnowledgeList';
import KnowledgeDetail from '@/components/knowledge/KnowledgeDetail';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';

type ViewType = 'articles' | 'cases';

const Knowledge = () => {
  const { user } = useAuth();
  // Customer: always their customer_id, others: 'all' by default
  const [selectedCustomer, setSelectedCustomer] = React.useState<string>(user?.role === 'customer' ? (user?.customer_id || '') : 'all');
  const [viewType, setViewType] = React.useState<ViewType>('articles');
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Keep selectedCustomer in sync if user changes (e.g. after login)
  React.useEffect(() => {
    if (user?.role === 'customer' && user.customer_id) {
      setSelectedCustomer(user.customer_id);
    }
  }, [user]);

  const { data: customers } = useQuery({
    queryKey: ['customers', user?.id, user?.role],
    queryFn: async () => {
      if (user?.role === 'customer') {
        // Kunde sieht nur sich selbst
        const { data, error } = await supabase
          .from('customers')
          .select('id, name')
          .eq('id', user.customer_id)
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        return data;
      } else if (user?.role === 'agent') {
        // Agent sieht nur zugeordnete Kunden
        const { data: assignments, error: assignmentsError } = await supabase
          .from('user_customer_assignments')
          .select('customer_id')
          .eq('user_id', user.id);
        if (assignmentsError) throw assignmentsError;
        const customerIds = assignments?.map(a => a.customer_id) || [];
        if (customerIds.length === 0) return [];
        const { data, error } = await supabase
          .from('customers')
          .select('id, name')
          .in('id', customerIds)
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        return data;
      } else {
        // Admin sieht alle
        const { data, error } = await supabase
          .from('customers')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        return data;
      }
    },
  });

  const { data: articles } = useQuery({
    queryKey: ['knowledge-articles', selectedCustomer, user?.role, user?.customer_id],
    queryFn: async () => {
      let query = supabase
        .from('knowledge_articles')
        .select('id, title, content, created_at')
        .eq('is_active', true);

      if (user?.role === 'customer') {
        query = query.eq('customer_id', user.customer_id);
      } else if (selectedCustomer !== 'all') {
        query = query.eq('customer_id', selectedCustomer);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: cases } = useQuery({
    queryKey: ['use-cases', selectedCustomer, user?.role, user?.customer_id],
    queryFn: async () => {
      let query = supabase
        .from('use_cases')
        .select('id, title, information_needed, created_at')
        .eq('is_active', true);

      if (user?.role === 'customer') {
        query = query.eq('customer_id', user.customer_id);
      } else if (selectedCustomer !== 'all') {
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
    <div className="page-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-7">
        <h1>Wissen</h1>
      </div>
      <Card className="w-full shadow-none border-0 bg-transparent">
        <CardHeader className="bg-white/95 rounded-t-2xl px-6 sm:px-8 pt-8 pb-3 sticky top-0 z-10">
          {!selectedItemId && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="flex-1 flex gap-3 items-center">
                <div className="relative flex-1">
                  <Input
                    placeholder="Suchen…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="
                      w-full py-3 pl-11 pr-4 text-base rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/30
                      focus:bg-white shadow-none transition
                    "
                  />
                  <Search className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {(user?.role === 'admin' || user?.role === 'agent') && (
                  <Select
                    value={selectedCustomer}
                    onValueChange={setSelectedCustomer}
                  >
                    <SelectTrigger className="min-w-[142px] sm:min-w-[200px] max-w-[250px] rounded-lg border-gray-200 bg-gray-50">
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
                )}
                {/* Für Kunden kein Dropdown */}
              </div>
              <div className="mt-2 sm:mt-0 flex gap-3 justify-end">
                <ToggleGroup
                  type="single"
                  value={viewType}
                  onValueChange={(value) => {
                    if (value) {
                      setViewType(value as ViewType);
                      setSelectedItemId(null);
                    }
                  }}
                  className="gap-2"
                >
                  <ToggleGroupItem value="articles" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 data-[state=on]:bg-avanti-100/60 data-[state=on]:text-blue-900 data-[state=on]:shadow border border-gray-200">
                    <FileText className="h-5 w-5" />
                    <span>Wissensartikel</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="cases" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 data-[state=on]:bg-purple-100/50 data-[state=on]:text-purple-900 data-[state=on]:shadow border border-gray-200">
                    <Book className="h-5 w-5" />
                    <span>Use Cases</span>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          )}
          {selectedItemId && null}
        </CardHeader>
        <CardContent className="p-0 rounded-b-2xl bg-transparent px-6 sm:px-8">
          {!selectedItemId ? (
            <KnowledgeList
              items={filteredItems}
              type={viewType}
              onItemClick={setSelectedItemId}
            />
          ) : (
            <div className="pt-6">
              <KnowledgeDetail
                id={selectedItemId}
                type={viewType}
                onBack={() => setSelectedItemId(null)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Knowledge;
