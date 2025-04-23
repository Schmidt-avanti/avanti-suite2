
import React from 'react';
import { ChartContainer, ChartLegend, ChartTooltipContent, ChartTooltip } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

interface WeekdayChartProps {
  data: { name: string; tasks: number }[];
}

export const WeekdayBarChart = ({ data }: WeekdayChartProps) => {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Aufgabenverteilung nach Wochentagen</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ChartContainer
          className="aspect-[4/3] h-full sm:aspect-[16/9]"
          config={{
            tasks: {
              label: "Aufgaben",
              color: "hsl(var(--avanti-300))"
            }
          }}
        >
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              tickFormatter={(value) => value.substring(0, 2)} 
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tickCount={5}
            />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value, name) => [`${value} Aufgaben`, name]} />}
            />
            <Bar dataKey="tasks" fill="var(--color-tasks)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

interface WeeklyChartProps {
  data: { date: string; tasks: number }[];
}

export const WeeklyLineChart = ({ data }: WeeklyChartProps) => {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Aufgabenentwicklung</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ChartContainer
          className="aspect-[4/3] h-full sm:aspect-[16/9]"
          config={{
            tasks: {
              label: "Aufgaben",
              color: "hsl(var(--avanti-500))"
            }
          }}
        >
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tickCount={5}
            />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value, name) => [`${value} Aufgaben`, name]} />}
            />
            <Line 
              type="monotone" 
              dataKey="tasks" 
              stroke="var(--color-tasks)" 
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
