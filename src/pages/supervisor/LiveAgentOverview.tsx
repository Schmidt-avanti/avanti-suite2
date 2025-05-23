import React, { useState, useEffect } from 'react';
import { MessageSquare, CircleCheck, CirclePause, CircleX, Clock } from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { de } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SupervisorChat from '@/components/supervisor/SupervisorChat';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useIsMobile } from '@/hooks/use-mobile';

type AgentStatus = 'active' | 'short_break' | 'offline';

interface Agent {
  id: string;
  fullName: string;
  status: AgentStatus;
  statusSince: Date;
  customerId?: string;
  customerName?: string;
  lastActivity?: Date;
}

const LiveAgentOverview = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, "Full Name", role')
          .eq('role', 'agent')
          .eq('is_active', true);

        if (error) throw error;

        const { data: shortBreaks } = await supabase
          .from('short_breaks')
          .select('user_id, start_time')
          .eq('status', 'active');

        const { data: assignments } = await supabase
          .from('user_customer_assignments')
          .select('user_id, customer_id, customers(name)');

        const formattedAgents: Agent[] = (profiles || []).map(profile => {
          const activeBreak = shortBreaks?.find(b => b.user_id === profile.id);
          const assignment = assignments?.find(a => a.user_id === profile.id);
          
          return {
            id: profile.id,
            fullName: profile["Full Name"],
            status: activeBreak ? 'short_break' : 'active',
            statusSince: activeBreak ? new Date(activeBreak.start_time) : new Date(),
            customerId: assignment?.customer_id,
            customerName: assignment?.customers?.name,
            lastActivity: new Date()
          };
        });

        setAgents(formattedAgents);
      } catch (error) {
        console.error('Error fetching agents:', error);
        toast({
          title: "Fehler",
          description: "Die Agenten konnten nicht geladen werden.",
          variant: "destructive",
        });
      }
    };

    fetchAgents();

    const channel = supabase
      .channel('agent-status-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'short_breaks' 
      }, payload => {
        setAgents(prev => {
          return prev.map(agent => {
            if (agent.id === payload.new.user_id) {
              return {
                ...agent,
                status: 'short_break',
                statusSince: new Date(payload.new.start_time)
              };
            }
            return agent;
          });
        });
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'short_breaks' 
      }, payload => {
        if (payload.new.status === 'completed') {
          setAgents(prev => {
            return prev.map(agent => {
              if (agent.id === payload.new.user_id) {
                return {
                  ...agent,
                  status: 'active',
                  statusSince: new Date()
                };
              }
              return agent;
            });
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'active':
        return <CircleCheck className="w-4 h-4 text-green-600" />;
      case 'short_break':
        return <CirclePause className="w-4 h-4 text-yellow-600" />;
      case 'offline':
        return <CircleX className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: AgentStatus) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1.5">
            {getStatusIcon(status)} Aktiv
          </Badge>
        );
      case 'short_break':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1.5">
            {getStatusIcon(status)} Pause
          </Badge>
        );
      case 'offline':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 flex items-center gap-1.5">
            {getStatusIcon(status)} Offline
          </Badge>
        );
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const formatTime = (date: Date) => {
    return format(date, 'HH:mm', { locale: de });
  };

  const formatDuration = (date: Date) => {
    return formatDistance(date, new Date(), { 
      locale: de, 
      addSuffix: false 
    });
  };

  const handleOpenChat = (agent: Agent) => {
    setSelectedAgent(agent);
    setChatOpen(true);
  };

  const renderMobileView = () => (
    <div className="grid gap-4">
      {agents.map((agent) => (
        <Card key={agent.id} className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(agent.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{agent.fullName}</div>
                  <div className="text-sm text-muted-foreground">{agent.customerName || "—"}</div>
                </div>
              </div>
              {getStatusBadge(agent.status)}
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>seit {formatDuration(agent.statusSince)}</span>
              </div>
              {agent.lastActivity && (
                <Badge variant="outline" className="bg-gray-50">
                  {formatTime(agent.lastActivity)}
                </Badge>
              )}
            </div>
            
            <Button 
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => handleOpenChat(agent)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat starten
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderDesktopView = () => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Zeit aktiv</TableHead>
            <TableHead>Kunde</TableHead>
            <TableHead>Letzte Aktivität</TableHead>
            <TableHead className="text-right">Aktion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow 
              key={agent.id}
              className="hover:bg-gray-50/50 transition-colors"
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(agent.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  {agent.fullName}
                </div>
              </TableCell>
              <TableCell>
                {getStatusBadge(agent.status)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(agent.statusSince)}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {agent.customerName || "—"}
              </TableCell>
              <TableCell>
                {agent.lastActivity && (
                  <Badge variant="outline" className="bg-gray-50">
                    {formatTime(agent.lastActivity)}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenChat(agent)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Nachricht an Agent senden</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Live-Agentenübersicht</h1>
        <p className="text-muted-foreground">Verwalten Sie aktive Agenten und deren Status in Echtzeit</p>
      </div>

      {agents.length === 0 ? (
        <Card className="p-8 text-center">
          <Avatar className="h-12 w-12 mx-auto mb-4">
            <AvatarFallback className="bg-muted text-muted-foreground">?</AvatarFallback>
          </Avatar>
          <h3 className="text-lg font-medium mb-2">Keine aktiven Agenten</h3>
          <p className="text-muted-foreground">
            Aktuell sind keine Agenten online oder mit Aufgaben beschäftigt.
          </p>
        </Card>
      ) : (
        isMobile ? renderMobileView() : renderDesktopView()
      )}

      {selectedAgent && (
        <SupervisorChat
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          agent={selectedAgent}
          supervisor={{ 
            id: user?.id || '', 
            fullName: user?.firstName || 'Admin' 
          }}
        />
      )}
    </div>
  );
};

export default LiveAgentOverview;
