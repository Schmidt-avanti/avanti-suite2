import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import UseCaseChatAndPreview from "@/components/use-cases/UseCaseChatAndPreview";
import { useCustomers } from "@/hooks/useCustomers";
import { usePromptTemplates } from "@/hooks/usePromptTemplates";
import type { UseCaseType } from "@/types/use-case";
import type { Customer, Message } from "@/types";
import { ProcessMap, ProcessStep } from "@/types/process";



interface UseCase {
  title: string;
  expected_result: string;
  information_needed: string;
  process_map?: ProcessMap;
  type?: UseCaseType;
  customer_id?: string;
  raw_response?: any;
  response_id?: string;
}

enum Step {
  FORM,
  CHAT,
}

const extractUseCaseJson = (content: string): UseCase | null => {
  console.log("Parsing AI response:", content?.substring(0, 100) + "...");
  
  const jsonRegex = /```(?:json)?\n([\s\S]*?)\n```/;
  let jsonContent = null;
  const match = content?.match(jsonRegex);
  
  if (match && match[1]) {
    console.log("Found JSON code block in response");
    jsonContent = match[1];
  } else {
    console.log("No JSON code block found, trying to parse entire content");
    jsonContent = content;
  }
  
  if (!jsonContent) {
    console.error("No valid content to parse");
    return null;
  }
  
  try {
    const parsedJson = JSON.parse(jsonContent);
    console.log("Successfully parsed JSON:", parsedJson);
    
    if (!parsedJson.title || !parsedJson.type) {
      console.error("Parsed JSON missing required fields (title or type)");
      return null;
    }
    
    return parsedJson;
  } catch (error) {
    console.error("Error parsing JSON from AI response:", error);
    try {
      const possibleJson = content?.match(/{[\s\S]*}/)?.[0];
      if (possibleJson) {
        console.log("Trying to extract JSON by searching for object literals");
        return JSON.parse(possibleJson);
      }
    } catch (fallbackError) {
      console.error("Fallback parsing also failed:", fallbackError);
    }
    return null;
  }
};

const CreateUseCasePage = () => {
  const [step, setStep] = useState<Step>(Step.FORM);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [type, setType] = useState<UseCaseType | "">("");
  const [topicInput, setTopicInput] = useState<string>("");
  const [chatInput, setChatInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiResponseJson, setAiResponseJson] = useState<UseCase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [responseId, setResponseId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const { customers, isLoading: isLoadingCustomers } = useCustomers();
  const { templates, isLoading: isLoadingPrompts } = usePromptTemplates();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerIdFromUrl = searchParams.get("customer_id");

  useEffect(() => {
    if (customerIdFromUrl) {
      setSelectedCustomerId(customerIdFromUrl);
    }
  }, [customerIdFromUrl]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const promptTemplate = useMemo(() => {
    return templates.find((p) => p.type === type)?.content;
  }, [templates, type]);

  const handleSendMessage = async (promptOverride?: any) => {
    // Sicherstellen, dass prompt ein String ist
    const prompt = typeof promptOverride === 'string' ? promptOverride : chatInput;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) return;

    // Den ursprünglichen System-Prompt finden
    const systemPrompt = templates.find(t => t.type === type)?.content;
    if (!systemPrompt) {
      toast.error("Fehler", { description: "Konnte die ursprüngliche Prompt-Vorlage nicht finden." });
      return;
    }

    const userMessage: Message = { role: "user", content: prompt };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setLoadingAI(true);
    setChatInput("");

    // Die letzte response_id aus dem State holen
    const lastResponseId = responseId;

    // Die Funktion mit dem Kontext aufrufen
    generateUseCase(prompt, systemPrompt, lastResponseId);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const generateUseCase = async (userInput: string, systemPrompt: string, previous_response_id?: string) => {
    // Beim ersten Aufruf (keine previous_response_id) wird der Lade-Spinner für die ganze Seite angezeigt.
    // Bei Folgeaufrufen im Chat wird nur der kleine Spinner in der Chat-Komponente aktiv.
    if (!previous_response_id) {
      setLoadingAI(true);
      setError(null);
      setAiResponseJson(null);
      setRawResponse(null);
      setResponseId(null);
    } else {
      setLoadingAI(true); // Auch im Chat den Ladezustand aktivieren
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('generate-use-case', {
        body: {
          prompt: systemPrompt,
          userInput: userInput,
          previous_response_id: previous_response_id,
          use_case_type: type,
          metadata: {
            industry: selectedCustomer?.industry,
            ...selectedCustomer?.additional_info,
          },
        },
      });

      if (invokeError) throw invokeError;

      console.log("Received data from function:", data);

      // Den Inhalt für die Sprechblase dynamisch bestimmen
      let assistantContent = "Hier ist der aktualisierte Use Case. Bitte prüfen Sie die Details in der Vorschau.";
      if (data.chat_response && data.chat_response.info_block) {
        assistantContent = data.chat_response.info_block;
      }

      const assistantMessage: Message = { role: "assistant", content: assistantContent, useCase: data };
      setMessages((prev) => [...prev, assistantMessage]);
      
      setAiResponseJson(data);
      setRawResponse(JSON.stringify(data, null, 2));
      setResponseId(data.response_id || null);

    } catch (e: any) {
      console.error("Error generating use case:", e);
      const errorMessage = e.message || "Ein unbekannter Fehler ist aufgetreten.";
      setError(errorMessage);
      const errorAssistantMessage: Message = { role: "assistant", content: `Es ist ein Fehler aufgetreten: ${errorMessage}` };
      setMessages((prev) => [...prev, errorAssistantMessage]);
      toast.error("Fehler bei der Generierung", {
        description: errorMessage,
      });
    } finally {
      setLoadingAI(false);
    }
  };

  const proceedWithSave = async () => {
    setShowSaveConfirm(false);
    if (!aiResponseJson) {
      toast.error("Fehler", {
        description: "Keine Use-Case-Daten zum Speichern vorhanden."
      });
      return;
    }

    const dataToSave = {
      ...aiResponseJson,
      type: type,
      customer_id: selectedCustomerId,
      // raw_response entfernt, da die Spalte in der Datenbank nicht existiert
      response_id: responseId,
      process_map: aiResponseJson.process_map as any,
    };

    // Use Case speichern
    const { data, error } = await supabase.from("use_cases").insert([dataToSave]).select();

    if (error) {
      console.error("Error saving use case:", error);
      toast.error("Fehler beim Speichern", {
        description: error.message
      });
    } else {
      // Erfolgreich gespeichert, jetzt Embedding erstellen
      const useCaseId = data[0]?.id;
      
      if (useCaseId) {
        try {
          // Embedding erstellen
          const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embeddings', {
            body: JSON.stringify({ useCaseIds: [useCaseId] })
          });
          
          if (embeddingError) {
            console.error("Error creating embedding:", embeddingError);
            toast.success("Use Case gespeichert", {
              description: "Use Case wurde gespeichert, aber das Embedding konnte nicht erstellt werden."
            });
          } else {
            toast.success("Use Case gespeichert", {
              description: "Use Case wurde gespeichert und Embedding erfolgreich erstellt."
            });
          }
        } catch (embeddingError) {
          console.error("Error creating embedding:", embeddingError);
          toast.success("Use Case gespeichert", {
            description: "Use Case wurde gespeichert, aber das Embedding konnte nicht erstellt werden."
          });
        }
      } else {
        toast.success("Use Case gespeichert", {
          description: "Use Case wurde gespeichert, aber die ID konnte nicht ermittelt werden für das Embedding."
        });
      }
      
      navigate("/admin/use-cases");
    }
  };

  const handleSave = () => {
    if (!aiResponseJson) {
      toast.error("Fehler", {
        description: "Keine Use-Case-Daten zum Speichern vorhanden."
      });
      return;
    }
    setShowSaveConfirm(true);
  };

  const handleStartChat = () => {
    if (selectedCustomerId && type && topicInput.trim() && templates.find((p) => p.type === type)) {
      // Wechsle zur Chat-Ansicht und starte die Use-Case-Generierung
      setStep(Step.CHAT);
      
      // Wir senden den User-Input (topicInput) als tatsächliche Benutzeranfrage
      // und nicht mehr das Template als User-Input
      const userMessage: Message = { role: "user", content: topicInput };
      setMessages([userMessage]);
      
      setLoadingAI(true);
      setError(null);
      setAiResponseJson(null);
      setRawResponse(null);
      setResponseId(null);
      
      // API-Anfrage mit korrektem System-Prompt und User-Input
      if (promptTemplate) {
        generateUseCase(topicInput, promptTemplate);
      }
    } else {
      toast.error("Fehlende Informationen", {
        description: "Bitte wählen Sie Kunde und Typ aus und geben Sie ein Thema ein. Stellen Sie sicher, dass eine Prompt-Vorlage existiert."
      });
    }
  };

  if (step === Step.FORM) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-4">Neuen Use Case erstellen</h1>
        <div className="space-y-4 max-w-2xl mx-auto">
          <div>
            <Label htmlFor="customer">Kunde</Label>
            <Select onValueChange={setSelectedCustomerId} value={selectedCustomerId}>
              <SelectTrigger><SelectValue placeholder="Kunde auswählen..." /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.industry ? `(${c.industry})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedCustomer && (
            <div>
              <Label>Branche</Label>
              <p className="text-sm p-2 bg-gray-100 rounded-md">{selectedCustomer.industry || "Keine Branche zugewiesen"}</p>
            </div>
          )}
          <div>
            <Label htmlFor="type">Use Case Typ</Label>
            <Select onValueChange={(v) => setType(v as UseCaseType)} value={type}>
              <SelectTrigger><SelectValue placeholder="Typ auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="forwarding_use_case">Weiterleitung</SelectItem>
                <SelectItem value="direct_use_case">Direktbearbeitung</SelectItem>
                <SelectItem value="knowledge_request">Wissensanfrage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {selectedCustomerId && type && (
            <div className="space-y-2">
              <Label htmlFor="topic">Use Case Thema</Label>
              <div className="text-sm text-muted-foreground mb-2">
                Beschreiben Sie hier detailliert, worum es im Use Case gehen soll. Je mehr Details Sie angeben, 
                desto besser kann der Use Case generiert werden.
              </div>
              <Textarea
                id="topic"
                placeholder="z.B. Automatische Erstellung von Monatsberichten für Kunden mit Zusammenfassung der erledigten Aufgaben..."
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  // Wenn Enter gedrückt wird (ohne Shift) und der Button nicht deaktiviert ist
                  if (e.key === 'Enter' && !e.shiftKey && 
                      selectedCustomerId && type && topicInput.trim() && !isLoadingCustomers && !isLoadingPrompts) {
                    e.preventDefault(); // Verhindert den Zeilenumbruch
                    handleStartChat();
                  }
                }}
                rows={5}
                className="resize-none"
              />
            </div>
          )}
          
          <Button 
            onClick={handleStartChat} 
            disabled={!selectedCustomerId || !type || !topicInput.trim() || isLoadingCustomers || isLoadingPrompts}
          >
            {loadingAI || isLoadingCustomers || isLoadingPrompts ? "Lade..." : "Use Case generieren"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <UseCaseChatAndPreview
        messages={messages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        onSendMessage={handleSendMessage}
        loadingAI={loadingAI}
        error={error}
        rawResponse={rawResponse}
        aiResponseJson={aiResponseJson}
        onSave={handleSave}
        onBack={() => setStep(Step.FORM)}
        handleKeyDown={handleKeyDown}
        textareaRef={textareaRef}
      />

      {/* Loading-Modal während der Generierung */}
      <Dialog open={loadingAI && !aiResponseJson} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Use Case wird generiert</DialogTitle>
            <DialogDescription>
              Bitte warten Sie, während der Use Case generiert wird. Dies kann einige Sekunden dauern.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center py-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">KI generiert den Use Case...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Bestätigungsdialog zum Speichern */}
      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bestätigung</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diesen Use Case wirklich speichern?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={proceedWithSave}>Speichern</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreateUseCasePage;