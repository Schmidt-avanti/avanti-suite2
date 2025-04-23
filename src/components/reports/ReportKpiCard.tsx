
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface ReportKpiCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon?: LucideIcon;
  color?: string;
}

export const ReportKpiCard = ({
  title,
  value,
  description,
  icon: Icon,
  color = 'bg-avanti-100'
}: ReportKpiCardProps) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && (
          <div className={`rounded-md p-2 ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardContent>
    </Card>
  );
};
