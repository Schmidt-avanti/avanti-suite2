
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import type { ReportFilters, DateRangePreset } from '@/hooks/useReportData';
import type { TaskStatus } from '@/types';

interface ReportFiltersProps {
  customers: { id: string; name: string }[];
  users: { id: string; "Full Name": string }[];
  filters: ReportFilters;
  updateFilter: <K extends keyof ReportFilters>(
    key: K, 
    value: ReportFilters[K]
  ) => void;
  updateDateRange: (from: Date | null, to: Date | null) => void;
  setDateRangePreset: (preset: DateRangePreset) => void;
  resetFilters: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const ReportFilters = ({
  customers,
  users,
  filters,
  updateFilter,
  updateDateRange,
  setDateRangePreset,
  resetFilters,
  isExpanded = true,
  onToggleExpand
}: ReportFiltersProps) => {
  const [fromCalendarOpen, setFromCalendarOpen] = useState(false);
  const [toCalendarOpen, setToCalendarOpen] = useState(false);

  const statusOptions: { value: TaskStatus; label: string }[] = [
    { value: 'new', label: 'Neu' },
    { value: 'in_progress', label: 'In Bearbeitung' },
    { value: 'followup', label: 'Auf Wiedervorlage' },
    { value: 'completed', label: 'Abgeschlossen' },
  ];

  const dateRangePresets: { value: DateRangePreset; label: string }[] = [
    { value: 'last7days', label: 'Letzte 7 Tage' },
    { value: 'thisMonth', label: 'Dieser Monat' },
    { value: 'lastMonth', label: 'Letzter Monat' },
  ];

  if (!isExpanded) {
    return (
      <div className="flex justify-between items-center mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={onToggleExpand}
        >
          <Filter className="h-4 w-4" /> 
          Filter anzeigen
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-6 p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" /> 
            Filter
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <X className="h-4 w-4 mr-1" /> Zurücksetzen
            </Button>
            {onToggleExpand && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onToggleExpand}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Kundenfilter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Kunde</label>
            <Select 
              value={filters.customerId || ''} 
              onValueChange={(value) => updateFilter('customerId', value || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alle Kunden" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">Alle Kunden</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          {/* Statusfilter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select 
              value={filters.status || ''} 
              onValueChange={(value) => updateFilter('status', value as TaskStatus || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alle Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">Alle Status</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          {/* Erstellt-von-Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Erstellt von</label>
            <Select 
              value={filters.createdById || ''} 
              onValueChange={(value) => updateFilter('createdById', value || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alle Benutzer" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">Alle Benutzer</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user["Full Name"]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          {/* Datumsbereich-Voreinstellungen */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Zeitraum</label>
            <Select 
              value={filters.dateRange.preset || ''} 
              onValueChange={(value) => {
                if (value && value !== '') {
                  setDateRangePreset(value as DateRangePreset);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Zeitraum wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">Benutzerdefiniert</SelectItem>
                  {dateRangePresets.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Von-Bis Datumswähler */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Von</label>
            <Popover open={fromCalendarOpen} onOpenChange={setFromCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.from ? (
                    format(filters.dateRange.from, 'PPP', { locale: de })
                  ) : (
                    <span>Datum wählen</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.from || undefined}
                  onSelect={(date) => {
                    updateDateRange(date, filters.dateRange.to);
                    setFromCalendarOpen(false);
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Bis</label>
            <Popover open={toCalendarOpen} onOpenChange={setToCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.to ? (
                    format(filters.dateRange.to, 'PPP', { locale: de })
                  ) : (
                    <span>Datum wählen</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.to || undefined}
                  onSelect={(date) => {
                    updateDateRange(filters.dateRange.from, date);
                    setToCalendarOpen(false);
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </Card>
  );
};
