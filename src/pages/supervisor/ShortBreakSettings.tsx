import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Save, Calendar as CalendarIcon, Download, Check, Circle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveBreaksList } from '@/components/short-break/ActiveBreaksList';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ShortBreakUser {
  id: string;
  "Full Name": string;
}

interface ShortBreak {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface BreakHistoryFilters {
  userId: string | null;
  status: string | null;
  fromDate: Date | null;
  toDate: Date | null;
}

interface ShortBreakSettings {
  id: string;
  max_slots: number;
  daily_minutes_per_agent: number;
}

export default function ShortBreakSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [maxSlots, setMaxSlots] = useState('5');
  const [dailyMinutes, setDailyMinutes] = useState('20');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [filters, setFilters] = useState<BreakHistoryFilters>({
    userId: null,
    status: null,
    fromDate: null,
    toDate: null
  });

  const { data: settings } = useQuery({
    queryKey: ['short-break-settings'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('short_break_settings')
          .select('*')
          .single();
        
        if (error) {
          console.error('Error fetching settings:', error);
          throw error;
        }
        
        if (data) {
          setMaxSlots(data.max_slots.toString());
          setDailyMinutes(data.daily_minutes_per_agent.toString());
        }
        
        return data as ShortBreakSettings;
      } catch (err) {
        console.error('Exception in settings query:', err);
        throw err;
      }
    }
  });

  const { data: users } = useQuery({
    queryKey: ['users-for-breaks'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, "Full Name"')
          .order('"Full Name"', { ascending: true });
        
        if (error) {
          console.error('Error fetching users:', error);
          throw error;
        }
        
        return data || [];
      } catch (err) {
        console.error('Exception in users query:', err);
        throw err;
      }
    }
  });

  const userMap = new Map<string, string>();
  if (users) {
    users.forEach(user => {
      userMap.set(user.id, user["Full Name"]);
    });
  }

  const { data: breaksData, isLoading: breaksLoading } = useQuery({
    queryKey: ['break-history', page, filters],
    queryFn: async () => {
      try {
        console.log('Fetching admin breaks with filters:', filters);
        
        let query = supabase
          .from('short_breaks')
          .select('*', { count: 'exact' });
        
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
        
        query = query.order('start_time', { ascending: false });
        
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        
        const { data, error, count } = await query.range(from, to);
        
        if (error) {
          console.error('Error fetching breaks:', error);
          throw error;
        }
        
        console.log('Successfully fetched breaks data:', data?.length || 0, 'records');
        
        return { 
          breaks: data as ShortBreak[],
          totalCount: count || 0
        };
      } catch (err) {
        console.error('Exception in breaks query:', err);
        throw err;
      }
    }
  });

  const updateSettings = useMutation({
    mutationFn: async () => {
      if (!settings?.id) {
        throw new Error("No settings ID available");
      }

      const { error } = await supabase
        .from('short_break_settings')
        .update({
          max_slots: parseInt(maxSlots),
          daily_minutes_per_agent: parseInt(dailyMinutes)
        })
        .eq('id', settings.id);
      
      if (error) {
        console.error('Error updating settings:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['short-break-settings'] });
      toast({
        title: "Einstellungen aktualisiert",
        description: "Die Short-Break Einstellungen wurden gespeichert."
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Speichern der Einstellungen: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleUserChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      userId: value === 'all' ? null : value
    }));
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      status: value === 'all' ? null : value
    }));
    setPage(1);
  };

  const handleFromDateChange = (date: Date | null) => {
    setFilters(prev => ({
      ...prev,
      fromDate: date
    }));
    setPage(1);
  };

  const handleToDateChange = (date: Date | null) => {
    setFilters(prev => ({
      ...prev,
      toDate: date
    }));
    setPage(1);
  };

  const totalPages = breaksData?.totalCount
    ? Math.ceil(breaksData.totalCount / pageSize)
    : 0;

  const goToPage = (pageNumber: number) => {
    setPage(pageNumber);
  };

  const formatDuration = (duration: number | null): string => {
    if (!duration) return '-';
    
    return duration < 60
      ? `${duration} Sek.`
      : `${Math.round(duration / 60)} Min.`;
  };

  const formatStatus = (status: string): string => {
    switch (status) {
      case 'completed': return 'Beendet';
      case 'active': return 'Aktiv';
      case 'cancelled': return 'Abgebrochen';
      default: return status;
    }
  };

  const getUserName = (user_id: string): string => {
    return userMap.get(user_id) || "Unbekannter Nutzer";
  };

  return (
    <div className="space-y-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Short-Break Einstellungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 max-w-sm">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Maximale gleichzeitige Pausenslots
              </label>
              <Input 
                type="number" 
                value={maxSlots}
                onChange={e => setMaxSlots(e.target.value)}
                className="w-full"
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
                className="w-full"
              />
            </div>
            
            <div className="flex justify-end mt-4">
              <Button 
                onClick={() => updateSettings.mutate()}
                disabled={updateSettings.isPending}
                className="w-full sm:w-auto"
              >
                <Save className="mr-2 h-4 w-4" />
                {updateSettings.isPending ? 'Wird gespeichert...' : 'Einstellungen speichern'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ActiveBreaksList />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pausenhistorie</CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['break-history'] })}
              title="Aktualisieren"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              title="Als CSV exportieren"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Card className="p-4 mb-6 bg-muted/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Benutzer</label>
                <Select 
                  value={filters.userId || 'all'} 
                  onValueChange={handleUserChange}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Alle Benutzer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Benutzer</SelectItem>
                    {users?.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user["Full Name"]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select 
                  value={filters.status || 'all'} 
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="w-full bg-background">
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Von Datum</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-background"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.fromDate ? (
                        format(filters.fromDate, 'dd.MM.yyyy', { locale: de })
                      ) : (
                        <span>Startdatum wählen</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.fromDate}
                      onSelect={handleFromDateChange}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Bis Datum</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-background"
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
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </Card>

          {breaksLoading ? (
            <div className="text-sm text-muted-foreground p-4">Daten werden geladen...</div>
          ) : !breaksData || breaksData.breaks.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4">Keine Pausendaten verfügbar.</div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                {breaksData.totalCount} {breaksData.totalCount === 1 ? 'Pause' : 'Pausen'} gefunden
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
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
                      <TableRow key={breakItem.id} className="hover:bg-muted/50">
                        <TableCell>
                          {getUserName(breakItem.user_id)}
                        </TableCell>
                        <TableCell>
                          {new Date(breakItem.start_time).toLocaleString('de-DE')}
                        </TableCell>
                        <TableCell>
                          {breakItem.end_time ? 
                            new Date(breakItem.end_time).toLocaleString('de-DE') : 
                            '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {formatDuration(breakItem.duration)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {breakItem.status === 'completed' ? (
                            <Badge variant="success" className="gap-1">
                              <Check className="h-3 w-3" /> Beendet
                            </Badge>
                          ) : breakItem.status === 'active' ? (
                            <Badge variant="warning" className="gap-1">
                              <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" /> Aktiv
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              Abgebrochen
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => page > 1 && goToPage(page - 1)} 
                        className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {page > 2 && (
                      <PaginationItem>
                        <PaginationLink onClick={() => goToPage(1)}>1</PaginationLink>
                      </PaginationItem>
                    )}
                    
                    {page > 3 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    
                    {page > 1 && (
                      <PaginationItem>
                        <PaginationLink onClick={() => goToPage(page - 1)}>{page - 1}</PaginationLink>
                      </PaginationItem>
                    )}
                    
                    <PaginationItem>
                      <PaginationLink isActive>{page}</PaginationLink>
                    </PaginationItem>
                    
                    {page < totalPages && (
                      <PaginationItem>
                        <PaginationLink onClick={() => goToPage(page + 1)}>{page + 1}</PaginationLink>
                      </PaginationItem>
                    )}
                    
                    {page < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
