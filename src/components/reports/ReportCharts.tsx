
import React from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Line, LineChart, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartData {
  name: string;
  value: number;
}

interface ReportChartsProps {
  weekdayDistribution: ChartData[];
  tasksByWeek: ChartData[];
}

const ReportCharts: React.FC<ReportChartsProps> = ({ weekdayDistribution, tasksByWeek }) => {
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
          <CardTitle className="text-lg">Aufgabenverteilung nach Wochentagen</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-2 lg:px-4">
          <div className="h-60 max-h-60 w-full">
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="99%" height="99%">
                <BarChart 
                  data={weekdayDistribution}
                  margin={{ top: 5, right: 15, left: 0, bottom: 5 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={30} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                  <Bar dataKey="value" name="Aufgaben" fill="var(--color-tasks)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm w-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Aufgabenentwicklung nach Woche</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-2 lg:px-4">
          <div className="h-60 max-h-60 w-full">
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="99%" height="99%">
                <LineChart 
                  data={tasksByWeek}
                  margin={{ top: 5, right: 15, left: 0, bottom: 5 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={30} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
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
