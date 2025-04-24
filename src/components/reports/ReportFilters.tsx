
import React from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { ReportFilters as ReportFiltersType } from '@/hooks/useReportData';

interface ReportFiltersComponentProps {
  filters: ReportFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<ReportFiltersType>>;
  customers: Array<{ id: string; name: string }>;
  users: Array<{ id: string; full_name: string }>;
}

export const ReportFilters: React.FC<ReportFiltersComponentProps> = ({ 
  filters, 
  setFilters,
  customers,
  users
}) => {
  const handleCustomerChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      customerId: value === 'all' ? null : value
    }));
  };

  const handleCreatedByChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      createdBy: value === 'all' ? null : value
    }));
  };

  const handleFromDateChange = (date: Date | undefined) => {
    setFilters(prev => ({
      ...prev,
      fromDate: date || null
    }));
  };

  const handleToDateChange = (date: Date | undefined) => {
    setFilters(prev => ({
      ...prev,
      toDate: date || null
    }));
  };

  const setLastSevenDays = () => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    setFilters(prev => ({
      ...prev,
      fromDate: sevenDaysAgo,
      toDate: today
    }));
  };

  const setThisMonth = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    setFilters(prev => ({
      ...prev,
      fromDate: firstDayOfMonth,
      toDate: today
    }));
  };

  const setLastMonth = () => {
    const today = new Date();
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    
    setFilters(prev => ({
      ...prev,
      fromDate: firstDayOfLastMonth,
      toDate: lastDayOfLastMonth
    }));
  };

  return (
    <Card className="p-4 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Kundenfilter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Kunde</label>
          <Select 
            value={filters.customerId || 'all'} 
            onValueChange={handleCustomerChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle Kunden" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kunden</SelectItem>
              {customers.map(customer => (
                <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Von Datum */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Von Datum</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {filters.fromDate ? (
                  format(filters.fromDate, 'dd.MM.yyyy', { locale: de })
                ) : (
                  <span>Startdatum wählen</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={filters.fromDate || undefined}
                onSelect={handleFromDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Bis Datum */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Bis Datum</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {filters.toDate ? (
                  format(filters.toDate, 'dd.MM.yyyy', { locale: de })
                ) : (
                  <span>Enddatum wählen</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={filters.toDate || undefined}
                onSelect={handleToDateChange}
                initialFocus
              />
              <div className="p-2 border-t flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs" 
                  onClick={setLastSevenDays}
                >
                  Letzte 7 Tage
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs" 
                  onClick={setThisMonth}
                >
                  Dieser Monat
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs" 
                  onClick={setLastMonth}
                >
                  Letzter Monat
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Erstellt von filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Erstellt von</label>
          <Select 
            value={filters.createdBy || 'all'} 
            onValueChange={handleCreatedByChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle Benutzer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Benutzer</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
};
