
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

interface WeekdayData {
  name: string;
  value: number;
}

interface TrendData {
  date: string;
  count: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 shadow-md p-2 rounded-md text-xs">
        <p className="font-medium">{`${label}`}</p>
        <p className="text-primary">{`Aufgaben: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

// Bar chart for tasks by weekday
export const TasksByWeekdayChart = ({ data }: { data: WeekdayData[] }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey="name"
          axisLine={false}
          tickLine={false}
          fontSize={12}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          fontSize={12}
          tickFormatter={(value) => value === 0 ? '0' : value.toString()}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="value" 
          fill="var(--primary)" 
          radius={[4, 4, 0, 0]}
          name="Aufgaben"
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Line chart for task activity trend
export const TaskActivityLineChart = ({ data }: { data: TrendData[] }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey="date"
          axisLine={false}
          tickLine={false}
          fontSize={12}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          fontSize={12}
          tickFormatter={(value) => value === 0 ? '0' : value.toString()}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line 
          type="monotone" 
          dataKey="count" 
          stroke="var(--primary)" 
          strokeWidth={2}
          dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 4 }}
          activeDot={{ fill: 'var(--primary)', stroke: 'white', strokeWidth: 2, r: 6 }}
          name="Aufgaben"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
