import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { DateFilter } from '@/hooks/useAgentTaskCounts';

interface DateFilterComponentProps {
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  customStartDate?: Date;
  customEndDate?: Date;
  onCustomStartDateChange: (date: Date | undefined) => void;
  onCustomEndDateChange: (date: Date | undefined) => void;
}

export const DateFilterComponent: React.FC<DateFilterComponentProps> = ({
  dateFilter,
  onDateFilterChange,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
}) => {
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const getFilterLabel = (filter: DateFilter) => {
    switch (filter) {
      case 'current_month':
        return 'Aktueller Monat';
      case 'last_month':
        return 'Letzter Monat';
      case 'yesterday':
        return 'Gestern';
      case 'custom':
        return 'Benutzerdefiniert';
      default:
        return 'Aktueller Monat';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Zeitraum:</span>
        <Select value={dateFilter} onValueChange={(value: DateFilter) => onDateFilterChange(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Zeitraum wählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_month">Aktueller Monat</SelectItem>
            <SelectItem value="last_month">Letzter Monat</SelectItem>
            <SelectItem value="yesterday">Gestern</SelectItem>
            <SelectItem value="custom">Benutzerdefiniert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {dateFilter === 'custom' && (
        <div className="flex items-center gap-2">
          <span className="text-sm">Von:</span>
          <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-40 justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStartDate ? (
                  format(customStartDate, "dd.MM.yyyy", { locale: de })
                ) : (
                  <span>Startdatum</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={(date) => {
                  onCustomStartDateChange(date);
                  setStartDateOpen(false);
                }}
                initialFocus
                locale={de}
              />
            </PopoverContent>
          </Popover>

          <span className="text-sm">Bis:</span>
          <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-40 justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEndDate ? (
                  format(customEndDate, "dd.MM.yyyy", { locale: de })
                ) : (
                  <span>Enddatum</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={(date) => {
                  onCustomEndDateChange(date);
                  setEndDateOpen(false);
                }}
                initialFocus
                locale={de}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};
