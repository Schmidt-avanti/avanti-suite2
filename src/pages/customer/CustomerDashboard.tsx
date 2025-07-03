import { useEffect, useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, subWeeks, startOfWeek, endOfWeek, parseISO, addMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';

// UI-Komponenten
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Plus, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import { ClipboardList, Clock, FileCheck2, RefreshCw, AlertCircle } from 'lucide-react';

// Supabase-Client wird aus der zentralen Datei importiert

// Typen
type CustomerSimple = {
  id: string;
  name: string;
};

type Customer = CustomerSimple & {
  products: string[];
  options?: string[];
  contract_type?: 'inbound' | 'outbound' | null;
  start_date?: string;
};

type Product = {
  id: string;
  name: string;
  description?: string;
};

type Option = {
  id: string;
  name: string;
  description?: string;
};

type DateRange = {
  from: Date;
  to: Date;
};

type TaskStats = {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  followup: number;
};

const CustomerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<CustomerSimple[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0,
    followup: 0
  });
  const [dateRangeType, setDateRangeType] = useState('current_month');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date()
  });
  const [inboundMinutes, setInboundMinutes] = useState({
    used: 0,
    included: 0,
    percentage: 0
  });
  const [outboundMinutes, setOutboundMinutes] = useState({
    used: 0,
    included: 0,
    percentage: 0
  });
  const [outboundDialogOpen, setOutboundDialogOpen] = useState(false);
  const [newOutboundEntry, setNewOutboundEntry] = useState({
    date: new Date(),
    minutes: 0,
    description: ''
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [dailyUsage, setDailyUsage] = useState<{date: string, minutes: number}[]>([]);
  const [manageOutboundDialogOpen, setManageOutboundDialogOpen] = useState(false);
  const [outboundTimes, setOutboundTimes] = useState<any[]>([]);
  const [editingOutbound, setEditingOutbound] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Hilfsfunktion: Abrechnungsintervall für einen Kunden berechnen
  function getBillingInterval(startDateStr: string | undefined, reference: Date = new Date()) {
    if (!startDateStr) return { from: startOfMonth(reference), to: endOfMonth(reference) };
    const startDate = parseISO(startDateStr);
    const ref = reference;
    let from = new Date(startDate);
    while (from <= ref) {
      const next = addMonths(from, 1);
      if (ref < next) break;
      from = next;
    }
    const to = subDays(addMonths(from, 1), 1);
    return { from, to };
  }

  // Effekt: Zeitraum basierend auf der Auswahl setzen
  useEffect(() => {
    const now = new Date();
    let from: Date, to: Date;

    if (dateRangeType === 'current_month' && customer?.start_date) {
      const interval = getBillingInterval(customer.start_date, now);
      from = interval.from;
      to = interval.to;
    } else {
      switch (dateRangeType) {
        case 'yesterday':
          from = subDays(now, 1);
          to = subDays(now, 1);
          break;
        case 'last_week':
          from = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
          to = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
          break;
        case 'last_month':
          from = startOfMonth(subMonths(now, 1));
          to = endOfMonth(subMonths(now, 1));
          break;
        case 'current_month':
        default:
          from = startOfMonth(now);
          to = now;
      }
    }
    setDateRange({ from, to });
  }, [dateRangeType, customer]);

  // Effekt: Alle Kunden laden (für Admin)
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!user || user.role !== 'admin') return;
      
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name')
          .order('name');
          
        if (error) throw error;
        
        if (data) {
          setCustomers(data);
        }
      } catch (error: any) {
        console.error('Fehler beim Laden der Kundenliste:', error.message);
      }
    };
    
    fetchCustomers();
  }, [user]);

  // Effekt: Kundendaten laden
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        let customerId;
        
        if (user.role === 'customer') {
          // Für Customer-Benutzer: eigene ID verwenden
          customerId = user.customer_id;
        } else if (user.role === 'admin') {
          // Für Admin: ausgewählten Kunden verwenden
          customerId = selectedCustomerId;
          if (!customerId) {
            setLoading(false);
            return; // Nichts anzeigen, wenn kein Kunde ausgewählt
          }
        }
        
        if (!customerId) {
          setLoading(false);
          return;
        }
        
        // Kundendaten abrufen mit Beziehungen
        const { data, error } = await supabase
          .from('customers')
          .select(`
            id, 
            name, 
            contract_type,
            start_date,
            products,
            options
          `)
          .eq('id', customerId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          // Kundenobjekt erstellen
          setCustomer({
            id: data.id,
            name: data.name,
            contract_type: data.contract_type,
            products: Array.isArray(data.products) ? data.products : [],
            options: Array.isArray(data.options) ? data.options : [],
            start_date: data.start_date
          });
          
          // Da products und options bereits als Arrays in der Tabelle existieren,
          // müssen wir sie nicht separat laden
        }
      } catch (error: any) {
        console.error('Fehler beim Laden der Kundeninformationen:', error.message);
        toast({
          title: 'Fehler',
          description: `Kundendaten konnten nicht geladen werden: ${error.message}`,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomerData();
  }, [user, selectedCustomerId, toast]);

  // Produkte und Optionen nachladen, sobald customer gesetzt ist
  useEffect(() => {
    const fetchProductsAndOptions = async () => {
      if (!customer) {
        setProducts([]);
        setOptions([]);
        return;
      }
      // Debug: IDs anzeigen
      console.log('Geladene Produkt-IDs:', customer.products);
      console.log('Geladene Options-IDs:', customer.options);
      // Produkte laden
      if (customer.products && customer.products.length > 0) {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name')
          .in('id', customer.products);
        console.log('Query-Ergebnis Produkte:', productsData, productsError);
        if (!productsError && productsData) {
          setProducts(productsData);
        } else {
          setProducts([]);
        }
      } else {
        setProducts([]);
      }
      // Optionen laden
      if (customer.options && customer.options.length > 0) {
        const { data: optionsData, error: optionsError } = await supabase
          .from('product_options')
          .select('id, name')
          .in('id', customer.options);
        console.log('Query-Ergebnis Optionen:', optionsData, optionsError);
        if (!optionsError && optionsData) {
          setOptions(optionsData);
        } else {
          setOptions([]);
        }
      } else {
        setOptions([]);
      }
    };
    fetchProductsAndOptions();
  }, [customer]);

  // Effekt: Aufgabenstatistiken laden
  useEffect(() => {
    const fetchTaskStats = async () => {
      if (!customer?.id) return;
      
      try {
        const from = format(dateRange.from, 'yyyy-MM-dd');
        const to = format(dateRange.to, 'yyyy-MM-dd');
        
        const { data, error } = await supabase
          .from('tasks')
          .select('status')
          .eq('customer_id', customer.id)
          .gte('created_at', `${from}T00:00:00Z`)
          .lte('created_at', `${to}T23:59:59Z`);
          
        if (error) throw error;
        
        const stats: TaskStats = {
          total: data?.length || 0,
          open: data?.filter(task => task.status === 'open').length || 0,
          inProgress: data?.filter(task => task.status === 'in_progress').length || 0,
          completed: data?.filter(task => task.status === 'completed').length || 0,
          followup: data?.filter(task => task.status === 'followup').length || 0
        };
        
        setTaskStats(stats);
      } catch (error: any) {
        console.error('Fehler beim Laden der Aufgabenstatistiken:', error.message);
      }
    };
    
    fetchTaskStats();
  }, [customer, dateRange]);

  // Effekt: Inbound/Outbound Nutzung laden
  useEffect(() => {
    if (!customer) return;
    
    if (customer.contract_type === 'inbound') {
      fetchInboundUsage();
    } else if (customer.contract_type === 'outbound') {
      fetchOutboundUsage();
    }
  }, [customer, dateRange]);

  // Hilfsfunktionen für Inbound/Outbound
  const fetchInboundUsage = async () => {
    if (!customer?.id) return;
    try {
      const from = format(dateRange.from, 'yyyy-MM-dd');
      const to = format(dateRange.to, 'yyyy-MM-dd');
      // Debug: Filterparameter anzeigen
      console.log('fetchInboundUsage: customer_id', customer.id, 'from', from, 'to', to);
      // Alle task_times für den Kunden abrufen
      const { data: taskTimesData, error } = await supabase
        .from('task_times')
        .select(`
          time_spent_task,
          tasks!inner(customer_id)
        `)
        .eq('tasks.customer_id', customer.id)
        .gte('created_at', `${from}T00:00:00Z`)
        .lte('created_at', `${to}T23:59:59Z`);
      console.log('Geladene Inbound-Zeiten:', taskTimesData, error);
      if (error) throw error;
      // Sekunden in Minuten umrechnen
      const totalSeconds = taskTimesData?.reduce((sum, item) => {
        return sum + (item.time_spent_task || 0);
      }, 0) || 0;
      const totalMinutes = Math.ceil(totalSeconds / 60);
      // Produkte abrufen, um die Inklusivminuten zu bestimmen
      let includedMinutes = 0;
      if (customer.products && customer.products.length > 0) {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('minutes')
          .in('id', customer.products);
        if (!productsError && productsData) {
          // Alle minutes-Werte der Produkte summieren
          includedMinutes = productsData.reduce((sum, product) => {
            return sum + (product.minutes || 0);
          }, 0);
        }
      }
      // Prozentsatz berechnen
      const percentage = includedMinutes > 0 
        ? Math.min(100, (totalMinutes / includedMinutes) * 100) 
        : 0;
      // Logging für Debug
      console.log('DEBUG inbound usage:', {
        used: totalMinutes,
        included: includedMinutes,
        percentage
      });
      setInboundMinutes({
        used: totalMinutes,
        included: includedMinutes,
        percentage
      });
    } catch (error: any) {
      console.error('Fehler beim Laden der Inbound-Nutzung:', error.message);
    }
  };

  const fetchOutboundUsage = async () => {
    if (!customer?.id) return;
    try {
      const from = format(dateRange.from, 'yyyy-MM-dd');
      const to = format(dateRange.to, 'yyyy-MM-dd');
      // Debug: Filterparameter anzeigen
      console.log('fetchOutboundUsage: customer_id', customer.id, 'from', from, 'to', to);
      // Outbound-Zeiten für den Kunden und Zeitraum abrufen
      const { data: outboundData, error } = await supabase
        .from('outbound_times')
        .select('minutes, date')
        .eq('customer_id', customer.id)
        .gte('date', from)
        .lte('date', to);
      console.log('Geladene Outbound-Zeiten:', outboundData, error);
      if (error) throw error;
      const totalMinutes = outboundData?.reduce((sum, item) => sum + (item.minutes || 0), 0) || 0;
      // Produkte abrufen, um die Outbound-Stunden zu bestimmen
      let includedHours = 0;
      if (customer.products && customer.products.length > 0) {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('outbound_hours, name')
          .in('id', customer.products);
        if (productsError) throw productsError;
        if (productsData && productsData.length > 0) {
          includedHours = productsData.reduce((sum, product) => sum + (product.outbound_hours || 0), 0);
        }
      }
      const includedMinutes = includedHours * 60;
      const percentage = includedMinutes > 0 
        ? Math.min(100, (totalMinutes / includedMinutes) * 100) 
        : 0;
      setOutboundMinutes({
        used: totalMinutes,
        included: includedMinutes,
        percentage
      });
    } catch (error: any) {
      console.error('Fehler beim Laden der Outbound-Nutzung:', error.message);
    }
  };

  const handleAddOutboundTime = async () => {
    if (!customer?.id || !user?.id) return;
    try {
      if (newOutboundEntry.minutes <= 0) {
        toast({
          title: 'Fehler',
          description: 'Die Anzahl der Minuten muss größer als 0 sein.',
          variant: 'destructive',
        });
        return;
      }
      const { error } = await supabase
        .from('outbound_times')
        .insert({
          customer_id: customer.id,
          created_by: user.id,
          date: format(newOutboundEntry.date, 'yyyy-MM-dd'),
          minutes: newOutboundEntry.minutes,
          description: newOutboundEntry.description
        });
      if (error) throw error;
      toast({
        title: 'Erfolgreich',
        description: 'Die Outbound-Zeit wurde erfolgreich gespeichert.'
      });
      setNewOutboundEntry({
        date: new Date(),
        minutes: 0,
        description: ''
      });
      setOutboundDialogOpen(false);
      fetchOutboundUsage();
      fetchRecentTasksAndDailyUsage();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: `Die Outbound-Zeit konnte nicht gespeichert werden: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  // Aufgaben und Tagesverlauf laden
  const fetchRecentTasksAndDailyUsage = async () => {
    // Debug: Rolle, User, Customer, Zeitraum
    console.log('TAGESVERLAUF-DEBUG: Rolle:', user?.role, 'user.id:', user?.id, 'customer.id:', customer?.id, 'contract_type:', customer?.contract_type);
    if (!customer?.id) return;
    // UTC-Korrektur für from/to
    const from = new Date(Date.UTC(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate()));
    const to = new Date(Date.UTC(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate()));
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    // Letzte 10 Aufgaben (nur existierende Felder abfragen)
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('id, title, status, created_at')
      .eq('customer_id', customer.id)
      .gte('created_at', `${fromStr}T00:00:00Z`)
      .lte('created_at', `${toStr}T23:59:59Z`)
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentTasks(tasksData || []);
    // Tagesverlauf: je nach Vertragstyp
    let days: string[] = [];
    let d = new Date(from);
    while (d <= to) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        days.push(d.toISOString().slice(0, 10));
      }
      d.setUTCDate(d.getUTCDate() + 1);
    }
    let usageMap: Record<string, number> = {};
    if (customer.contract_type === 'outbound') {
      // Outbound: Minuten aus outbound_times
      const { data: outboundData } = await supabase
        .from('outbound_times')
        .select('date, minutes')
        .eq('customer_id', customer.id)
        .gte('date', fromStr)
        .lte('date', toStr);
      (outboundData || []).forEach(entry => {
        if (!usageMap[entry.date]) usageMap[entry.date] = 0;
        usageMap[entry.date] += entry.minutes || 0;
      });
    } else {
      // Inbound: Minuten aus task_times
      const { data: taskTimes } = await supabase
        .from('task_times')
        .select('time_spent_task, created_at, tasks!inner(customer_id)')
        .eq('tasks.customer_id', customer.id)
        .gte('created_at', `${fromStr}T00:00:00Z`)
        .lte('created_at', `${toStr}T23:59:59Z`);
      (taskTimes || []).forEach(t => {
        const day = t.created_at.slice(0, 10);
        if (!usageMap[day]) usageMap[day] = 0;
        usageMap[day] += t.time_spent_task || 0;
      });
    }
    // Debug: Zeitraum und Daten
    console.log('TAGESVERLAUF-DEBUG: Zeitraum:', { from, to, fromStr, toStr, days }, 'usageMap:', usageMap);
    setDailyUsage(days.map(day => ({ date: day, minutes: Math.ceil((usageMap[day] || 0) / 60) })));
  };
  useEffect(() => {
    fetchRecentTasksAndDailyUsage();
  }, [customer, dateRange]);

  // Outbound-Zeiten für den Zeitraum laden (nur für Admin)
  useEffect(() => {
    const fetchOutboundTimes = async () => {
      if (user?.role !== 'admin' || !customer?.id || customer.contract_type !== 'outbound') {
        setOutboundTimes([]);
        return;
      }
      const from = format(dateRange.from, 'yyyy-MM-dd');
      const to = format(dateRange.to, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('outbound_times')
        .select('id, date, minutes, description, created_by')
        .eq('customer_id', customer.id)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false });
      if (!error && data) setOutboundTimes(data);
      else setOutboundTimes([]);
    };
    if (manageOutboundDialogOpen) fetchOutboundTimes();
  }, [user, customer, dateRange, manageOutboundDialogOpen]);

  // Hilfskomponente: DateRangePicker
  const DateRangePicker = () => (
    <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
      <Select value={dateRangeType} onValueChange={setDateRangeType}>
        <SelectTrigger className="w-full md:w-[200px]">
          <SelectValue placeholder="Zeitraum wählen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current_month">Aktueller Monat</SelectItem>
          <SelectItem value="last_month">Letzter Monat</SelectItem>
          <SelectItem value="last_week">Letzte Woche</SelectItem>
          <SelectItem value="yesterday">Gestern</SelectItem>
          <SelectItem value="custom">Benutzerdefiniert</SelectItem>
        </SelectContent>
      </Select>
      
      {dateRangeType === 'custom' && (
        <div className="flex items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span>
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd.MM.yy")} - {format(dateRange.to, "dd.MM.yy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd.MM.yy")
                    )
                  ) : (
                    <span>Zeitraum wählen</span>
                  )}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => range && setDateRange(range as DateRange)}
                disabled={(date) => date > new Date()}
                initialFocus
                locale={de}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );

  // Anzeige des Abrechnungsintervalls im UI
  const billingIntervalString = customer?.start_date && dateRangeType === 'current_month'
    ? `${format(dateRange.from, 'dd.MM.yyyy')} - ${format(dateRange.to, 'dd.MM.yyyy')}`
    : '';

  // Ladezustand
  if (loading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-8 w-[250px]" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-[120px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px] mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const handleSaveOutboundEdit = async () => {
    if (!editingOutbound) return;
    try {
      const { error } = await supabase
        .from('outbound_times')
        .update({
          date: editingOutbound.date,
          minutes: editingOutbound.minutes,
          description: editingOutbound.description
        })
        .eq('id', editingOutbound.id);
      if (error) throw error;
      toast({ title: 'Gespeichert', description: 'Die Outbound-Zeit wurde aktualisiert.' });
      setOutboundTimes(prev => prev.map(e => e.id === editingOutbound.id ? { ...e, ...editingOutbound } : e));
      setEditingOutbound(null);
      // Grafiken und Zeitnutzung aktualisieren
      fetchOutboundUsage();
      fetchRecentTasksAndDailyUsage();
    } catch (error: any) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteOutbound = async () => {
    if (!deleteTargetId) return;
    try {
      const { error } = await supabase
        .from('outbound_times')
        .delete()
        .eq('id', deleteTargetId);
      if (error) throw error;
      toast({ title: 'Gelöscht', description: 'Die Outbound-Zeit wurde gelöscht.' });
      setOutboundTimes(prev => prev.filter(e => e.id !== deleteTargetId));
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
      // Grafiken und Zeitnutzung aktualisieren
      fetchOutboundUsage();
      fetchRecentTasksAndDailyUsage();
    } catch (error: any) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Kunden-Dashboard</h1>
          {/* Nur für Admins: Kundenauswahl anzeigen */}
          {user?.role === 'admin' && (
            <div className="mb-4">
              <Select 
                value={selectedCustomerId} 
                onValueChange={setSelectedCustomerId}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Kunde auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((cust) => (
                    <SelectItem key={cust.id} value={cust.id}>{cust.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {/* Für Kunden und Admins: Info-Text */}
          {user?.role === 'customer' && customer ? (
            <p className="text-muted-foreground">Dashboard für {customer.name}</p>
          ) : user?.role === 'admin' && customer ? (
            <p className="text-muted-foreground">Dashboard für {customer.name}</p>
          ) : user?.role === 'admin' && !selectedCustomerId ? (
            <p className="text-muted-foreground">Bitte wählen Sie einen Kunden aus</p>
          ) : (
            <p className="text-muted-foreground">Kunde wird geladen...</p>
          )}
        </div>
        {/* Zeitraum-Auswahl bleibt für beide Rollen */}
        {(customer || user?.role !== 'admin') && <DateRangePicker />}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Gesamtzahl der Aufgaben */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aufgaben Gesamt</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.total}</div>
              <p className="text-xs text-muted-foreground">
                Im ausgewählten Zeitraum
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Offene Aufgaben */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offene Aufgaben</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.open + taskStats.inProgress}</div>
              <p className="text-xs text-muted-foreground">
                In Bearbeitung: {taskStats.inProgress}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Erledigte Aufgaben */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Erledigte Aufgaben</CardTitle>
              <FileCheck2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.completed}</div>
              <p className="text-xs text-muted-foreground">
                Abgeschlossen im Zeitraum
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Wiedervorlage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wiedervorlage</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.followup}</div>
              <p className="text-xs text-muted-foreground">
                Aufgaben in Wiedervorlage
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Hauptbereich: Zwei Boxen nebeneinander */}
      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Produkte & Optionen</CardTitle>
            <CardDescription>
              Ihre aktiven Produkte und Optionen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {products.length > 0 ? (
              <div>
                <h4 className="font-medium mb-2">Produkte</h4>
                <ul className="space-y-1">
                  {products.map(product => (
                    <li key={product.id} className="text-sm">
                      • {product.name}
                      {(customer?.contract_type || customer?.start_date) &&
                        ` (${customer?.contract_type || ''}${customer?.contract_type && customer?.start_date ? ', ' : ''}${customer?.start_date ? format(parseISO(customer.start_date), 'dd.MM.yyyy') : ''})`
                      }
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            
            {options.length > 0 ? (
              <div>
                <h4 className="font-medium mb-2">Optionen</h4>
                <ul className="space-y-1">
                  {options.map(option => (
                    <li key={option.id} className="text-sm">
                      • {option.name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            
            {products.length === 0 && options.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                Keine Produkte oder Optionen zugewiesen
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Zeitnutzung</CardTitle>
            <CardDescription>
              {customer?.contract_type === 'inbound' ? 'Inbound-Minuten' : 'Outbound-Stunden'} im Zeitraum
              {billingIntervalString && (
                <span className="block text-xs text-muted-foreground">{billingIntervalString}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            {customer?.contract_type === 'inbound' ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Genutzte Zeit:</span>
                  <span className="font-medium">{inboundMinutes.used} Minuten</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Inklusive Zeit:</span>
                  <span className="font-medium">{inboundMinutes.included} Minuten</span>
                </div>
                <Progress 
                  value={inboundMinutes.percentage} 
                  className={cn("h-2", 
                    inboundMinutes.percentage > 90 ? "bg-red-500" : 
                    inboundMinutes.percentage > 75 ? "bg-amber-500" : 
                    "bg-emerald-500"
                  )} 
                />
                <div className="text-xs text-right text-muted-foreground">
                  {inboundMinutes.percentage.toFixed(1)}% genutzt
                </div>
              </div>
            ) : customer?.contract_type === 'outbound' ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Genutzte Zeit:</span>
                  <span className="font-medium">{(outboundMinutes.used / 60).toFixed(1)} Stunden</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Inklusive Zeit:</span>
                  <span className="font-medium">{(outboundMinutes.included / 60).toFixed(1)} Stunden</span>
                </div>
                <Progress 
                  value={outboundMinutes.percentage} 
                  className={cn("h-2", 
                    outboundMinutes.percentage > 90 ? "bg-red-500" : 
                    outboundMinutes.percentage > 75 ? "bg-amber-500" : 
                    "bg-emerald-500"
                  )} 
                />
                <div className="text-xs text-right text-muted-foreground">
                  {outboundMinutes.percentage.toFixed(1)}% genutzt
                </div>
                {user?.role === 'admin' && customer?.contract_type === 'outbound' && (
                  <div className="px-6 pb-2 flex flex-col gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="w-full"
                      onClick={() => setOutboundDialogOpen(true)}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Outbound-Zeit eintragen
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => setManageOutboundDialogOpen(true)}
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Outbound-Zeiten verwalten
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                Kein Vertragstyp definiert
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Untere Bereiche: Zwei Boxen nebeneinander */}
      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Letzte 10 Aufgaben</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="text-muted-foreground">Keine Aufgaben im Zeitraum</div>
            ) : (
              <ul className="space-y-2">
                {recentTasks.map(task => (
                  <li key={task.id} className="border-b pb-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{task.title || 'Ohne Titel'}</span>
                      <span className="text-xs text-muted-foreground">{format(parseISO(task.created_at), 'dd.MM.yyyy')}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Status: {task.status}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tagesverlauf (nur Werktage)</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar
              data={{
                labels: dailyUsage.map(d => format(parseISO(d.date), 'dd.MM.')), 
                datasets: [{
                  label: 'Minuten',
                  data: dailyUsage.map(d => d.minutes),
                  backgroundColor: '#3b82f6',
                }]
              }}
              options={{
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Minuten' } } }
              }}
              height={180}
            />
          </CardContent>
        </Card>
      </div>

      {/* Outbound Dialog */}
      {user?.role === 'admin' && customer?.contract_type === 'outbound' && (
        <Dialog open={outboundDialogOpen} onOpenChange={setOutboundDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Outbound-Zeit erfassen</DialogTitle>
              <DialogDescription>
                Erfasse hier die Outbound-Zeit für den Kunden. Bitte Datum, Minuten und eine kurze Beschreibung angeben.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Datum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(newOutboundEntry.date, 'dd.MM.yyyy', { locale: de })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newOutboundEntry.date}
                      onSelect={(date) => date && setNewOutboundEntry(prev => ({ ...prev, date }))}
                      initialFocus
                      locale={de}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minutes">Minuten</Label>
                <Input
                  id="minutes"
                  type="number"
                  min="1"
                  value={newOutboundEntry.minutes || ''}
                  onChange={(e) => setNewOutboundEntry(prev => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={newOutboundEntry.description}
                  onChange={(e) => setNewOutboundEntry(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Kurze Beschreibung der geleisteten Arbeit"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOutboundDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleAddOutboundTime}>Speichern</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Outbound Zeiten verwalten Modal */}
      {user?.role === 'admin' && customer?.contract_type === 'outbound' && (
        <Dialog open={manageOutboundDialogOpen} onOpenChange={setManageOutboundDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Outbound-Zeiten verwalten</DialogTitle>
              <DialogDescription>
                Alle Outbound-Zeiten für den gewählten Zeitraum. Sie können Einträge bearbeiten oder löschen.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 border">Datum</th>
                    <th className="px-2 py-1 border">Minuten</th>
                    <th className="px-2 py-1 border">Beschreibung</th>
                    <th className="px-2 py-1 border">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {outboundTimes.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-4 text-muted-foreground">Keine Outbound-Zeiten im Zeitraum</td></tr>
                  ) : outboundTimes.map((entry) => (
                    <tr key={entry.id} className="border-b">
                      <td className="px-2 py-1 border">{format(parseISO(entry.date), 'dd.MM.yyyy')}</td>
                      <td className="px-2 py-1 border">{entry.minutes}</td>
                      <td className="px-2 py-1 border">{entry.description}</td>
                      <td className="px-2 py-1 border flex gap-2">
                        <Button size="icon" variant="ghost" onClick={() => setEditingOutbound(entry)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="destructive" onClick={() => { setDeleteTargetId(entry.id); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Bearbeiten-Modal (Platzhalter) */}
            {editingOutbound && (
              <Dialog open={true} onOpenChange={() => setEditingOutbound(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Outbound-Zeit bearbeiten</DialogTitle>
                  </DialogHeader>
                  {/* Felder für Datum, Minuten, Beschreibung */}
                  <div className="grid gap-2">
                    <Label>Datum</Label>
                    <Input type="date" value={editingOutbound.date} onChange={e => setEditingOutbound({ ...editingOutbound, date: e.target.value })} />
                    <Label>Minuten</Label>
                    <Input type="number" value={editingOutbound.minutes} onChange={e => setEditingOutbound({ ...editingOutbound, minutes: parseInt(e.target.value) })} />
                    <Label>Beschreibung</Label>
                    <Textarea value={editingOutbound.description} onChange={e => setEditingOutbound({ ...editingOutbound, description: e.target.value })} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingOutbound(null)}>Abbrechen</Button>
                    <Button onClick={handleSaveOutboundEdit}>Speichern</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Bestätigungsdialog für Löschen */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Soll dieser Outbound-Zeit-Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOutbound}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerDashboard;
