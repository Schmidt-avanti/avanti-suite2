
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaskTimeSummary } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ProcessingTime = () => {
  const { data: taskTimeSummaries, isLoading } = useQuery({
    queryKey: ['taskTimeSummaries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_time_summary')
        .select(`
          *,
          user:user_id (
            id,
            "Full Name",
            email
          ),
          task:task_id (
            id,
            title,
            status
          )
        `);

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Lade Daten...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bearbeitungsdauer</h1>
        <p className="text-muted-foreground">
          Übersicht der Bearbeitungszeiten pro Nutzer und Aufgabe
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nutzer</TableHead>
            <TableHead>Aufgabe</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Gesamtzeit</TableHead>
            <TableHead>Anzahl Sessions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {taskTimeSummaries?.map((summary: any) => (
            <TableRow key={`${summary.user_id}-${summary.task_id}`}>
              <TableCell>{summary.user?.["Full Name"]}</TableCell>
              <TableCell>{summary.task?.title}</TableCell>
              <TableCell>{summary.task?.status}</TableCell>
              <TableCell>{Math.round(summary.total_hours * 100) / 100} Stunden</TableCell>
              <TableCell>{summary.session_count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProcessingTime;
