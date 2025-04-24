
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDuration, calculateAverageTime } from '@/utils/timeUtils';
import type { TaskTimeSummary } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProcessingTimeStatsProps {
  taskTimeSummaries: TaskTimeSummary[];
}

export const ProcessingTimeStats: React.FC<ProcessingTimeStatsProps> = ({ taskTimeSummaries }) => {
  const isMobile = useIsMobile();

  // Berechne Gesamtzahlen
  const totalTasks = taskTimeSummaries.length;
  const totalTimeSeconds = taskTimeSummaries.reduce((acc, item) => acc + (item.total_seconds || 0), 0);
  const totalSessions = taskTimeSummaries.reduce((acc, item) => acc + (item.session_count || 0), 0);
  const averageTimePerTask = calculateAverageTime(totalTimeSeconds, totalTasks);

  // Erstelle Daten für die Diagramme
  const timeDistributionData = [
    { name: '4h+', value: 0 },
    { name: '2-4h', value: 0 },
    { name: '1-2h', value: 0 },
    { name: '< 1h', value: 0 }
  ];

  // Fülle die Daten für das Diagramm
  taskTimeSummaries.forEach(summary => {
    const hours = (summary.total_seconds || 0) / 3600;
    if (hours >= 4) {
      timeDistributionData[0].value += 1;
    } else if (hours >= 2) {
      timeDistributionData[1].value += 1;
    } else if (hours >= 1) {
      timeDistributionData[2].value += 1;
    } else {
      timeDistributionData[3].value += 1;
    }
  });

  // Konfiguration für das Diagramm
  const chartConfig = {
    tasks: {
      label: 'Aufgaben',
      theme: {
        light: '#9b87f5',
        dark: '#7E69AB'
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="col-span-1 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-gray-500">Gesamtbearbeitungszeit</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl lg:text-3xl font-bold">{formatDuration(totalTimeSeconds)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-gray-500">Durchschnittszeit pro Aufgabe</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl lg:text-3xl font-bold">{formatDuration(averageTimePerTask)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-gray-500">Arbeitssitzungen</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl lg:text-3xl font-bold">{totalSessions}</p>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-1 lg:col-span-2">
        <Card className="shadow-sm w-full overflow-hidden h-full">
          <CardHeader className="py-4">
            <CardTitle className="text-lg">Verteilung der Bearbeitungszeiten</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-0 sm:px-4">
            <div className="h-64 w-full">
              {taskTimeSummaries.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Keine Bearbeitungszeiten verfügbar
                </div>
              ) : (
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="99%" height="99%">
                    <BarChart 
                      data={timeDistributionData}
                      margin={{ 
                        top: 20, 
                        right: isMobile ? 10 : 30, 
                        left: isMobile ? 5 : 20, 
                        bottom: 20 
                      }}
                      barCategoryGap={isMobile ? "15%" : "30%"}
                    >
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                      />
                      <YAxis 
                        tick={{ fontSize: isMobile ? 10 : 12 }} 
                        width={30}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" name="Aufgaben" fill="var(--color-tasks)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
