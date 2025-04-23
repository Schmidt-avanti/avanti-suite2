
import React, { useState } from 'react';
import { useReportData } from '@/hooks/useReportData';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ReportKpiCard } from '@/components/reports/ReportKpiCard';
import { WeekdayBarChart, WeeklyLineChart } from '@/components/reports/ReportCharts';
import { ReportTasksTable } from '@/components/reports/ReportTasksTable';
import { CalendarDays, ListChecks, CheckSquare, Users } from 'lucide-react';

const Reports = () => {
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const {
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
  } = useReportData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Reports</h1>
        <p className="text-muted-foreground">
          Analyse und Auswertung der Aufgabendaten
        </p>
      </div>
      
      {/* Filter */}
      <ReportFilters 
        customers={customers}
        users={allUsers}
        filters={filters}
        updateFilter={updateFilter}
        updateDateRange={updateDateRange}
        setDateRangePreset={setDateRangePreset}
        resetFilters={resetFilters}
        isExpanded={filtersExpanded}
        onToggleExpand={() => setFiltersExpanded(prev => !prev)}
      />
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpiCard 
          title="Gesamtaufgaben" 
          value={kpiData.totalTasks} 
          icon={ListChecks}
          color="bg-avanti-100 text-avanti-700"
        />
        <ReportKpiCard 
          title="Neue Aufgaben" 
          value={kpiData.newTasks} 
          icon={CalendarDays}
          color="bg-blue-100 text-blue-700"
        />
        <ReportKpiCard 
          title="Abgeschlossene Aufgaben" 
          value={kpiData.completedTasks} 
          icon={CheckSquare}
          color="bg-green-100 text-green-700"
        />
        <ReportKpiCard 
          title="Aktive Kunden" 
          value={kpiData.activeCustomers} 
          icon={Users}
          color="bg-purple-100 text-purple-700"
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeekdayBarChart data={weekdayChartData} />
        <WeeklyLineChart data={weeklyChartData} />
      </div>
      
      {/* Tasks Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Aufgabenübersicht</h2>
        <ReportTasksTable tasks={tasks} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default Reports;
