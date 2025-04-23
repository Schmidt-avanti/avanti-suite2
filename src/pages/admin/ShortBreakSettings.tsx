
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useState } from 'react';
import { ActiveBreaksList } from '@/components/short-break/ActiveBreaksList';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function ShortBreakSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [maxSlots, setMaxSlots] = useState('5');
  const [dailyMinutes, setDailyMinutes] = useState('20');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Filters state
  const [filters, setFilters] = useState({
    userId: null,
    status: null,
    fromDate: null,
    toDate: null
  });

  const { data: settings } = useQuery({
    queryKey: ['short-break-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('short_break_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      
      setMaxSlots(data.max_slots.toString());
      setDailyMinutes(data.daily_minutes_per_agent.toString());
      
      return data;
    }
  });

  const { data: users } = useQuery({
    queryKey: ['users-for-breaks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, "Full Name"')
        .order('"Full Name"', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    }
  });

  const { data: breaksData, isLoading: breaksLoading } = useQuery({
    queryKey: ['break-history', page, filters],
    queryFn: async () => {
      // Construct base query
      let query = supabase
        .from('short_breaks')
        .select(`
          *,
          profiles:user_id (
            "Full Name"
          )
        `, { count: 'exact' })
        .order('start_time', { ascending: false });
      
      // Handle the joined table more carefully
      query = query
        .select(`
          id,
          user_id, 
          start_time,
          end_time,
          duration,
          status,
          created_at,
          updated_at,
          user:profiles!short_breaks_user_id_fkey ("Full Name")
        `);
      
      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.fromDate) {
        const fromDate = new Date(filters.fromDate);
        fromDate.setHours(0, 0, 0, 0);
        query = query.gte('start_time', fromDate.toISOString());
      }
      
      if (filters.toDate) {
        const toDate = new Date(filters.toDate);
        toDate.setHours(23, 59, 59, 999);
        query = query.lte('start_time', toDate.toISOString());
      }
      
      // Add pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await query.range(from, to);
      
      if (error) {
        console.error('Error fetching breaks:', error);
        throw error;
      }
      
      return { 
        breaks: data || [],
        totalCount: count || 0
      };
    }
  });

  const updateSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('short_break_settings')
        .update({
          max_slots: parseInt(maxSlots),
          daily_minutes_per_agent: parseInt(dailyMinutes)
        })
        .eq('id', settings?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['short-break-settings'] });
      toast({
        title: "Einstellungen aktualisiert",
        description: "Die Short-Break Einstellungen wurden gespeichert."
      });
    }
  });

  // Handle filter changes
  const handleUserChange = (value) => {
    setFilters(prev => ({
      ...prev,
      userId: value === 'all' ? null : value
    }));
    setPage(1); // Reset to first page when filter changes
  };

  const handleStatusChange = (value) => {
    setFilters(prev => ({
      ...prev,
      status: value === 'all' ? null : value
    }));
    setPage(1);
  };

  const handleFromDateChange = (date) => {
    setFilters(prev => ({
      ...prev,
      fromDate: date
    }));
    setPage(1);
  };

  const handleToDateChange = (date) => {
    setFilters(prev => ({
      ...prev,
      toDate: date
    }));
    setPage(1);
  };

  // Calculate pagination
  const totalPages = breaksData?.totalCount
    ? Math.ceil(breaksData.totalCount / pageSize)
    : 0;

  const goToPage = (pageNumber) => {
    setPage(pageNumber);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Short-Break Einstellungen</h2>
        
        <div className="grid gap-4 max-w-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Maximale gleichzeitige Pausenslots
            </label>
            <Input 
              type="number" 
              value={maxSlots}
              onChange={e => setMaxSlots(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tägliche Pausenminuten pro Agent
            </label>
            <Input 
              type="number"
              value={dailyMinutes}
              onChange={e => setDailyMinutes(e.target.value)}
            />
          </div>
          
          <Button onClick={() => updateSettings.mutate()}>
            Einstellungen speichern
          </Button>
        </div>
      </div>

      <ActiveBreaksList />

      <div>
        <h3 className="text-lg font-semibold mb-4">Pausenhistorie</h3>
        
        {/* Filter Card */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* User filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Benutzer</label>
              <Select 
                value={filters.userId || 'all'} 
                onValueChange={handleUserChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alle Benutzer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Benutzer</SelectItem>
                  {users?.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user["Full Name"]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select 
                value={filters.status || 'all'} 
                onValueChange={handleStatusChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alle Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="completed">Beendet</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="cancelled">Abgebrochen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* From date filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Von Datum</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.fromDate ? (
                      format(filters.fromDate, 'dd.MM.yyyy', { locale: de })
                    ) : (
                      <span>Startdatum wählen</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.fromDate}
                    onSelect={handleFromDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* To date filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Bis Datum</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.toDate ? (
                      format(filters.toDate, 'dd.MM.yyyy', { locale: de })
                    ) : (
                      <span>Enddatum wählen</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.toDate}
                    onSelect={handleToDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </Card>
        
        {breaksLoading ? (
          <div className="text-sm text-muted-foreground">Daten werden geladen...</div>
        ) : breaksData?.breaks && breaksData.breaks.length > 0 ? (
          <>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Ende</TableHead>
                    <TableHead>Dauer</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breaksData.breaks.map((breakItem) => (
                    <TableRow key={breakItem.id}>
                      <TableCell>
                        {breakItem.user?.["Full Name"] || "Unbekannter Nutzer"}
                      </TableCell>
                      <TableCell>
                        {new Date(breakItem.start_time).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {breakItem.end_time ? 
                          new Date(breakItem.end_time).toLocaleString() : 
                          '-'
                        }
                      </TableCell>
                      <TableCell>
                        {breakItem.duration ? 
                          breakItem.duration < 60 ?
                            `${breakItem.duration} Sek.` :
                            `${Math.round(breakItem.duration / 60)} Min.` : 
                          '-'
                        }
                      </TableCell>
                      <TableCell>
                        {breakItem.status === 'completed' ? 'Beendet' : 
                         breakItem.status === 'active' ? 'Aktiv' : 
                         'Abgebrochen'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => page > 1 && goToPage(page - 1)} 
                      className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {/* First page */}
                  {page > 2 && (
                    <PaginationItem>
                      <PaginationLink onClick={() => goToPage(1)}>1</PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Ellipsis */}
                  {page > 3 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  {/* Previous page */}
                  {page > 1 && (
                    <PaginationItem>
                      <PaginationLink onClick={() => goToPage(page - 1)}>{page - 1}</PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Current page */}
                  <PaginationItem>
                    <PaginationLink isActive>{page}</PaginationLink>
                  </PaginationItem>
                  
                  {/* Next page */}
                  {page < totalPages && (
                    <PaginationItem>
                      <PaginationLink onClick={() => goToPage(page + 1)}>{page + 1}</PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Ellipsis */}
                  {page < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  {/* Last page */}
                  {page < totalPages - 1 && (
                    <PaginationItem>
                      <PaginationLink onClick={() => goToPage(totalPages)}>{totalPages}</PaginationLink>
                    </PaginationItem>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => page < totalPages && goToPage(page + 1)}
                      className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Keine Pausendaten verfügbar.</div>
        )}
      </div>
    </div>
  );
}
