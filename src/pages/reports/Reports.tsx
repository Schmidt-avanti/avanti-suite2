
import React, { useEffect } from 'react';
import { useReportData } from '@/hooks/useReportData';
import { ReportFilters } from '@/components/reports/ReportFilters';
import ReportKpiCard from '@/components/reports/ReportKpiCard';
import ReportCharts from '@/components/reports/ReportCharts';
import ReportTasksTable from '@/components/reports/ReportTasksTable';
import { ProcessingTimeStats } from '@/components/reports/ProcessingTimeStats';
import { Skeleton } from '@/components/ui/skeleton';
import { useTaskTimeSummaries } from '@/hooks/useTaskTimeSummaries';
import { toast } from 'sonner';

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

  // Extrahiere die Task-IDs aus den gefilterten Tasks
  const taskIds = tasks && Array.isArray(tasks) 
    ? tasks.filter(t => t && t.id).map(t => t.id) 
    : [];
  
  // Debug-Logging
  console.log('Report tasks count:', tasks?.length);
  console.log('Report taskIds for time summaries:', taskIds);
  
  // Hole die Zeitzusammenfassungen
  const { 
    taskTimeSummaries, 
    isLoading: isLoadingTimes, 
    error 
  } = useTaskTimeSummaries(taskIds);
  
  useEffect(() => {
    if (error) {
      console.error('Error fetching time summaries:', error);
      toast.error('Fehler beim Laden der Zeitdaten');
    }
  }, [error]);
  
  useEffect(() => {
    console.log('Tasks oder taskIds aktualisiert im Reports-Component:', { 
      taskCount: tasks?.length, 
      taskIdCount: taskIds.length 
    });
    
    console.log('Zeitzusammenfassungen im Reports:', taskTimeSummaries);
  }, [tasks, taskIds, taskTimeSummaries]);

  // Zeige einen Ladebalken, wenn noch Daten geladen werden
  if (isLoading || isLoadingTimes) {
    return (
      <div className="py-8">
        <h1 className="text-2xl font-bold mb-6">Reports</h1>
        <div className="py-4 px-6 rounded-lg bg-white shadow-sm mb-6">
          <Skeleton className="h-10 w-full mb-4" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <Skeleton className="h-5 w-24 mb-4" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {[1, 2].map(i => (
            <div key={i} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <Skeleton className="h-6 w-40 mb-4" />
              <Skeleton className="h-64 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      
      <ReportFilters 
        filters={filters}
        setFilters={setFilters}
        customers={customers}
        users={users}
      />
      
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
      
      <ProcessingTimeStats taskTimeSummaries={taskTimeSummaries || []} />
      
      <ReportCharts 
        weekdayDistribution={weekdayDistribution}
        tasksByWeek={tasksByWeek}
      />
      
      <ReportTasksTable tasks={tasks} />
    </div>
  );
};

export default Reports;
