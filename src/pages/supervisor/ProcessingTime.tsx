
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
import { Clock, RotateCw, User, Filter, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useCustomers } from "@/hooks/useCustomers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";

// Define the filter form fields
interface FilterFormValues {
  userId: string | null;
  customerId: string | null;
  search: string;
}

const ProcessingTime = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds by default
  
  // Add filter states
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Use form for filters
  const form = useForm<FilterFormValues>({
    defaultValues: {
      userId: null,
      customerId: null,
      search: '',
    },
  });
  
  // Get customers for filter
  const { customers, isLoading: isLoadingCustomers } = useCustomers();

  // Get all users for filter
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, "Full Name", role')
        .order('"Full Name"', { ascending: true });
        
      if (error) throw error;
      return data;
    }
  });
  
  // Modified query to support filtering
  const { data: taskTimeSummaries, isLoading, refetch } = useQuery({
    queryKey: ['taskTimeSummaries', selectedUserId, selectedCustomerId, searchTerm],
    queryFn: async () => {
      let query = supabase
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
              id,
              name
            )
          )
        `);
      
      // Apply user filter if selected
      if (selectedUserId) {
        query = query.eq('user_id', selectedUserId);
      }
      
      // We'll filter by customer on the client side since the relationship 
      // is through the task, not directly on task_time_summary
      
      const { data, error } = await query;

      if (error) {
        toast({
          variant: "destructive",
          title: "Fehler beim Laden der Daten",
          description: error.message
        });
        throw error;
      }
      
      // Filter by customer and search term on the client side
      if (data) {
        let filteredData = data;
        
        // Filter by customer if selected
        if (selectedCustomerId) {
          filteredData = filteredData.filter(
            summary => summary.task?.customer_id === selectedCustomerId
          );
        }
        
        // Filter by search term if provided (case insensitive)
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filteredData = filteredData.filter(summary => 
            summary.task?.title.toLowerCase().includes(term) || 
            summary.user?.["Full Name"]?.toLowerCase().includes(term) ||
            summary.task?.customer?.name.toLowerCase().includes(term)
          );
        }
        
        return filteredData;
      }
      
      return data;
    },
    refetchInterval: refreshInterval
  });
  
  // Get active task times to show live timers
  const { data: activeTaskTimes, isLoading: isLoadingActive } = useQuery({
    queryKey: ['activeTaskTimes', selectedUserId],
    queryFn: async () => {
      let query = supabase
        .from('task_times')
        .select(`
          id,
          task_id,
          user_id,
          started_at,
          ended_at
        `)
        .is('ended_at', null);
      
      // Apply user filter if selected
      if (selectedUserId) {
        query = query.eq('user_id', selectedUserId);
      }

      const { data, error } = await query;
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
  
  // Handle filter changes
  const onSubmit = (values: FilterFormValues) => {
    setSelectedUserId(values.userId);
    setSelectedCustomerId(values.customerId);
    setSearchTerm(values.search);
  };
  
  // Count active users and tasks
  const activeUserCount = activeTaskTimes 
    ? new Set(activeTaskTimes.filter(time => !time.ended_at).map(time => time.user_id)).size 
    : 0;
  
  const activeTaskCount = activeTaskTimes
    ? new Set(activeTaskTimes.filter(time => !time.ended_at).map(time => time.task_id)).size
    : 0;

  if (isLoading || isLoadingActive || isLoadingUsers || isLoadingCustomers) {
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
      
      {/* Filter Section */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-wrap gap-4 items-end">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || undefined}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nutzer filtern" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Alle Nutzer</SelectItem>
                          {users?.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user["Full Name"]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || undefined}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Kunden filtern" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Alle Kunden</SelectItem>
                          {customers?.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="search"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormControl>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Suchen..."
                          className="pl-8"
                          {...field}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <Button type="submit">Filtern</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

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
              {activeUserCount}
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
              {activeTaskCount}
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
                      <Badge variant="success">
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
