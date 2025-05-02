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
  isLoggedIn: boolean;
}

// Define the session interface to help TypeScript recognize the structure
interface UserSession {
  user_id: string;
  last_seen: string;
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
        // Fetch all agent profiles
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, "Full Name", role')
          .eq('role', 'agent')
          .eq('is_active', true);

        if (error) throw error;

        // Fetch active sessions to determine who's logged in
        let activeSessions: UserSession[] = [];
        
        try {
          // Try the RPC call first
          const { data, error: rpcError } = await supabase
            .from('user_sessions')
            .select('user_id, last_seen')
            .gte('last_seen', new Date(Date.now() - 15 * 60 * 1000).toISOString());
            
          if (rpcError) {
            throw rpcError;
          }
          
          activeSessions = data as UserSession[] || [];
        } catch (sessionError) {
          console.error("Could not fetch session data:", sessionError);
          // Continue without session data - activeSessions will remain an empty array
        }

        const { data: shortBreaks } = await supabase
          .from('short_breaks')
          .select('user_id, start_time')
          .eq('status', 'active');

        const { data: assignments } = await supabase
          .from('user_customer_assignments')
          .select('user_id, customer_id, customers(name)');

        // Create a set of logged-in user IDs for quick lookup
        const loggedInUserIds = new Set(activeSessions.map(session => session.user_id) || []);

        const formattedAgents: Agent[] = (profiles || []).map(profile => {
          const activeBreak = shortBreaks?.find(b => b.user_id === profile.id);
          const assignment = assignments?.find(a => a.user_id === profile.id);
          const isLoggedIn = loggedInUserIds.has(profile.id);
          
          return {
            id: profile.id,
            fullName: profile["Full Name"],
            status: isLoggedIn ? (activeBreak ? 'short_break' : 'active') : 'offline',
            statusSince: activeBreak ? new Date(activeBreak.start_time) : new Date(),
            customerId: assignment?.customer_id,
            customerName: assignment?.customers?.name,
            lastActivity: isLoggedIn ? new Date() : undefined,
            isLoggedIn: isLoggedIn
          };
        });

        // Only show agents that are logged in
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

    // Set up realtime subscription
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
              if (agent.id === payload.new.user_id && agent.isLoggedIn) {
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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_sessions'
      }, payload => {
        // Handle session changes (login/logout)
        const sessionUserId = payload.new?.user_id;
        
        if (sessionUserId) {
          setAgents(prev => {
            const agentExists = prev.some(agent => agent.id === sessionUserId);
            
            // If it's a new session or updated session with recent timestamp
            if (payload.eventType === 'INSERT' || (payload.eventType === 'UPDATE' && new Date(payload.new.last_seen) >= new Date(Date.now() - 15 * 60 * 1000))) {
              if (agentExists) {
                // Update existing agent to logged in
                return prev.map(agent => 
                  agent.id === sessionUserId 
                    ? { ...agent, isLoggedIn: true, status: agent.status === 'short_break' ? 'short_break' : 'active' } 
                    : agent
                );
              } else {
                // Fetch and add the new agent
                fetchAgents();
                return prev;
              }
            } 
            // If session is deleted or expired
            else if (payload.eventType === 'DELETE' || (payload.eventType === 'UPDATE' && new Date(payload.new.last_seen) < new Date(Date.now() - 15 * 60 * 1000))) {
              // Mark agent as offline
              return prev.map(agent => 
                agent.id === sessionUserId 
                  ? { ...agent, isLoggedIn: false, status: 'offline' } 
                  : agent
              );
            }
            
            return prev;
          });
        }
      })
      .subscribe();

    // Fetch agents every 5 minutes to keep the list fresh
    const interval = setInterval(fetchAgents, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
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
      {agents.length === 0 ? (
        <Card className="p-4 text-center">
          <p className="text-muted-foreground">Keine aktiven Agenten online</p>
        </Card>
      ) : (
        agents.map((agent) => (
          <Card key={agent.id} className={`p-4 ${!agent.isLoggedIn ? 'opacity-60' : ''}`}>
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
              
              {agent.isLoggedIn && (
                <>
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
                </>
              )}
            </div>
          </Card>
        ))
      )}
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
          {agents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                <p className="text-muted-foreground">Keine aktiven Agenten online</p>
              </TableCell>
            </TableRow>
          ) : (
            agents.map((agent) => (
              <TableRow 
                key={agent.id}
                className={`hover:bg-gray-50/50 transition-colors ${!agent.isLoggedIn ? 'opacity-60 bg-gray-50/30' : ''}`}
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
                  {agent.isLoggedIn && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatDuration(agent.statusSince)}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {agent.customerName || "—"}
                </TableCell>
                <TableCell>
                  {agent.lastActivity && agent.isLoggedIn && (
                    <Badge variant="outline" className="bg-gray-50">
                      {formatTime(agent.lastActivity)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {agent.isLoggedIn && (
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
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
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

      {isMobile ? renderMobileView() : renderDesktopView()}

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
