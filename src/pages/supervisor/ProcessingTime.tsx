import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
import { Clock, RotateCw, User, Filter, Search, Send } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

interface FilterFormValues {
  userId: string | null;
  customerId: string | null;
  search: string;
}

const ProcessingTime = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const { user } = useAuth();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<{id: string; fullName: string} | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);

  const form = useForm<FilterFormValues>({
    defaultValues: {
      userId: null,
      customerId: null,
      search: '',
    },
  });

  const { customers, isLoading: isLoadingCustomers } = useCustomers();

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

  const { data: activeTaskTimes, isLoading: isLoadingActive, refetch: refetchActive } = useQuery({
    queryKey: ['activeTaskTimes', selectedUserId, selectedCustomerId, searchTerm],
    queryFn: async () => {
      try {
        let query = supabase.from('task_times')
          .select(`
            id, 
            task_id, 
            user_id, 
            started_at,
            ended_at,
            tasks!inner (
              id,
              title,
              status,
              customer_id,
              customers (
                id,
                name
              )
            )
          `)
          .is('ended_at', null)
          .eq('tasks.status', 'new');
        
        if (selectedUserId) {
          query = query.eq('user_id', selectedUserId);
        }

        if (selectedCustomerId) {
          query = query.eq('tasks.customer_id', selectedCustomerId);
        }

        const { data: activeTaskTimes, error: taskTimeError } = await query;
        
        if (taskTimeError) {
          toast({
            variant: "destructive",
            title: "Fehler beim Laden der aktiven Zeiten",
            description: taskTimeError.message
          });
          throw taskTimeError;
        }
        
        if (!activeTaskTimes || activeTaskTimes.length === 0) {
          return [];
        }

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, "Full Name"');
          
        if (profilesError) {
          toast({
            variant: "destructive",
            title: "Fehler beim Laden der Nutzerprofile",
            description: profilesError.message
          });
          throw profilesError;
        }

        const profilesMap = new Map();
        profilesData?.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });

        const summaries = activeTaskTimes.map(time => {
          const profile = profilesMap.get(time.user_id);
          
          if (!profile) return null;

          const startTime = new Date(time.started_at);
          const now = new Date();
          const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          
          return {
            task_id: time.task_id,
            user_id: time.user_id,
            session_id: time.id,
            session_count: 1,
            total_seconds: durationSeconds,
            total_hours: durationSeconds / 3600,
            profiles: profile,
            tasks: time.tasks,
            started_at: time.started_at
          };
        }).filter(Boolean);

        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return summaries.filter(summary => 
            summary.tasks?.title.toLowerCase().includes(term) || 
            summary.profiles?.["Full Name"]?.toLowerCase().includes(term) ||
            summary.tasks?.customers?.name?.toLowerCase().includes(term)
          );
        }

        return summaries;
      } catch (error) {
        console.error("Error fetching active task times:", error);
        toast({
          variant: "destructive",
          title: "Datenfehler",
          description: "Die aktiven Bearbeitungen konnten nicht geladen werden."
        });
        return [];
      }
    },
    refetchInterval: refreshInterval
  });

  const handleRefresh = () => {
    refetchActive();
    toast({
      title: "Daten aktualisiert",
      description: "Die Bearbeitungsdaten wurden aktualisiert."
    });
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  const getFormattedTime = (seconds: number) => {
    const totalSeconds = Math.round(seconds);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const onSubmit = (values: FilterFormValues) => {
    setSelectedUserId(values.userId);
    setSelectedCustomerId(values.customerId);
    setSearchTerm(values.search || '');
  };

  const activeUserCount = activeTaskTimes ? new Set(activeTaskTimes.map(summary => summary.user_id)).size : 0;
  const activeTaskCount = activeTaskTimes ? activeTaskTimes.length : 0;

  const sendMessage = async () => {
    if (!messageContent.trim() || !selectedAgent || sending) return;
    
    setSending(true);
    try {
      const { error } = await supabase
        .from('supervisor_messages')
        .insert({
          content: messageContent.trim(),
          sender_id: user?.id,
          recipient_id: selectedAgent.id,
          is_read: false
        });
      
      if (error) throw error;
      
      toast({
        title: "Nachricht gesendet",
        description: "Die Nachricht wurde erfolgreich gesendet.",
      });
      
      setMessageContent('');
      setChatOpen(false);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Die Nachricht konnte nicht gesendet werden.",
      });
    } finally {
      setSending(false);
    }
  };

  const openChat = (agent: {id: string; fullName: string}) => {
    setSelectedAgent(agent);
    setChatOpen(true);
  };

  if (isLoadingActive || isLoadingUsers || isLoadingCustomers) {
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
                        onValueChange={(value) => field.onChange(value === "all" ? null : value)}
                        value={field.value || "all"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nutzer filtern" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Nutzer</SelectItem>
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
                        onValueChange={(value) => field.onChange(value === "all" ? null : value)}
                        value={field.value || "all"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Kunden filtern" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Kunden</SelectItem>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
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
                <TableHead>Aktiv</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeTaskTimes && activeTaskTimes.length > 0 ? (
                activeTaskTimes.map((summary: any) => (
                  <TableRow 
                    key={summary.session_id}
                    className="cursor-pointer hover:bg-muted/80"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center justify-between">
                        <span>{summary.profiles?.["Full Name"]}</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="ml-2"
                          onClick={() => openChat({
                            id: summary.user_id,
                            fullName: summary.profiles?.["Full Name"] || ''
                          })}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => handleTaskClick(summary.task_id)}>
                      <span className="text-primary underline hover:text-primary/80">
                        {summary.tasks?.title}
                      </span>
                    </TableCell>
                    <TableCell>{summary.tasks?.customers?.name}</TableCell>
                    <TableCell>
                      {summary.tasks?.status && (
                        <TaskStatusBadge status={summary.tasks.status} />
                      )}
                    </TableCell>
                    <TableCell>
                      {getFormattedTime(summary.total_seconds)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success" className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Live
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Keine aktiven Bearbeitungen gefunden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nachricht an {selectedAgent?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Ihre Nachricht..."
              className="min-h-[100px]"
            />
            <Button 
              type="button" 
              onClick={sendMessage}
              disabled={!messageContent.trim() || sending}
            >
              {sending ? (
                <>Sende...</>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Nachricht senden
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcessingTime;
