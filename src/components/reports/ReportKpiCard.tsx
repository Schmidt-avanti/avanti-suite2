
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface ReportKpiCardProps {
  title: string;
  value: number | string;
  className?: string;
  tooltip?: string;
}

const ReportKpiCard: React.FC<ReportKpiCardProps> = ({ title, value, className, tooltip }) => {
  return (
    <Card className={`shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="py-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm text-gray-500">{title}</CardTitle>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
};

export default ReportKpiCard;
