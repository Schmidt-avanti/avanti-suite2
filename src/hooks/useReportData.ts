
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import type { Task, TaskStatus } from '@/types';

export type DateRangePreset = 'last7days' | 'thisMonth' | 'lastMonth' | 'custom';

export interface ReportFilters {
  customerId: string | null;
  createdById: string | null;
  status: TaskStatus | null;
  dateRange: {
    from: Date | null;
    to: Date | null;
    preset: DateRangePreset | null;
  };
}

export const useReportData = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; "Full Name": string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  
  const [filters, setFilters] = useState<ReportFilters>({
    customerId: null,
    createdById: null,
    status: null,
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
      preset: null,
    }
  });

  // Hilfsfunktion zum Setzen von Datumsbereich-Voreinstellungen
  const setDateRangePreset = (preset: DateRangePreset) => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;

    switch (preset) {
      case 'last7days':
        from = subDays(now, 7);
        to = now;
        break;
      case 'thisMonth':
        from = startOfMonth(now);
        to = now;
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
      case 'custom':
        // Bei 'custom' bleiben die bestehenden Werte erhalten
        return;
    }

    setFilters(prev => ({
      ...prev,
      dateRange: {
        from,
        to,
        preset
      }
    }));
  };

  // Hilfsfunktion zum Aktualisieren einzelner Filter
  const updateFilter = <K extends keyof ReportFilters>(
    key: K, 
    value: ReportFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Hilfsfunktion zum Aktualisieren von Datumsfiltern
  const updateDateRange = (from: Date | null, to: Date | null) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        from,
        to,
        preset: 'custom'
      }
    }));
  };

  // Funktion zum Zurücksetzen aller Filter
  const resetFilters = () => {
    setFilters({
      customerId: null,
      createdById: null,
      status: null,
      dateRange: {
        from: subDays(new Date(), 30),
        to: new Date(),
        preset: null,
      }
    });
  };

  // Laden der Benutzer und Kunden für die Filter-Dropdowns
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        // Benutzer laden
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, "Full Name"')
          .eq('is_active', true);

        if (usersError) throw usersError;
        setAllUsers(usersData || []);

        // Kunden laden
        let query = supabase
          .from('customers')
          .select('id, name')
          .eq('is_active', true);

        // Für Agents nur zugewiesene Kunden anzeigen
        if (user?.role === 'agent') {
          const { data: assignments } = await supabase
            .from('user_customer_assignments')
            .select('customer_id')
            .eq('user_id', user.id);
          
          if (assignments && assignments.length > 0) {
            const customerIds = assignments.map(a => a.customer_id);
            query = query.in('id', customerIds);
          }
        } else if (user?.role === 'client') {
          const { data: assignment } = await supabase
            .from('user_customer_assignments')
            .select('customer_id')
            .eq('user_id', user.id)
            .single();
          
          if (assignment) {
            query = query.eq('id', assignment.customer_id);
          }
        }

        const { data: customersData, error: customersError } = await query;
        if (customersError) throw customersError;
        setCustomers(customersData || []);
      } catch (err) {
        console.error('Error fetching filter data:', err);
        setError('Fehler beim Laden der Filterdaten');
      }
    };

    fetchFilterData();
  }, [user]);

  // Aufgaben mit angewendeten Filtern laden
  useEffect(() => {
    const fetchFilteredTasks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Basisabfrage mit allen Feldern
        let query = supabase
          .from('tasks')
          .select(`
            id,
            title,
            status,
            created_at,
            created_by,
            customer:customer_id(id, name)
          `)
          .order('created_at', { ascending: false });

        // Datum-Filter anwenden
        if (filters.dateRange.from) {
          query = query.gte('created_at', format(filters.dateRange.from, 'yyyy-MM-dd'));
        }
        if (filters.dateRange.to) {
          // Add 1 day to include the end date fully
          const endDate = new Date(filters.dateRange.to);
          endDate.setDate(endDate.getDate() + 1);
          query = query.lt('created_at', format(endDate, 'yyyy-MM-dd'));
        }

        // Status-Filter anwenden
        if (filters.status) {
          query = query.eq('status', filters.status);
        }

        // Ersteller-Filter anwenden
        if (filters.createdById) {
          query = query.eq('created_by', filters.createdById);
        }

        // Kunden-Filter anwenden
        if (filters.customerId) {
          query = query.eq('customer_id', filters.customerId);
        }

        // Rollenbasierte Einschränkungen
        if (user?.role === 'agent') {
          const { data: assignedCustomers } = await supabase
            .from('user_customer_assignments')
            .select('customer_id')
            .eq('user_id', user.id);

          if (assignedCustomers && assignedCustomers.length > 0) {
            const customerIds = assignedCustomers.map(ac => ac.customer_id);
            query = query.in('customer_id', customerIds);
          }
        } else if (user?.role === 'client') {
          const { data: userAssignment } = await supabase
            .from('user_customer_assignments')
            .select('customer_id')
            .eq('user_id', user.id)
            .single();
            
          if (userAssignment) {
            query = query.eq('customer_id', userAssignment.customer_id);
          }
        }

        // Abfrage ausführen
        const { data, error } = await query;
        
        if (error) throw error;

        // Ersteller-Informationen separat laden
        if (data && data.length > 0) {
          const creatorIds = [...new Set(data.map(task => task.created_by))].filter(id => id);
          
          if (creatorIds.length > 0) {
            const { data: creators } = await supabase
              .from('profiles')
              .select('id, "Full Name"')
              .in('id', creatorIds);

            // Ersteller zu den Aufgaben hinzufügen
            const tasksWithCreator = data.map(task => {
              const creator = creators?.find(c => c.id === task.created_by);
              return {
                ...task,
                creator: creator ? {
                  id: creator.id,
                  "Full Name": creator["Full Name"]
                } : null
              };
            });

            setTasks(tasksWithCreator as Task[]);
          } else {
            setTasks(data as Task[]);
          }
        } else {
          setTasks([]);
        }
      } catch (err) {
        console.error('Error fetching tasks:', err);
        setError('Fehler beim Laden der Aufgaben');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredTasks();
  }, [filters, user]);

  // Berechnete Werte für Kennzahlen
  const kpiData = useMemo(() => {
    const totalTasks = tasks.length;
    const newTasks = tasks.filter(task => task.status === 'new').length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    
    // Aktive Auftraggeber (eindeutige Kunden im ausgewählten Zeitraum)
    const uniqueCustomers = new Set(tasks.map(task => task.customer?.id).filter(Boolean));
    const activeCustomers = uniqueCustomers.size;

    return {
      totalTasks,
      newTasks,
      completedTasks,
      activeCustomers
    };
  }, [tasks]);

  // Daten für das Wochentags-Diagramm
  const weekdayChartData = useMemo(() => {
    const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const counts = Array(7).fill(0);

    tasks.forEach(task => {
      const date = new Date(task.created_at);
      // Wochentag (0 = Sonntag, 1 = Montag, ..., 6 = Samstag)
      let dayOfWeek = date.getDay();
      // Umrechnung auf Montag = 0, ..., Sonntag = 6
      dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      counts[dayOfWeek]++;
    });

    return weekdays.map((day, index) => ({
      name: day,
      tasks: counts[index]
    }));
  }, [tasks]);

  // Daten für das Wochen-Liniendiagramm
  const weeklyChartData = useMemo(() => {
    if (!filters.dateRange.from || !filters.dateRange.to) return [];

    const startDate = new Date(filters.dateRange.from);
    const endDate = new Date(filters.dateRange.to);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Bestimme die Granularität basierend auf dem Datumsbereich
    // Für Zeiträume bis zu 14 Tagen: nach Tagen
    // Für längere Zeiträume: nach Wochen
    const byDay = diffDays <= 14;

    const result = [];
    const tasksByDate = new Map();

    // Gruppiere Aufgaben nach Datum oder Woche
    tasks.forEach(task => {
      const date = new Date(task.created_at);
      let key;
      
      if (byDay) {
        key = format(date, 'yyyy-MM-dd');
      } else {
        // Wochennummer berechnen (Montag als erster Tag)
        const weekStart = new Date(date);
        const dayOfWeek = date.getDay() || 7; // 0 = Sonntag, 1-6 = Montag-Samstag
        weekStart.setDate(date.getDate() - dayOfWeek + 1);
        key = format(weekStart, 'yyyy-MM-dd');
      }

      if (!tasksByDate.has(key)) {
        tasksByDate.set(key, 0);
      }
      tasksByDate.set(key, tasksByDate.get(key) + 1);
    });

    // Für jeden Tag oder jede Woche im Bereich einen Eintrag erstellen
    let current = new Date(startDate);
    
    while (current <= endDate) {
      let key, label;
      
      if (byDay) {
        key = format(current, 'yyyy-MM-dd');
        label = format(current, 'dd.MM.');
      } else {
        // Wochenbeginn (Montag) der aktuellen Woche
        const weekDayNum = current.getDay() || 7;
        const weekStart = new Date(current);
        weekStart.setDate(current.getDate() - weekDayNum + 1);
        key = format(weekStart, 'yyyy-MM-dd');
        label = `KW ${format(weekStart, 'w')}`;
      }

      result.push({
        date: label,
        tasks: tasksByDate.get(key) || 0
      });

      // Zum nächsten Tag oder zur nächsten Woche
      if (byDay) {
        current.setDate(current.getDate() + 1);
      } else {
        current.setDate(current.getDate() + 7);
      }
    }

    return result;
  }, [tasks, filters.dateRange]);

  return {
    tasks,
    allUsers,
    customers,
    kpiData,
    weekdayChartData,
    weeklyChartData,
    filters,
    isLoading,
    error,
    updateFilter,
    updateDateRange,
    setDateRangePreset,
    resetFilters
  };
};
