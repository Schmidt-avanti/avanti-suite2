
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

  // Erstelle Daten für die Diagramme mit besserer Verteilung
  const timeDistributionData = [
    { name: '< 15m', value: 0, range: '< 15m' },
    { name: '15-30m', value: 0, range: '15-30m' },
    { name: '30m-1h', value: 0, range: '30m-1h' },
    { name: '1-2h', value: 0, range: '1-2h' },
    { name: '2h+', value: 0, range: '2h+' }
  ];

  // Debug: Log task time summaries to check the data
  console.log('Task time summaries for chart:', taskTimeSummaries);

  // Fülle die Daten für das Diagramm mit feingranulareren Zeitbereichen
  taskTimeSummaries.forEach(summary => {
    const minutes = (summary.total_seconds || 0) / 60;
    
    if (minutes < 15) {
      timeDistributionData[0].value += 1;
    } else if (minutes < 30) {
      timeDistributionData[1].value += 1;
    } else if (minutes < 60) {
      timeDistributionData[2].value += 1;
    } else if (minutes < 120) {
      timeDistributionData[3].value += 1;
    } else {
      timeDistributionData[4].value += 1;
    }
  });

  // Debug: Log the distribution data
  console.log('Time distribution data for chart:', timeDistributionData);

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
          <CardContent className="pt-0 px-0 pb-2">
            <div className="h-[300px] w-full px-2">
              {taskTimeSummaries.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Keine Bearbeitungszeiten verfügbar
                </div>
              ) : (
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={timeDistributionData}
                      margin={{ 
                        top: 20, 
                        right: isMobile ? 20 : 40, 
                        left: isMobile ? 10 : 20, 
                        bottom: isMobile ? 70 : 40 
                      }}
                      barCategoryGap={isMobile ? "15%" : "30%"}
                      barSize={isMobile ? 24 : 45}
                    >
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        height={isMobile ? 60 : 40}
                        tickMargin={isMobile ? 8 : 10}
                        angle={isMobile ? -45 : 0}
                        textAnchor={isMobile ? "end" : "middle"}
                      />
                      <YAxis 
                        tick={{ fontSize: isMobile ? 10 : 12 }} 
                        width={40}
                        allowDecimals={false}
                        domain={[0, 'dataMax + 1']}
                        padding={{ top: 20 }}
                      />
                      <ChartTooltip 
                        content={
                          <ChartTooltipContent 
                            labelFormatter={(value) => `Zeitbereich: ${value}`}
                            formatter={(value, name) => [`${value} Aufgaben`, 'Anzahl']}
                          />
                        } 
                      />
                      <Bar 
                        dataKey="value" 
                        name="Aufgaben" 
                        fill="var(--color-tasks)"
                        radius={[4, 4, 0, 0]}
                      />
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

