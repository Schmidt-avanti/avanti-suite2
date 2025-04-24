
import React from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Line, LineChart, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChartData {
  name: string;
  value: number;
}

interface ReportChartsProps {
  weekdayDistribution: ChartData[];
  tasksByWeek: ChartData[];
}

const ReportCharts: React.FC<ReportChartsProps> = ({ weekdayDistribution, tasksByWeek }) => {
  const isMobile = useIsMobile();
  
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
      <Card className="shadow-sm w-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base lg:text-lg">Aufgabenverteilung nach Wochentagen</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-2">
          <div className="h-80 w-full">
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="99%" height="99%">
                <BarChart 
                  data={weekdayDistribution}
                  margin={{ 
                    top: 5, 
                    right: isMobile ? 5 : 15, 
                    left: isMobile ? 0 : 5, 
                    bottom: 20 
                  }}
                >
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }}
                    height={40}
                    tickMargin={5}
                    angle={isMobile ? -45 : 0}
                    textAnchor={isMobile ? "end" : "middle"}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    width={30}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                  <Bar dataKey="value" name="Aufgaben" fill="var(--color-tasks)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm w-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base lg:text-lg">Aufgabenentwicklung nach Woche</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-2">
          <div className="h-80 w-full">
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="99%" height="99%">
                <LineChart 
                  data={tasksByWeek}
                  margin={{ 
                    top: 5, 
                    right: isMobile ? 5 : 15, 
                    left: isMobile ? 0 : 5, 
                    bottom: 20 
                  }}
                >
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }}
                    height={40}
                    tickMargin={5}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    width={30}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    name="Aufgaben" 
                    stroke="var(--color-tasks)" 
                    strokeWidth={2} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportCharts;
