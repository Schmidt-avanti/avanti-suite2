import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Building2, Send, CheckCircle, Save, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { intelligentDialogService, ChatMessage } from "@/lib/services/intelligentDialogService";
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { StepSuggestionCard } from './StepSuggestionCard';
import { DialogStepBuilder } from './DialogStepBuilder';

// Neue Typen für Step-by-Step Dialog Creation
interface Message extends ChatMessage {
  timestamp: Date;
}

interface DialogStep {
  id: string;
  type: 'question' | 'input' | 'routing' | 'final';
  content: string;
  options?: string[];
  next_step?: string;
  user_input?: string; // For routing steps with user input
}

interface StepSuggestion {
  step_suggestion: string;
  reasoning: string;
  step_type: 'question' | 'input' | 'routing' | 'final';
  options?: string[];
  is_complete?: boolean;
}

interface RoutingInfo {
  recipient?: string;
  email?: string;
  cc?: string;
  requiresRouting?: boolean;
}

interface Customer {
  id: string;
  name: string;
  industry: string | null;
}

interface IntelligentDialogCreatorProps {
  onSave?: (data: { 
    steps: DialogStep[],
    routingInfo: RoutingInfo,
    conversation: Message[],
    customer?: Customer
  }) => void;
  initialDescription?: string;
}

interface ChatState {
  loading: boolean;
  error: string | null;
  responseId?: string;
  currentSuggestion?: StepSuggestion;
}

const IntelligentDialogCreator: React.FC<IntelligentDialogCreatorProps> = ({
  onSave,
  initialDescription = ''
}) => {
  const [inputValue, setInputValue] = useState('');
  
  // Kunden-State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Dialog-State (neu)
  const [dialogSteps, setDialogSteps] = useState<DialogStep[]>([]);
  const [routingInfo, setRoutingInfo] = useState<RoutingInfo>({});
  const [useCaseDescription, setUseCaseDescription] = useState(initialDescription);

  // Chat-Status
  const [chatState, setChatState] = useState<ChatState>({
    loading: false,
    error: null,
    responseId: undefined,
    currentSuggestion: undefined
  });

  // Chat-Nachrichten
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Kunden laden
  useEffect(() => {
    fetchCustomers();
  }, []);
  
  // Initial-Nachricht setzen/aktualisieren, wenn Kunde ausgewählt wird
  useEffect(() => {
    if (selectedCustomer) {
      // Chat zurücksetzen und neue Begrüßung setzen
      setMessages([
        {
          role: 'assistant',
          content: `Hallo! Ich helfe dir beim Erstellen eines neuen Guided Dialogs für ${selectedCustomer.name}${selectedCustomer.industry ? ` (${selectedCustomer.industry})` : ''}. Beschreibe bitte den Use Case, den du erstellen möchtest, und ich schlage dir Schritt für Schritt die passenden Dialog-Elemente vor.`,
          timestamp: new Date()
        }
      ]);
      
      // Dialog-State auch zurücksetzen bei Kundenwechsel
      setDialogSteps([]);
      setRoutingInfo({});
      setUseCaseDescription('');
      setChatState({
        loading: false,
        error: null,
        responseId: undefined,
        currentSuggestion: undefined
      });
    }
  }, [selectedCustomer]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, industry')
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        console.error('Fehler beim Laden der Kunden:', error);
        return;
      }
      
      setCustomers(data || []);
      if (data && data.length > 0) {
        setSelectedCustomer(data[0]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Funktion zum Parsen der KI-Antwort für Step Suggestions
  const parseStepSuggestion = (content: string): StepSuggestion | null => {
    try {
      // Versuche direktes JSON-Parsing
      const parsed = JSON.parse(content);
      
      // Prüfe auf gültige Step Suggestion (auch conditional steps)
      if (parsed.step_type && (parsed.step_suggestion || parsed.condition_question)) {
        console.log('Step Suggestion erkannt:', parsed);
        return parsed as StepSuggestion;
      }
    } catch (e) {
      // Falls direktes Parsing fehlschlägt, suche nach JSON im Text
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.step_type && (parsed.step_suggestion || parsed.condition_question)) {
            console.log('Step Suggestion in Text gefunden:', parsed);
            return parsed as StepSuggestion;
          }
        }
      } catch (e2) {
        // Auch das hat nicht funktioniert
      }
    }
    
    return null;
  };

  // Funktion zum Senden einer Nachricht an die API
  const sendMessageToAPI = async (msgs: Message[]) => {
    if (!selectedCustomer) {
      setChatState(prev => ({ ...prev, error: 'Bitte wähle zuerst einen Kunden aus.' }));
      return;
    }

    setChatState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Konvertiere Messages für API
      const apiMessages = msgs.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Kundendaten für Kontext
      const customerData = {
        name: selectedCustomer.name,
        industry: selectedCustomer.industry || undefined
      };

      const response = await intelligentDialogService.sendChat(
        apiMessages,
        chatState.responseId,
        'generate',
        {
          current_steps: dialogSteps,
          use_case_description: useCaseDescription,
          routing_info: routingInfo
        },
        customerData
      );

      if (response.message) {
        const aiMessage: Message = {
          role: 'assistant',
          content: response.message,
          timestamp: new Date()
        };

        // Versuche Step Suggestion zu parsen
        const stepSuggestion = parseStepSuggestion(response.message);
        
        if (stepSuggestion) {
          // Step Suggestion erkannt
          setChatState(prev => ({
            ...prev,
            loading: false,
            currentSuggestion: stepSuggestion,
            responseId: response.response_id
          }));
        } else {
          // Normale Chat-Nachricht hinzufügen
          setMessages(prev => [...prev, aiMessage]);
          setChatState(prev => ({
            ...prev,
            loading: false,
            responseId: response.response_id
          }));
        }
      } else {
        throw new Error('Keine Antwort erhalten');
      }
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
      setChatState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten'
      }));
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputValue.trim() || chatState.loading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');

    // Use Case Description setzen, falls noch nicht vorhanden
    if (!useCaseDescription && inputValue.trim()) {
      setUseCaseDescription(inputValue.trim());
    }

    // API-Aufruf
    sendMessageToAPI(newMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Step Suggestion Handler
  const handleAcceptStep = (inputValue?: string) => {
    if (!chatState.currentSuggestion) return;

    const newStep: DialogStep = {
      id: `step-${dialogSteps.length + 1}`,
      type: chatState.currentSuggestion.step_type,
      content: chatState.currentSuggestion.step_suggestion,
      options: chatState.currentSuggestion.options,
      user_input: inputValue
    };

    // Routing Info speichern
    if (chatState.currentSuggestion.step_type === 'routing') {
      if (chatState.currentSuggestion.step_suggestion.toLowerCase().includes('e-mail')) {
        setRoutingInfo(prev => ({ ...prev, email: inputValue }));
      } else {
        setRoutingInfo(prev => ({ ...prev, recipient: inputValue }));
      }
    }

    setDialogSteps(prev => [...prev, newStep]);
    setChatState(prev => ({ ...prev, currentSuggestion: undefined }));

    // Nächsten Schritt anfordern
    requestNextStep();
  };

  const handleModifyStep = () => {
    // Zeige Eingabefeld für Anpassung des KI-Vorschlags
    setChatState(prev => ({ ...prev, showModifyInput: true }));
  };

  const handleAddManualStep = () => {
    // TODO: Implement manual step addition
    console.log('Manual step addition requested');
  };

  // Prüfe ob der Flow bereits abgeschlossen ist
  const isFlowComplete = () => {
    return dialogSteps.some(step => {
      // Prüfe zuerst auf final type
      if (step.type === 'final') {
        return true;
      }
      
      // Prüfe content nur wenn es existiert (robuste Null-Prüfung)
      if (step.content && typeof step.content === 'string') {
        const lowerContent = step.content.toLowerCase();
        return lowerContent.includes('abgeschlossen') ||
               lowerContent.includes('vollständig') ||
               lowerContent.includes('beendet');
      }
      
      return false;
    });
  };

  const requestNextStep = () => {
    // Verhindere weitere Schritte wenn Flow bereits abgeschlossen
    if (isFlowComplete()) {
      console.log('Flow ist bereits abgeschlossen - keine weiteren Schritte nötig');
      return;
    }

    const requestMessage: Message = {
      role: 'user',
      content: 'Nächster Schritt?',
      timestamp: new Date()
    };

    const newMessages = [...messages, requestMessage];
    setMessages(newMessages);
    sendMessageToAPI(newMessages);
  };

  const handleEditStep = (stepId: string) => {
    console.log('Edit step:', stepId);
    // TODO: Implement step editing
  };

  const handleDeleteStep = (stepId: string) => {
    setDialogSteps(prev => prev.filter(step => step.id !== stepId));
  };

  const handleSaveDialog = () => {
    if (onSave) {
      onSave({
        steps: dialogSteps,
        routingInfo,
        conversation: messages,
        customer: selectedCustomer || undefined
      });
    }
  };

  const handleUpdateRoutingInfo = (info: RoutingInfo) => {
    setRoutingInfo(info);
  };

  const canSave = dialogSteps.length > 0 && (
    routingInfo.requiresRouting === false || 
    (routingInfo.recipient && routingInfo.email)
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Guided Dialog Creator</h1>
          </div>
          
          {/* Kundenauswahl */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Kunde:</span>
            </div>
            
            {loadingCustomers ? (
              <div className="w-48 h-10 bg-gray-100 animate-pulse rounded"></div>
            ) : (
              <Select
                value={selectedCustomer?.id || ''}
                onValueChange={(value) => {
                  const customer = customers.find(c => c.id === value);
                  setSelectedCustomer(customer || null);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Kunde auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{customer.name}</span>
                        {customer.industry && (
                          <span className="text-xs text-gray-500">{customer.industry}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Chat & Step Suggestions */}
        <div className="w-1/2 flex flex-col border-r">
          {/* Chat Messages */}
          <div className="flex-1 p-4">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                
                {chatState.loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-600">KI denkt nach...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Step Suggestion Card oder Completion Message */}
          {isFlowComplete() ? (
            <div className="p-4 border-t">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <h3 className="font-medium">Use Case Flow abgeschlossen</h3>
                </div>
                <p className="text-sm text-green-700 mb-3">
                  Alle notwendigen Schritte für den Use Case sind definiert. Du kannst jetzt speichern oder manuelle Anpassungen vornehmen.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => console.log('Speichern')} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Use Case speichern
                  </Button>
                  <Button onClick={handleAddManualStep} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Manuell hinzufügen
                  </Button>
                </div>
              </div>
            </div>
          ) : chatState.currentSuggestion && (
            <div className="p-4 border-t">
              <StepSuggestionCard
                suggestion={chatState.currentSuggestion}
                onAccept={handleAcceptStep}
                onModify={handleModifyStep}
                onAddManual={handleAddManualStep}
                loading={chatState.loading}
              />
            </div>
          )}

          {/* Chat Input */}
          <div className="p-4 border-t">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={selectedCustomer ? "Beschreibe deinen Use Case..." : "Bitte wähle zuerst einen Kunden aus"}
                disabled={selectedCustomer === null || chatState.loading}
                className="flex-1 min-h-[60px] resize-none"
              />
              <Button
                type="submit"
                disabled={!inputValue.trim() || selectedCustomer === null || chatState.loading}
                className="px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            
            {chatState.error && (
              <p className="text-red-600 text-sm mt-2">{chatState.error}</p>
            )}
          </div>
        </div>

        {/* Right Panel - Dialog Step Builder */}
        <div className="w-1/2 p-4">
          <DialogStepBuilder
            steps={dialogSteps}
            routingInfo={routingInfo}
            onEditStep={handleEditStep}
            onDeleteStep={handleDeleteStep}
            onSave={handleSaveDialog}
            onUpdateRoutingInfo={handleUpdateRoutingInfo}
            canSave={canSave}
          />
        </div>
      </div>
    </div>
  );
};

export default IntelligentDialogCreator;
