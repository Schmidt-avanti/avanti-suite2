
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AgentChatPopup from '@/components/supervisor/AgentChatPopup';

interface SupervisorChatContextType {
  hasNewMessages: boolean;
  openChat: () => void;
  closeChat: () => void;
}

const SupervisorChatContext = createContext<SupervisorChatContextType | undefined>(undefined);

export const useSupervisorChat = (): SupervisorChatContextType => {
  const context = useContext(SupervisorChatContext);
  if (context === undefined) {
    throw new Error('useSupervisorChat must be used within a SupervisorChatProvider');
  }
  return context;
};

export const SupervisorChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const { user } = useAuth();

  // Explicitly check for the agent role
  const isAgent = user?.role === 'agent';

  useEffect(() => {
    if (!user?.id || !isAgent) return;
    
    // Debug log to verify user role
    console.log('SupervisorChatProvider user role:', user.role);
    
    // Check for unread messages initially
    const checkUnreadMessages = async () => {
      const { count, error } = await supabase
        .from('supervisor_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);
        
      if (error) {
        console.error('Error checking unread messages:', error);
        return;
      }
      
      console.log('Unread messages count:', count);
      
      if (count && count > 0) {
        setHasNewMessages(true);
        setChatOpen(true); // Auto-open chat if there are unread messages
      }
    };
    
    checkUnreadMessages();
    
    // Listen for new supervisor messages
    const channel = supabase
      .channel('agent-supervisor-notification')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'supervisor_messages',
        filter: `recipient_id=eq.${user.id}` 
      }, (payload) => {
        console.log('New message received:', payload);
        setHasNewMessages(true);
        setChatOpen(true); // Auto-open chat on new messages
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAgent]);

  const openChat = () => {
    if (isAgent) {
      setChatOpen(true);
    }
  };

  const closeChat = () => {
    setChatOpen(false);
    setHasNewMessages(false);
  };

  return (
    <SupervisorChatContext.Provider value={{ hasNewMessages, openChat, closeChat }}>
      {children}
      {chatOpen && isAgent && (
        <AgentChatPopup onClose={closeChat} />
      )}
    </SupervisorChatContext.Provider>
  );
};
