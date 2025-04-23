
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ReportKpiCardProps {
  title: string;
  value: number;
  description: string;
  loading?: boolean;
}

export const ReportKpiCard = ({ 
  title, 
  value, 
  description, 
  loading = false 
}: ReportKpiCardProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="flex items-baseline">
              <p className="text-3xl font-bold">{value}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};
