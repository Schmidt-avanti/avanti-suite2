
import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar as CalendarIcon, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { TasksTable } from '@/components/tasks/TasksTable';
import { useCustomers } from '@/hooks/useCustomers';
import { useTasks } from '@/hooks/useTasks';
import { useReportData } from '@/hooks/useReportData';
import { 
  TasksByWeekdayChart, 
  TaskActivityLineChart 
} from '@/components/reports/ReportCharts';
import { ReportKpiCard } from '@/components/reports/ReportKpiCard';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types';

const QUICK_DATE_RANGES = [
  { label: 'Letzte 7 Tage', days: 7 },
  { label: 'Dieser Monat', type: 'currentMonth' },
  { label: 'Letzter Monat', type: 'lastMonth' },
];

const Reports = () => {
  // Filter states
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null);
  const [dateRange, setDateRange] = useState<{from: Date | undefined, to: Date | undefined}>({
    from: undefined,
    to: undefined
  });

  // Fetch data
  const { customers, isLoading: isLoadingCustomers } = useCustomers();
  const { tasks, isLoading: isLoadingTasks } = useTasks(statusFilter);
  
  // Get processed report data
  const { 
    filteredTasks,
    kpiData,
    creators,
    tasksByWeekday,
    taskActivityTrend
  } = useReportData({
    tasks,
    dateRange,
    customerId,
    creatorId,
    statusFilter
  });

  // Helper for date display
  const formatDateRange = () => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'dd.MM.yyyy')} - ${format(dateRange.to, 'dd.MM.yyyy')}`;
    }
    
    if (dateRange.from) {
      return `Ab ${format(dateRange.from, 'dd.MM.yyyy')}`;
    }
    
    if (dateRange.to) {
      return `Bis ${format(dateRange.to, 'dd.MM.yyyy')}`;
    }
    
    return 'Zeitraum wählen';
  };

  // Set a quick date range
  const handleQuickRangeSelect = (option: typeof QUICK_DATE_RANGES[0]) => {
    const today = new Date();
    let from: Date | undefined = undefined;
    let to: Date | undefined = undefined;

    if (option.days) {
      from = new Date();
      from.setDate(today.getDate() - option.days);
      to = today;
    } else if (option.type === 'currentMonth') {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      to = today;
    } else if (option.type === 'lastMonth') {
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0);
    }

    setDateRange({ from, to });
  };

  // Handle export (placeholder)
  const handleExport = () => {
    console.log('Export requested for filtered data', { dateRange, customerId, statusFilter, creatorId });
    // Here would be the export logic
    alert('Export-Funktion ist in Bearbeitung');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Reports & Analysen</h1>
        <Button
          onClick={handleExport}
          variant="outline"
          className="flex items-center gap-2 self-start"
        >
          <Download className="h-4 w-4" />
          <span>Exportieren</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {/* Customer Filter */}
            <div className="w-full sm:max-w-[200px]">
              <Select
                value={customerId || ""}
                onValueChange={(value) => setCustomerId(value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alle Kunden" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Alle Kunden</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="w-full sm:max-w-[240px]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal w-full",
                      !dateRange.from && !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateRange()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3 border-b">
                    <div className="space-y-2">
                      {QUICK_DATE_RANGES.map((option, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleQuickRangeSelect(option)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{
                      from: dateRange.from,
                      to: dateRange.to,
                    }}
                    onSelect={(range) => 
                      setDateRange({ 
                        from: range?.from, 
                        to: range?.to 
                      })
                    }
                    numberOfMonths={2}
                    locale={de}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Status Filter */}
            <div className="w-full sm:max-w-[180px]">
              <Select
                value={statusFilter || ""}
                onValueChange={(value) => setStatusFilter(value as TaskStatus || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alle Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Alle Status</SelectItem>
                  <SelectItem value="new">Neu</SelectItem>
                  <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                  <SelectItem value="followup">Auf Wiedervorlage</SelectItem>
                  <SelectItem value="completed">Abgeschlossen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Created by Filter */}
            <div className="w-full sm:max-w-[180px]">
              <Select
                value={creatorId || ""}
                onValueChange={(value) => setCreatorId(value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alle Ersteller" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Alle Ersteller</SelectItem>
                  {creators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      {creator["Full Name"]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpiCard
          title="Gesamtanzahl"
          value={kpiData.totalTasks}
          description="Alle Aufgaben"
          loading={isLoadingTasks}
        />
        <ReportKpiCard
          title="Neue Aufgaben"
          value={kpiData.newTasks}
          description="Status: Neu"
          loading={isLoadingTasks}
        />
        <ReportKpiCard
          title="Abgeschlossen"
          value={kpiData.completedTasks}
          description="Status: Erledigt"
          loading={isLoadingTasks}
        />
        <ReportKpiCard
          title="Aktive Kunden"
          value={kpiData.activeCustomers}
          description="Im Zeitraum"
          loading={isLoadingTasks}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aufgabenverteilung nach Wochentagen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <TasksByWeekdayChart data={tasksByWeekday} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aufgabenentwicklung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <TaskActivityLineChart data={taskActivityTrend} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aufgabenübersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <TasksTable tasks={filteredTasks} isLoading={isLoadingTasks} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
