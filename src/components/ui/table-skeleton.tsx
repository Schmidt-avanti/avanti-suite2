
import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

interface TableSkeletonProps {
  columnCount: number;
  rowCount?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ 
  columnCount, 
  rowCount = 5 
}) => {
  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columnCount }).map((_, index) => (
              <TableHead key={`header-${index}`} className="h-10">
                <Skeleton className="h-6 w-full max-w-[120px]" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <TableRow key={`row-${rowIndex}`}>
              {Array.from({ length: columnCount }).map((_, colIndex) => (
                <TableCell key={`cell-${rowIndex}-${colIndex}`} className="py-3">
                  <Skeleton className={`h-5 w-full ${colIndex === 0 ? 'max-w-[180px]' : 'max-w-[120px]'}`} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
