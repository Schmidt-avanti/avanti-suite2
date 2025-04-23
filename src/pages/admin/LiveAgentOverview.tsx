
import React, { useState, useEffect } from 'react';
import { User, Clock, MessageSquare } from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { de } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SupervisorChat from '@/components/supervisor/SupervisorChat';
import { useAuth } from '@/contexts/AuthContext';

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

  // Fetch initial agents data
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, "Full Name", role')
          .eq('role', 'agent')
          .eq('is_active', true);

        if (error) throw error;

        // Get short break status
        const { data: shortBreaks } = await supabase
          .from('short_breaks')
          .select('user_id, start_time')
          .eq('status', 'active');

        // Get customer assignments
        const { data: assignments } = await supabase
          .from('user_customer_assignments')
          .select('user_id, customer_id, customers(name)');

        // Format the agent data
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
            lastActivity: new Date() // This would be updated with actual data
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

    // Subscribe to real-time updates
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

  const getStatusBadge = (status: AgentStatus) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Aktiv</Badge>;
      case 'short_break':
        return <Badge variant="warning">Pause</Badge>;
      case 'offline':
        return <Badge variant="destructive">Offline</Badge>;
      default:
        return <Badge>Unbekannt</Badge>;
    }
  };

  const formatTime = (date: Date) => {
    return format(date, 'HH:mm', { locale: de });
  };

  const formatDuration = (date: Date) => {
    return `seit ${formatDistance(date, new Date(), { 
      locale: de, 
      addSuffix: false 
    })}`;
  };

  const handleOpenChat = (agent: Agent) => {
    setSelectedAgent(agent);
    setChatOpen(true);
  };

  return (
    <div className="container max-w-7xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Live-Agentenübersicht</h1>
      </div>

      {agents.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">Keine aktiven Agenten</h3>
          <p className="text-muted-foreground mt-2">
            Aktuell sind keine Agenten online oder mit Aufgaben beschäftigt.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">{agent.fullName}</TableCell>
                  <TableCell>
                    {getStatusBadge(agent.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDuration(agent.statusSince)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{agent.customerName || "—"}</TableCell>
                  <TableCell>
                    {agent.lastActivity && formatTime(agent.lastActivity)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleOpenChat(agent)}
                      className="flex items-center gap-1 text-avanti-600 hover:text-avanti-800"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Chat starten</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedAgent && (
        <SupervisorChat
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          agent={selectedAgent}
          supervisor={{ 
            id: user?.id || '', 
            fullName: `${user?.fullName || 'Admin'} (Supervisor)` 
          }}
        />
      )}
    </div>
  );
};

export default LiveAgentOverview;
