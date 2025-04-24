
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { Button } from "@/components/ui/button";
import { Clock, RotateCw, User2, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ProcessingTime = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds by default
  
  const { data: taskTimeSummaries, isLoading, refetch } = useQuery({
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
            status,
            customer_id,
            customer:customer_id (
              name
            )
          )
        `);

      if (error) {
        toast({
          variant: "destructive",
          title: "Fehler beim Laden der Daten",
          description: error.message
        });
        throw error;
      }
      return data;
    },
    refetchInterval: refreshInterval
  });
  
  // Get active task times to show live timers
  const { data: activeTaskTimes, isLoading: isLoadingActive } = useQuery({
    queryKey: ['activeTaskTimes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_times')
        .select(`
          id,
          task_id,
          user_id,
          started_at,
          ended_at
        `)
        .is('ended_at', null);

      if (error) throw error;
      return data;
    },
    refetchInterval: refreshInterval
  });

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Daten aktualisiert",
      description: "Die Bearbeitungsdaten wurden aktualisiert."
    });
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  const isActivelyWorking = (userId: string, taskId: string) => {
    if (!activeTaskTimes) return false;
    return activeTaskTimes.some(
      time => time.user_id === userId && time.task_id === taskId && !time.ended_at
    );
  };

  const getFormattedTime = (hours: number) => {
    const totalSeconds = Math.round(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading || isLoadingActive) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Lade Bearbeitungsdaten...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live-Bearbeitungsdauer</h1>
          <p className="text-muted-foreground">
            Echtzeit-Übersicht der Bearbeitungszeiten pro Nutzer und Aufgabe
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RotateCw className="h-4 w-4" />
          Aktualisieren
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <User className="w-4 h-4 mr-2" />
              Aktive Nutzer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(activeTaskTimes?.filter(time => !time.ended_at).map(time => time.user_id)).size || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Aktive Aufgaben
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(activeTaskTimes?.filter(time => !time.ended_at).map(time => time.task_id)).size || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nutzer</TableHead>
                <TableHead>Aufgabe</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gesamtzeit</TableHead>
                <TableHead>Anzahl Sessions</TableHead>
                <TableHead>Aktiv</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskTimeSummaries?.map((summary: any) => (
                <TableRow 
                  key={`${summary.user_id}-${summary.task_id}`}
                  className="cursor-pointer hover:bg-muted/80"
                >
                  <TableCell className="font-medium">
                    {summary.user?.["Full Name"]}
                  </TableCell>
                  <TableCell onClick={() => handleTaskClick(summary.task_id)}>
                    <span className="text-primary underline hover:text-primary/80">
                      {summary.task?.title}
                    </span>
                  </TableCell>
                  <TableCell>{summary.task?.customer?.name}</TableCell>
                  <TableCell>
                    {summary.task?.status && (
                      <TaskStatusBadge status={summary.task.status} />
                    )}
                  </TableCell>
                  <TableCell>
                    {getFormattedTime(summary.total_hours)}
                  </TableCell>
                  <TableCell>{summary.session_count}</TableCell>
                  <TableCell>
                    {isActivelyWorking(summary.user_id, summary.task_id) ? (
                      <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-100">
                        <span className="relative flex h-2 w-2 mr-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Live
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              
              {(!taskTimeSummaries || taskTimeSummaries.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Keine Bearbeitungszeiten gefunden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessingTime;
