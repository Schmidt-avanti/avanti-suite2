import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { Message } from './useTaskMessages';

// Hilfsfunktion zum Deduplizieren von Nachrichten
function deduplicateMessages(messages: Message[]): Message[] {
  // Erstelle eine Map für schnellen Zugriff auf Nachrichten nach ID
  const messageMap = new Map<string, Message>();
  
  // Gruppiere Nachrichten nach content+role, um Duplikate zu identifizieren
  const contentRoleGroups = new Map<string, Message[]>();
  
  // Fülle die Maps
  messages.forEach(msg => {
    messageMap.set(msg.id, msg);
    
    const key = `${msg.role}:${msg.content}`;
    if (!contentRoleGroups.has(key)) {
      contentRoleGroups.set(key, []);
    }
    contentRoleGroups.get(key)?.push(msg);
  });
  
  // Identifiziere Duplikate (gleicher Inhalt und Rolle)
  const duplicateIds = new Set<string>();
  contentRoleGroups.forEach((msgs, _) => {
    // Wenn es mehr als eine Nachricht mit gleichem Inhalt und Rolle gibt
    if (msgs.length > 1) {
      // Sortiere nach Erstellungsdatum (falls vorhanden) oder ID
      msgs.sort((a, b) => {
        if (a.created_at && b.created_at) {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        return a.id.localeCompare(b.id);
      });
      
      // Behalte nur die älteste Nachricht, markiere alle anderen als Duplikate
      for (let i = 1; i < msgs.length; i++) {
        duplicateIds.add(msgs[i].id);
      }
    }
  });
  
  // Filtere Duplikate aus
  return messages.filter(msg => !duplicateIds.has(msg.id));
}

interface UseTaskChatMessagesProps {
  taskId: string | undefined;
  useCaseId: string | undefined;
  onMessageSent: () => void;
  openAvaSummaryDialog: (data: { summaryDraft: string; textToAgent: string; options: string[] }) => void;
}

export const useTaskChatMessages = ({
  taskId,
  useCaseId,
  onMessageSent,
  openAvaSummaryDialog
}: UseTaskChatMessagesProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const { user } = useAuth();
  
  // Automatische Deduplizierung der Nachrichten
  useEffect(() => {
    if (taskId) {
      // Funktion zum Deduplizieren der Nachrichten in der Datenbank
      const dedupMessagesInDB = async () => {
        try {
          // Hole alle Nachrichten für diesen Task
          const { data: messages, error } = await supabase
            .from('task_messages')
            .select('*')
            .eq('task_id', taskId)
            .order('created_at', { ascending: true });
          
          if (error) {
            console.error('Fehler beim Laden der Nachrichten:', error);
            return;
          }
          
          if (!messages || messages.length === 0) {
            return; // Keine Nachrichten zum Deduplizieren
          }
          
          // Dedupliziere die Nachrichten
          const uniqueMessages = deduplicateMessages(messages as Message[]);
          
          // Wenn Duplikate gefunden wurden, aktualisiere die UI
          if (uniqueMessages.length < messages.length) {
            console.log(`${messages.length - uniqueMessages.length} doppelte Nachrichten gefunden und gefiltert.`);
            onMessageSent(); // Aktualisiere die Nachrichtenansicht
          }
        } catch (error) {
          console.error('Fehler bei der Deduplizierung:', error);
        }
      };
      
      // Führe die Deduplizierung aus
      dedupMessagesInDB();
    }
  }, [taskId, onMessageSent]); // Nur ausführen, wenn sich taskId ändert

  const sendMessage = async (text: string, buttonChoice: string | null = null, selectedOptions: Set<string>) => {
    // Validate taskId
    if (!user || !taskId || taskId === "undefined") {
      console.error("Invalid taskId or user", { taskId, userId: user?.id });
      return;
    }

    const isAutoInitialization = text === "" && !buttonChoice && useCaseId;

    if (!text && !buttonChoice && !isAutoInitialization) {
      console.log("No message content provided and not auto-initialization, skipping message send");
      return;
    }

    if (isLoading) {
      console.log("Already sending a message, skipping");
      return;
    }

    setIsLoading(true);
    setIsRateLimited(false);

    const displayName = (user as any)?.user_metadata?.full_name || user?.email;

    // DEBUG-LOGGING: Sendeparameter
    console.log('[TaskChat] Sende Nachricht:', {
      taskId,
      useCaseId,
      text,
      buttonChoice,
      previousResponseId,
      selectedOptions: Array.from(selectedOptions),
      isAutoInitialization,
      user_display_name: displayName
    });

    try {
      const { data, error } = await supabase.functions.invoke('handle-task-chat', {
        body: {
          taskId,
          useCaseId: useCaseId || null,
          message: text,
          buttonChoice,
          previousResponseId,
          selectedOptions: Array.from(selectedOptions),
          isAutoInitialization: isAutoInitialization,
          user_display_name: displayName,
        },
      });

      // DEBUG-LOGGING: Antwort
      console.log('[TaskChat] Antwort von handle-task-chat:', { data, error });

      if (error) {
        console.error("Error from handle-task-chat function:", error);
        if (error.message?.includes('rate limit')) {
          setIsRateLimited(true);
          throw new Error('Der API-Dienst ist derzeit überlastet. Bitte versuchen Sie es später erneut.');
        }
        throw error;
      }

      try {
        if (data && typeof data.content === "string" && data.content.trim().startsWith("{")) {
          const parsedBackendResponse = JSON.parse(data.content);

          // DEBUG-LOGGING: Parsed Backend Response
          console.log('[TaskChat] Parsed Backend Response:', parsedBackendResponse);

          if (parsedBackendResponse && parsedBackendResponse.action === "propose_completion") {
            openAvaSummaryDialog({
              summaryDraft: parsedBackendResponse.summary_draft || "",
              textToAgent: parsedBackendResponse.text_to_agent || "Möchten Sie diesen Fall abschließen?",
              options: parsedBackendResponse.options || [],
            });
            setPreviousResponseId(data.response_id); // Set for potential continuation
          } else {
            setPreviousResponseId(data.response_id);
            onMessageSent();
          }
        } else {
          console.warn('[TaskChat] Keine oder ungültige Antwort vom Server erhalten:', data);
          toast.error("Keine oder ungültige Antwort vom Server erhalten. Bitte versuche es erneut.");
          setPreviousResponseId(data?.response_id);
          onMessageSent();
        }
      } catch (parseError) {
        console.error('[TaskChat] Fehler beim Verarbeiten der Server-Antwort:', parseError, data);
        toast.error("Fehler beim Verarbeiten der Server-Antwort. Bitte versuche es erneut.");
        setPreviousResponseId(data?.response_id);
        onMessageSent();
      }
      setRetryCount(0);
    } catch (error: any) {
      console.error('Error sending message:', error);

      if (error.message?.includes('rate limit') || error.message?.includes('überlastet')) {
        setIsRateLimited(true);
        toast.error('API-Dienst überlastet. Bitte warten Sie einen Moment.');
      } else {
        toast.error('Fehler beim Senden der Nachricht');
      }
    } finally {
      setIsLoading(false);
      setInputValue('');
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setTimeout(() => {
      sendMessage("", null, new Set<string>()); // Diese Zeile bleibt für den Retry-Mechanismus, wie sie ist. 
// Der Retry sollte eine normale Anfrage auslösen, keine spezielle Dialogöffnung.
    }, retryCount * 2000);
  };

  return {
    isLoading,
    isRateLimited,
    inputValue,
    setInputValue,
    sendMessage,
    handleRetry,
    retryCount
  };
};
