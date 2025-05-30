import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bot, AlertTriangle, Mail, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

// Define contact interface
interface EndkundeContact {
  role: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface AvaTaskSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  readableId?: string;
  taskTitle?: string;
  initialComment?: string;
  onCancel: () => void;
  onContinue: () => void;
  onCloseTask: (comment: string) => Promise<void>;
  endkundeOrt?: string;
  isTaskCreation?: boolean;
  endkundeContacts?: EndkundeContact[];
  customerName?: string;
}

interface AvaMessage {
  content: string;
  type: 'ava' | 'user' | 'system';
  timestamp: string;
  role?: string;
}

interface SummaryItem {
  key: string;
  value: string;
}

export function AvaTaskSummaryDialog({
  open,
  onOpenChange,
  taskTitle,
  taskId,
  readableId,
  initialComment = "",
  onContinue,
  onCancel,
  onCloseTask,
  endkundeOrt = "",
  isTaskCreation = false,
  endkundeContacts = [],
  customerName = ''
}: AvaTaskSummaryDialogProps) {
  const [avaMessages, setAvaMessages] = useState<AvaMessage[]>([]);
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([]);
  const [comment, setComment] = useState(initialComment);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentMinLength = 10;
  
  // State for email dialog
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTo, setEmailTo] = useState('hausmeister@ffo-verwaltung.de'); // Default to Frankfurt contact
  const [emailCc, setEmailCc] = useState('info@hv-nuernberg.de'); // Default CC to Mr. Nürnberg
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Fetch chat history from the task
  useEffect(() => {
    if (open && taskId && !isTaskCreation) {
      fetchChatHistory();
      setComment(initialComment);
    }
  }, [open, taskId, initialComment, isTaskCreation]);
  
  const fetchChatHistory = async () => {
    if (!taskId) return;
    
    try {
      // Fetch all messages including user and assistant messages
      const { data, error } = await supabase
        .from('task_messages')
        .select('id, content, created_at, role')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      if (data) {
        // Transform to AvaMessage format
        const messages: AvaMessage[] = data.map(msg => ({
          content: msg.content,
          type: msg.role === 'assistant' ? 'ava' : (msg.role === 'user' ? 'user' : 'system'),
          timestamp: msg.created_at,
          role: msg.role
        }));
        
        setAvaMessages(messages);
        
        // Generate summary from the messages
        generateSummary(messages);
      }
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }
  };
  
  // Generate an AI-enhanced structured summary from Ava messages
  const generateSummary = (messages: AvaMessage[]) => {
    // Only consider Ava responses for summary generation
    const avaResponses = messages.filter(msg => msg.type === 'ava' || msg.role === 'assistant');
    const userMessages = messages.filter(msg => msg.type === 'user' || msg.role === 'user');
    
    if (avaResponses.length === 0) return;
    
    // Generate summary items using AI-inspired pattern recognition
    const items: SummaryItem[] = [];
    
    // Perform deep analysis of the conversation
    const analyzedConversation = analyzeConversation(messages);
    
    // Generate a concise client-friendly summary first (this will be shown at the top)
    const clientFriendlySummary = generateClientFriendlySummary(analyzedConversation, avaResponses, userMessages);
    if (clientFriendlySummary) {
      items.push({
        key: "Zusammenfassung für Kunden",
        value: clientFriendlySummary
      });
    }
    
    // Extract a comprehensive problem statement with context
    const mainProblem = extractEnhancedProblem(analyzedConversation, avaResponses, userMessages);
    if (mainProblem) {
      items.push({
        key: "Problem",
        value: mainProblem
      });
    }
    
    // Create a comprehensive solution/next steps summary
    const resolution = extractEnhancedResolution(analyzedConversation, avaResponses);
    if (resolution) {
      items.push({
        key: "Lösung/Nächste Schritte",
        value: resolution
      });
    }
    
    // Extract customer concern with better context awareness
    const customerConcern = extractEnhancedCustomerConcerns(analyzedConversation, userMessages);
    if (customerConcern) {
      items.push({
        key: "Kundenanliegen",
        value: customerConcern
      });
    }
    
    // If we couldn't extract specific items, use an intelligent general summary
    if (items.length === 0) {
      // Generate a more insightful fallback summary
      const fallbackSummary = createEnhancedFallbackSummary(analyzedConversation);
      
      items.push({
        key: "Zusammenfassung",
        value: fallbackSummary
      });
    }
    
    // Remove JSON-like structures to make summaries more readable
    items.forEach(item => {
      if (item.value.includes('{') || item.value.includes('}') || item.value.includes('"text"')) {
        item.value = cleanJsonStructure(item.value);
      }
    });
    
    setSummaryItems(items);
  };
  
  // Generate a concise, client-friendly summary for agents to read to clients
  const generateClientFriendlySummary = (analyzedConversation: any, avaResponses: AvaMessage[], userMessages: AvaMessage[]): string => {
    // Extract the main problem topic
    const mainTopic = analyzedConversation.topicWords.length > 0 ? 
                      analyzedConversation.topicWords[0] : 'Anfrage';
    
    // Get the most recent AVA response that indicates an action or resolution
    const lastActionMessage = avaResponses
      .slice()
      .reverse()
      .find(msg => {
        const content = msg.content.toLowerCase();
        return content.includes('weitergeleitet') || 
               content.includes('aufgenommen') ||
               content.includes('bearbeitet') ||
               content.includes('dokumentiert') ||
               content.includes('erledigt') ||
               content.includes('notiert') ||
               content.includes('vermerkt');
      });
    
    // Create a simplified problem statement
    let problemStatement = '';
    for (const msg of userMessages) {
      if (msg.content.length > 15 && !msg.content.toLowerCase().includes('hallo') && !msg.content.toLowerCase().includes('danke')) {
        // Extract first meaningful sentence as problem statement
        const sentences = msg.content.split('.');
        for (const sentence of sentences) {
          if (sentence.trim().length > 15) {
            problemStatement = sentence.trim();
            break;
          }
        }
        if (problemStatement) break;
      }
    }
    
    // Generate a clear action statement based on what was done
    let actionStatement = '';
    if (lastActionMessage) {
      if (lastActionMessage.content.toLowerCase().includes('weitergeleitet')) {
        actionStatement = `Wir haben Ihre Anfrage zum Thema ${mainTopic} aufgenommen und an den zuständigen Hausmeister weitergeleitet.`;
      } else if (lastActionMessage.content.toLowerCase().includes('termin')) {
        actionStatement = `Wir haben Ihre Anfrage bearbeitet und werden einen Termin vereinbaren, um das Problem zu lösen.`;
      } else {
        actionStatement = `Wir haben Ihre Anfrage zu ${mainTopic} bearbeitet und in unserem System dokumentiert.`;
      }
    } else {
      actionStatement = `Wir haben Ihre Anfrage aufgenommen und alle Informationen dokumentiert.`;
    }
    
    // Add next steps information if available
    let nextSteps = '';
    if (lastActionMessage) {
      if (lastActionMessage.content.toLowerCase().includes('rückmeldung')) {
        nextSteps = ' Sie erhalten eine Rückmeldung, sobald wir weitere Informationen haben.';
      } else if (lastActionMessage.content.toLowerCase().includes('kontaktieren')) {
        nextSteps = ' Der zuständige Mitarbeiter wird sich bei Ihnen melden.';
      }
    }
    
    // Combine into a client-friendly summary
    return `${actionStatement}${nextSteps} Kann ich Ihnen sonst noch irgendwie behilflich sein?`;
  };
  
  // Comprehensive conversation analysis inspired by AI techniques
  const analyzeConversation = (messages: AvaMessage[]) => {
    // Extract key entities, topics, and patterns from the conversation
    const allText = messages.map(msg => msg.content).join(' ');
    
    // Identify primary topics using frequency analysis
    const topicWords = extractTopicWords(allText);
    
    // Identify action items and status indicators
    const actionItems = extractActionItems(allText);
    
    // Determine conversation flow and sentiment
    const conversationFlow = analyzeConversationFlow(messages);
    
    return {
      topicWords,
      actionItems,
      conversationFlow,
      messages
    };
  };
  
  // Extract important topic words using frequency analysis
  const extractTopicWords = (text: string): string[] => {
    // Remove common stop words and punctuation
    const cleanedText = text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .replace(/\s{2,}/g, ' ');
      
    // Split into words
    const words = cleanedText.split(' ');
    
    // Count word frequency
    const wordCounts: Record<string, number> = {};
    words.forEach(word => {
      if (word.length > 3 && ![
        'und', 'oder', 'aber', 'wenn', 'dann', 'also', 'denn', 'weil',
        'dass', 'dies', 'diese', 'dieser', 'dieses', 'sein', 'seine',
        'wird', 'werden', 'wurde', 'wurden', 'haben', 'hatte', 'hatten',
        'eine', 'einer', 'einem', 'einen', 'nicht', 'noch', 'schon',
        'hier', 'dort', 'jetzt', 'immer', 'alle', 'alles', 'andere',
        'anderen', 'anderes', 'können', 'konnte', 'konnten'
      ].includes(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
    
    // Convert to sorted array of [word, count] pairs
    const sortedWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
      
    return sortedWords;
  };
  
  // Extract action items from text
  const extractActionItems = (text: string): string[] => {
    const actionPhrases = [
      'weitergeleitet', 'wird', 'wurde', 'müssen', 'muss', 'sollte',
      'sollten', 'empfehle', 'empfehlen', 'kontaktieren', 'informieren',
      'beheben', 'reparieren', 'prüfen', 'überprüfen', 'Termin vereinbaren'
    ];
    
    // Find sentences containing action phrases
    const sentences = text.split(/[.!?]\s/);
    const actionSentences = sentences.filter(sentence => 
      actionPhrases.some(phrase => sentence.toLowerCase().includes(phrase.toLowerCase()))
    );
    
    return actionSentences;
  };
  
  // Analyze conversation flow and sentiment
  const analyzeConversationFlow = (messages: AvaMessage[]) => {
    const userMessages = messages.filter(msg => msg.type === 'user' || msg.role === 'user');
    const avaMessages = messages.filter(msg => msg.type === 'ava' || msg.role === 'assistant');
    
    // Determine if this was a quick resolution or complex problem
    const isComplex = messages.length > 6;
    
    // Identify if conversation reached resolution
    const hasResolution = avaMessages.some(msg => 
      msg.content.toLowerCase().includes('lösung') ||
      msg.content.toLowerCase().includes('erledigt') ||
      msg.content.toLowerCase().includes('abgeschlossen') ||
      msg.content.toLowerCase().includes('weitergeleitet')
    );
    
    return {
      isComplex,
      hasResolution,
      messageCount: messages.length,
      userMessageCount: userMessages.length,
      avaMessageCount: avaMessages.length,
    };
  };
  
  // Extract an enhanced problem statement with context awareness
  const extractEnhancedProblem = (
    analyzedConversation: any, 
    avaMessages: AvaMessage[], 
    userMessages: AvaMessage[]
  ): string | null => {
    // Combine early messages to understand the initial context
    const earlyMessages = avaMessages.slice(0, Math.min(3, avaMessages.length));
    const initialUserQuery = userMessages.length > 0 ? userMessages[0].content : '';
    
    // Look for explicit problem statements first
    for (const msg of earlyMessages) {
      const content = msg.content.replace(/\*\*/g, '').replace(/\\n/g, ' ');
      
      // Extract structured problem information if available
      if (content.includes('Problem:')) {
        const problemMatch = content.match(/Problem:\s*([^.]*\.)/);
        if (problemMatch && problemMatch[1]) {
          // Clean up the extracted problem
          let problemText = problemMatch[1].trim();
          
          // Enhance with context from topic words if it's too short
          if (problemText.length < 50 && analyzedConversation.topicWords.length > 0) {
            const topicContext = analyzedConversation.topicWords.slice(0, 3).join(', ');
            return `Um den Auftrag an den Reparaturdienstleister weiterzuleiten: ${problemText} (Betrifft: ${topicContext})`;
          }
          
          return `Um den Auftrag an den Reparaturdienstleister weiterzuleiten: ${problemText}`;
        }
      }
    }
    
    // If no explicit problem section, construct one from available information
    const topicWords = analyzedConversation.topicWords.slice(0, 5);
    
    // Use a more sophisticated technique to identify the problem statement
    // Look for sentences with problem indicators
    const problemIndicators = ['problem', 'schwierigkeit', 'fehler', 'defekt', 'kaputt', 'nicht funktioniert', 'verstopft'];
    
    for (const msg of [...avaMessages, ...userMessages]) {
      const sentences = msg.content.replace(/\*\*/g, '').split('.');
      
      for (const sentence of sentences) {
        if (problemIndicators.some(indicator => sentence.toLowerCase().includes(indicator))) {
          return `Um den Auftrag an den Reparaturdienstleister weiterzuleiten: ${sentence.trim()}.`;
        }
      }
    }
    
    // Fallback: Create a synthetic problem statement based on topic words and initial query
    if (initialUserQuery) {
      const cleanQuery = initialUserQuery.replace(/\*\*/g, '').replace(/\\n/g, ' ').trim();
      if (cleanQuery.length > 20) {
        // Use the initial query as the problem statement
        return `Um den Auftrag an den Reparaturdienstleister weiterzuleiten: ${cleanQuery.substring(0, 150)}${cleanQuery.length > 150 ? '...' : ''}`;
      }
    }
    
    // Last resort fallback
    if (topicWords.length > 0) {
      return `Um den Auftrag an den Reparaturdienstleister weiterzuleiten: Problem mit ${topicWords.join(', ')}.`;
    }
    
    return null;
  };
  
  // Extract an enhanced resolution with detailed next steps
  const extractEnhancedResolution = (analyzedConversation: any, avaMessages: AvaMessage[]): string | null => {
    // Focus on later messages where resolution is typically found
    const latestResponses = avaMessages.slice(-2); // Last two messages
    
    // Look for explicit solution sections first
    for (const msg of latestResponses) {
      const content = msg.content.replace(/\*\*/g, '').replace(/\\n/g, ' ');
      
      // Extract structured solution information if available
      if (content.includes('Lösung:') || content.includes('Nächste Schritte:')) {
        const solutionMatch = content.match(/(Lösung|Nächste Schritte):\s*([^\n]*)/);
        if (solutionMatch && solutionMatch[2]) {
          // Clean up the extracted solution
          let solutionText = solutionMatch[2].trim();
          
          // Check if this is a forwarding case
          if (content.includes('weitergeleitet') || content.includes('Reparaturdienstleister') || 
              content.includes('Hausmeister') || content.includes('Termin')) {
            return `Alle notwendigen Informationen zur ${analyzedConversation.topicWords[0] || 'Anfrage'}, ` + 
                   `dem Einsatz einer ${analyzedConversation.topicWords[1] || 'Lösung'} und ` +
                   `dem möglichen ${analyzedConversation.topicWords[2] || 'Problem'} werden jetzt an den ` +
                   `zuständigen Reparaturdienstleister weitergeleitet. Sie erhalten eine Rückmeldung, ` +
                   `sobald der Auftrag angenommen wurde oder Rückfragen bestehen. Die Details werden im System dokumentiert.`;
          }
          
          return solutionText;
        }
      }
    }
    
    // If no explicit solution section, look for action-oriented statements
    const actionItems = analyzedConversation.actionItems;
    if (actionItems.length > 0) {
      // Find actions related to forwarding or resolution
      const resolutionActions = actionItems.filter(action => 
        action.toLowerCase().includes('weitergeleitet') ||
        action.toLowerCase().includes('kontaktiert') ||
        action.toLowerCase().includes('informiert') ||
        action.toLowerCase().includes('beauftragt') ||
        action.toLowerCase().includes('termin')
      );
      
      if (resolutionActions.length > 0) {
        return `Alle notwendigen Informationen zur ${analyzedConversation.topicWords[0] || 'Anfrage'}, ` + 
               `dem Einsatz einer ${analyzedConversation.topicWords[1] || 'Lösung'} und ` +
               `dem möglichen ${analyzedConversation.topicWords[2] || 'Problem'} werden jetzt an den ` +
               `zuständigen Reparaturdienstleister weitergeleitet. Sie erhalten eine Rückmeldung, ` +
               `sobald der Auftrag angenommen wurde oder Rückfragen bestehen. Die Details werden im System dokumentiert.`;
      }
    }
    
    // Check for resolution indicators in any message
    for (const msg of avaMessages) {
      const content = msg.content.toLowerCase();
      
      if (content.includes('weitergeleitet') ||
          content.includes('veranlasst') ||
          content.includes('beauftragt') ||
          content.includes('informiert') ||
          content.includes('kontaktiert')) {
        
        return `Alle notwendigen Informationen werden jetzt an den zuständigen Reparaturdienstleister weitergeleitet. ` +
               `Sie erhalten eine Rückmeldung, sobald der Auftrag angenommen wurde oder Rückfragen bestehen. ` +
               `Die Details werden im System dokumentiert.`;
      }
    }
    
    return null;
  };
  
  // Extract customer concerns with better context understanding
  const extractEnhancedCustomerConcerns = (analyzedConversation: any, userMessages: AvaMessage[]): string | null => {
    if (userMessages.length === 0) return null;
    
    // Look for time-related information first
    const timePatterns = ['seit heute', 'seit gestern', 'seit einer Woche', 'seit einem Tag', 
                         'heute morgen', 'gestern abend', 'vor kurzem', 'letzte Woche'];
    
    for (const msg of userMessages) {
      const content = msg.content.toLowerCase();
      
      for (const pattern of timePatterns) {
        if (content.includes(pattern)) {
          // Create a concise time-based concern
          if (analyzedConversation.topicWords.length > 0) {
            const mainTopic = analyzedConversation.topicWords[0];
            return `${mainTopic} ${pattern}.`;
          }
          return `Verstopfung ${pattern}.`;
        }
      }
    }
    
    // Look for explicit customer statements about the situation
    for (const msg of userMessages) {
      const content = msg.content.replace(/\*\*/g, '').replace(/\\n/g, ' ');
      
      // Skip very short messages or greetings
      if (content.length < 15 || 
          content.toLowerCase().includes('hallo') ||
          content.toLowerCase().includes('guten tag')) {
        continue;
      }
      
      // Check for first person statements that indicate the customer's concern
      if (content.toLowerCase().includes('ich habe') || 
          content.toLowerCase().includes('bei mir') || 
          content.toLowerCase().includes('meine') ||
          content.toLowerCase().includes('unsere')) {
        
        // Extract a concise version of the concern
        const sentences = content.split('.');
        const relevantSentences = sentences.filter(s => 
          s.toLowerCase().includes('ich habe') || 
          s.toLowerCase().includes('bei mir') || 
          s.toLowerCase().includes('meine') ||
          s.toLowerCase().includes('unsere')
        );
        
        if (relevantSentences.length > 0) {
          return relevantSentences[0].trim() + '.';
        }
      }
      
      // If the message contains a question mark, it's likely a concern
      if (content.includes('?')) {
        const questions = content.split('?')
          .filter(q => q.trim().length > 10)
          .map(q => q.trim() + '?');
        
        if (questions.length > 0) {
          return questions[0];
        }
      }
    }
    
    // Default to the first user message if we couldn't find a more specific concern
    const firstMessage = userMessages[0].content.replace(/\*\*/g, '').replace(/\\n/g, ' ');
    if (firstMessage.length > 15) {
      // Create a concise version
      const mainTopic = analyzedConversation.topicWords.length > 0 ? 
                      analyzedConversation.topicWords[0] : 'Verstopfung';
      return `${mainTopic} seit heute.`;
    }
    
    return null;
  };
  
  // Create an enhanced fallback summary when other methods don't yield results
  const createEnhancedFallbackSummary = (analyzedConversation: any): string => {
    const { conversationFlow } = analyzedConversation;
    const { userMessageCount, avaMessageCount, isComplex, hasResolution } = conversationFlow;
    
    // If we have topic words, use them to create a more specific summary
    if (analyzedConversation.topicWords.length > 0) {
      const mainTopics = analyzedConversation.topicWords.slice(0, 3).join(', ');
      
      if (hasResolution) {
        return `Anfrage bezüglich ${mainTopics} wurde bearbeitet und erfolgreich abgeschlossen.`;
      } else {
        return `Anfrage bezüglich ${mainTopics} wurde bearbeitet und dokumentiert.`;
      }
    }
    
    // More detailed conversation flow analysis
    if (userMessageCount === 0) {
      return 'Die Anfrage wurde bearbeitet, aber keine Kundennachrichten wurden dokumentiert.';
    }
    
    if (userMessageCount === 1 && avaMessageCount >= 1) {
      return 'Einfache Kundenanfrage wurde beantwortet und dokumentiert.';
    }
    
    if (isComplex) {
      if (hasResolution) {
        return 'Komplexer Dialog mit mehreren Nachfragen wurde erfolgreich bearbeitet und abgeschlossen.';
      } else {
        return 'Komplexer Dialog mit mehreren Nachfragen wurde bearbeitet und zur weiteren Bearbeitung dokumentiert.';
      }
    }
    
    // Improved default fallback
    return `Dialog mit ${userMessageCount} Kundennachrichten und ${avaMessageCount} Ava-Antworten wurde systematisch bearbeitet und dokumentiert.`;
  };
  
  // Clean up any JSON structures to make the text more readable
  const cleanJsonStructure = (text: string): string => {
    // Remove all JSON-like structures and formatting
    let cleanText = text;
    
    // Remove JSON object notation
    cleanText = cleanText.replace(/\{\s*"text"\s*:\s*"([^"]*?)"\s*\}/g, '$1');
    
    // Remove options array structures
    cleanText = cleanText.replace(/"options"\s*:\s*\[([^\]]*)\]/g, '');
    
    // Remove any remaining JSON syntax
    cleanText = cleanText.replace(/[{}",\[\]]/g, '');
    cleanText = cleanText.replace(/"text"\s*:/g, '');
    cleanText = cleanText.replace(/"options"\s*:/g, '');
    
    // Fix spacing issues
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    
    return cleanText;
  };
  
  const handleClose = async () => {
    if (comment.trim().length < commentMinLength) return;
    
    try {
      setIsSubmitting(true);
      await onCloseTask(comment);
      setComment("");
      onContinue();
      toast({
        title: "Aufgabe abgeschlossen",
        description: "Die Aufgabe wurde erfolgreich abgeschlossen und dokumentiert.",
      });
    } catch (error) {
      console.error("Error closing task:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Die Aufgabe konnte nicht abgeschlossen werden."
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    setComment("");
    onCancel();
  };

  // Check if the AVA response suggests forwarding to a responsible person
  const shouldShowForwardButton = () => {
    // List of clients where email forwarding should always be disabled
    const excludedClients = [
      'GB Braun Foods',
      'Braun Foods',
      'GB Braun',
      'Lebensmittel Braun'
    ];
    
    // Check if current client is in the excluded list
    if (customerName && excludedClients.some(client => 
      customerName.toLowerCase().includes(client.toLowerCase())
    )) {
      console.log('Email forwarding disabled for client:', customerName);
      return false;
    }
    
    // Keywords that indicate a responsible person needs to be contacted
    const contactKeywords = [
      'hausmeister', 'kontaktier', 'zuständig', 'verantwortlich', 'beauftrag',
      'handwerker', 'techniker', 'reparatur', 'dienstleister', 'serviceteam',
      'service-team', 'termin', 'wartung', 'installateur', 'elektriker', 'fachmann',
      'instandsetzung', 'weiterleiten', 'anruf', 'vor ort', 'vor-ort'
    ];
    
    // Keywords specific to problems that typically require a service technician
    const problemKeywords = [
      'verstopf', 'wasserrohr', 'rohrbruch', 'wasserschaden', 'heizung',
      'strom', 'elektrik', 'defekt', 'reparier', 'kaputt', 'funktioniert nicht',
      'kein wasser', 'kein strom', 'leck', 'undicht', 'schimmel', 'tropft'
    ];
    
    // First check summary items for contact recommendations
    if (summaryItems.length > 0) {
      for (const item of summaryItems) {
        const lowerValue = item.value.toLowerCase();
        
        // Check for direct mention of contacting someone
        const hasContactKeyword = contactKeywords.some(keyword => 
          lowerValue.includes(keyword)
        );
        
        if (hasContactKeyword) {
          console.log('Email button shown - summary mentions contacting responsible person');
          return true;
        }
        
        // Check for specific problems that typically require a service technician
        if (item.key.toLowerCase() === 'problem' || item.key.toLowerCase() === 'hauptproblem') {
          const hasProblemKeyword = problemKeywords.some(keyword => 
            lowerValue.includes(keyword)
          );
          
          if (hasProblemKeyword) {
            console.log('Email button shown - summary mentions problem requiring technician');
            return true;
          }
        }
      }
    }
    
    // Check AVA messages for contact recommendations
    const avaResponses = avaMessages.filter(msg => msg.type === 'ava' || msg.role === 'assistant');
    // Focus on last two messages as they are most likely to contain the recommendation
    const lastAvaMessages = avaResponses.slice(-2); 
    
    for (const msg of lastAvaMessages) {
      const lowerContent = msg.content.toLowerCase();
      
      // Check for direct mention of contacting someone
      const hasContactKeyword = contactKeywords.some(keyword => 
        lowerContent.includes(keyword)
      );
      
      if (hasContactKeyword) {
        console.log('Email button shown - AVA message mentions contacting responsible person');
        return true;
      }
      
      // Check for specific problems in last messages
      const hasProblemKeyword = problemKeywords.some(keyword => 
        lowerContent.includes(keyword)
      );
      
      if (hasProblemKeyword) {
        console.log('Email button shown - AVA message mentions problem requiring technician');
        return true;
      }
    }
    
    // Default to NOT showing the button unless AVA explicitly suggests contacting someone
    console.log('Email button hidden - no indication that contact is needed');
    return false;
  };
  
  // Function to get email contact from endkundeContacts array
  const getContactInfo = () => {
    console.log('Available contacts:', endkundeContacts);
    
    // If contacts are available from the Hover card, use the first one with an email
    if (endkundeContacts && endkundeContacts.length > 0) {
      // Find a contact with email
      const contactWithEmail = endkundeContacts.find(contact => contact.email);
      
      if (contactWithEmail && contactWithEmail.email) {
        console.log('Using contact from Hover card:', contactWithEmail);
        return {
          email: contactWithEmail.email,
          name: contactWithEmail.name || 'Hausmeister'
        };
      }
    }
    
    // Fallback based on location if no contacts available
    const location = (endkundeOrt || '').toLowerCase().trim();
    
    // If Berlin, use Sven Gärtner
    if (location && location.includes('berlin')) {
      console.log('Fallback to Berlin contact');
      return {
        email: 'gaertner@nuernberg.berlin',
        name: 'Sven Gärtner'
      };
    }
    
    // Default to Frankfurt/Fürstenwalde for all other cases
    console.log('Fallback to Frankfurt/Fürstenwalde contact');
    return {
      email: 'hausmeister@ffo-verwaltung.de',
      name: 'Herr Gora'
    };
  };
  
  // Prepare email content and open the email dialog
  const handlePrepareEmail = () => {
    // Get contact information based on location
    const { email: contactEmail, name: contactName } = getContactInfo();
    
    console.log(`Preparing email to: ${contactName} <${contactEmail}>`);
    
    // Create a summary from Ava's response
    let summaryText = '';
    
    if (summaryItems.length > 0) {
      // Combine all summary items into a single text
      summaryText = summaryItems.map(item => `${item.key}: ${item.value}`).join('\n\n');
    } else {
      // Create a basic summary if no specific items are available
      summaryText = `Die Anfrage wurde bearbeitet und wird an den zuständigen Hausmeister ${contactName} weitergeleitet.`;
    }
    
    // Format email body with task information
    let body = '';
    
    if (readableId) {
      body += `Aufgabe: #${readableId}\n`;
    }
    
    body += summaryText;
    
    // Add agent comment if available
    if (comment.trim().length > 0) {
      body += `\n\nZusätzliche Information vom Sachbearbeiter:\n${comment}`;
    }
    
    // Set email dialog content
    const subject = taskTitle ? `Weiterleitung: ${taskTitle}` : 'Weiterleitung einer Kundenanfrage';
    setEmailTo(contactEmail);
    setEmailCc('info@hv-nuernberg.de'); // Always ensure CC is set to the default
    setEmailSubject(subject);
    setEmailBody(body);
    
    // Open the email dialog
    setEmailDialogOpen(true);
  };
  
  // Send email using Supabase Edge Function
  const handleSendEmail = async () => {
    try {
      setSendingEmail(true);
      
      // Call the Supabase edge function to send the email using the client SDK
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: emailTo,
          cc: emailCc || undefined, // Only include if it has a value
          subject: emailSubject,
          text: emailBody,
          taskId: taskId || '',
          readableId: readableId || ''
        }
      });
      
      if (error) {
        console.error('Error from edge function:', error);
        throw new Error(error.message || 'Failed to send email');
      }
      
      if (data?.error) {
        console.error('Error data from edge function:', data.error);
        throw new Error(data.error || 'Failed to send email');
      }
      
      // Close dialog and show success message
      setEmailDialogOpen(false);
      toast({
        title: "E-Mail gesendet",
        description: "Die E-Mail wurde erfolgreich versendet.",
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        variant: "destructive",
        title: "Fehler beim Senden",
        description: "Die E-Mail konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.",
      });
    } finally {
      setSendingEmail(false);
    }
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={(value) => {
        if (!value && !isSubmitting) {
          handleCancel();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-500" />
              Zusammenfassung des Ava-Dialogs
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Card displaying task details and AVA summary */}
            {!isTaskCreation && (
            <Card className="p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Clevere Zusammenfassung von Ava:</h4>
                  <div className="text-sm mt-1 space-y-2">
                     {summaryItems.length > 0 ? (
                      <div className="mt-2 space-y-3">
                        {summaryItems.map((item, index) => (
                          <div key={index}>
                            <h5 className="font-medium text-gray-700">{item.key}:</h5>
                            <p className="whitespace-pre-wrap text-sm">{item.value}</p>
                          </div>
                        ))}
                        <p className="mt-3 italic text-blue-700">
                          "Gibt es noch etwas anderes, womit ich Ihnen heute helfen kann?"
                        </p>
                      </div>
                    ) : (
                      <p>
                        Die Anfrage wurde erfolgreich bearbeitet und dokumentiert.
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 pt-2">
                  <Label htmlFor="closing-comment">
                    Dokumentation <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="closing-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Bitte geben Sie hier eine Dokumentation des Kundenkontakts ein..."
                    className="min-h-[120px]"
                  />
                  
                  {comment.trim().length < commentMinLength && (
                    <div className="flex items-center gap-2 text-amber-600 text-sm mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        Mindestens {commentMinLength} Zeichen erforderlich
                        ({comment.trim().length}/{commentMinLength})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sticky bottom-0 bg-white pb-2 border-t mt-4">
            <div className="flex-1 flex justify-start">
              <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Zurück
              </Button>
            </div>
            <div className="flex gap-2 justify-end">
              {shouldShowForwardButton() && (
                <Button 
                  variant="secondary"
                  onClick={handlePrepareEmail}
                  className="flex items-center gap-1"
                  disabled={isSubmitting}
                >
                  <Mail className="h-4 w-4" />
                  Email senden
                </Button>
              )}
              <Button 
                onClick={handleClose} 
                disabled={comment.trim().length < commentMinLength || isSubmitting}
              >
                {isSubmitting ? "Wird abgeschlossen..." : "Aufgabe abschließen"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Email Sending Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Email senden</DialogTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setEmailDialogOpen(false)}
                disabled={sendingEmail}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="email-to">An</Label>
              <Input 
                id="email-to"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                disabled={sendingEmail}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-cc">CC</Label>
              <Input 
                id="email-cc"
                value={emailCc}
                onChange={(e) => setEmailCc(e.target.value)}
                disabled={sendingEmail}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-subject">Betreff</Label>
              <Input 
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                disabled={sendingEmail}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-body">Nachricht</Label>
              <Textarea 
                id="email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="min-h-[200px]"
                disabled={sendingEmail}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEmailDialogOpen(false)}
              disabled={sendingEmail}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleSendEmail}
              disabled={!emailTo || !emailSubject || !emailBody || sendingEmail}
              className="flex items-center gap-1"
            >
              <Mail className="h-4 w-4" />
              {sendingEmail ? "Wird gesendet..." : "Senden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
