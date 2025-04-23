
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportKpiCardProps {
  title: string;
  value: number | string;
  className?: string;
}

const ReportKpiCard: React.FC<ReportKpiCardProps> = ({ title, value, className }) => {
  return (
    <Card className={`shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="py-4">
        <CardTitle className="text-sm text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
};

export default ReportKpiCard;
