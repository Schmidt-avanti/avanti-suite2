
import React from 'react';
import { useReportData } from '@/hooks/useReportData';
import ReportFilters from '@/components/reports/ReportFilters';
import ReportKpiCard from '@/components/reports/ReportKpiCard';
import ReportCharts from '@/components/reports/ReportCharts';
import ReportTasksTable from '@/components/reports/ReportTasksTable';

const Reports: React.FC = () => {
  const { 
    filters, 
    setFilters, 
    tasks, 
    customers, 
    users, 
    isLoading, 
    weekdayDistribution, 
    tasksByWeek, 
    kpiData 
  } = useReportData();

  if (isLoading) {
    return (
      <div className="py-8">
        <h1 className="text-2xl font-bold mb-6">Reports</h1>
        <div className="text-center py-8">Lade Daten...</div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      
      {/* Filters */}
      <ReportFilters 
        filters={filters}
        setFilters={setFilters}
        customers={customers}
        users={users}
      />
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportKpiCard 
          title="Gesamtanzahl Aufgaben" 
          value={kpiData.totalTasks}
        />
        <ReportKpiCard 
          title="Neue Aufgaben" 
          value={kpiData.newTasks}
        />
        <ReportKpiCard 
          title="Erledigte Aufgaben" 
          value={kpiData.completedTasks}
        />
        <ReportKpiCard 
          title="Aktive Kunden" 
          value={kpiData.activeCustomers}
        />
      </div>
      
      {/* Charts */}
      <ReportCharts 
        weekdayDistribution={weekdayDistribution}
        tasksByWeek={tasksByWeek}
      />
      
      {/* Tasks Table */}
      <ReportTasksTable tasks={tasks} />
    </div>
  );
};

export default Reports;
