
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatDuration } from '@/utils/timeUtils';
import { toast } from 'sonner';

interface ProcessingTimeStatsProps {
  taskTimeSummaries: Array<{
    task_id: string;
    total_seconds: number;
    total_hours: number;
    session_count: number;
    user_id?: string;
  }>;
}

export const ProcessingTimeStats: React.FC<ProcessingTimeStatsProps> = ({ taskTimeSummaries }) => {
  // Debug logging
  console.log('ProcessingTimeStats received:', taskTimeSummaries);
  
  // Ensure taskTimeSummaries is an array and has valid data
  const validSummaries = Array.isArray(taskTimeSummaries) ? 
    taskTimeSummaries.filter(s => s && typeof s === 'object') : [];
  
  const totalProcessingTime = validSummaries.reduce((acc, curr) => {
    const seconds = curr.total_seconds || 0;
    return acc + seconds;
  }, 0);
  
  const averageTimePerTask = validSummaries.length ? 
    Math.round(totalProcessingTime / validSummaries.length) : 0;
  
  const totalSessions = validSummaries.reduce((acc, curr) => {
    const sessions = curr.session_count || 0;
    return acc + sessions;
  }, 0);

  console.log('Calculated stats:', { 
    totalSummaries: validSummaries.length,
    totalProcessingTime, 
    averageTimePerTask, 
    totalSessions 
  });

  // Check if we have meaningful data
  const hasData = validSummaries.length > 0 && totalProcessingTime > 0;
  
  if (!hasData && taskTimeSummaries.length > 0) {
    // We have task summaries but no time data
    console.warn('Task time summaries found but no valid time data', taskTimeSummaries);
  }

  // Prepare data for time distribution chart
  const timeDistribution = validSummaries.reduce((acc, curr) => {
    const seconds = curr.total_seconds || 0;
    if (seconds <= 0) return acc; // Skip entries with no time
    
    const hours = seconds / 3600;
    let category = '< 1h';
    
    if (hours >= 4) category = '4h+';
    else if (hours >= 2) category = '2-4h';
    else if (hours >= 1) category = '1-2h';
    
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(timeDistribution).map(([name, value]) => ({
    name,
    value
  }));

  const chartConfig = {
    tasks: {
      label: 'Aufgaben',
      theme: {
        light: '#9b87f5',
        dark: '#7E69AB',
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-gray-500">Gesamtbearbeitungszeit</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold">{formatDuration(totalProcessingTime)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-gray-500">Durchschnittszeit pro Aufgabe</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold">{formatDuration(averageTimePerTask)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-gray-500">Arbeitssitzungen</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold">{totalSessions}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Verteilung der Bearbeitungszeiten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            {chartData.length > 0 ? (
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" name="Aufgaben" fill="var(--color-tasks)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                {hasData ? 'Keine Bearbeitungszeiten für die Verteilung verfügbar' : 'Keine Bearbeitungszeiten verfügbar'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
