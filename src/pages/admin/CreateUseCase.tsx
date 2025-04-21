
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { UseCaseType } from "@/types/use-case";
import CreateUseCaseForm from "@/components/use-cases/CreateUseCaseForm";
import UseCaseChatAndPreview from "@/components/use-cases/UseCaseChatAndPreview";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Customer = {
  id: string;
  name: string;
  industry: string | null;
  tools?: {
    task_management: string | null;
    knowledge_base: string | null;
    crm: string | null;
  };
};

type PromptTemplate = {
  id: string;
  type: string;
  content: string;
};

// The different steps in the creation process
enum Step {
  FORM = 1,
  CHAT = 2,
  REVIEW = 3
}

// Fetch all customers with their tools
const fetchCustomers = async () => {
  console.log("Fetching customers data...");
  
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name, industry")
    .order("name");

  if (customersError) {
    console.error("Error fetching customers:", customersError);
    throw customersError;
  }

  const { data: tools, error: toolsError } = await supabase
    .from("customer_tools")
    .select("customer_id, task_management, knowledge_base, crm");

  if (toolsError) {
    console.error("Error fetching customer tools:", toolsError);
    throw toolsError;
  }

  // Combine customers with their tools
  const customersWithTools = customers.map((customer) => {
    const customerTools = tools.find((t) => t.customer_id === customer.id);
    return {
      ...customer,
      tools: customerTools
        ? {
            task_management: customerTools.task_management,
            knowledge_base: customerTools.knowledge_base,
            crm: customerTools.crm,
          }
        : undefined,
    };
  });
  
  console.log(`Found ${customersWithTools.length} customers with tools`);
  return customersWithTools;
};

// Fetch active prompt templates
const fetchPrompts = async () => {
  console.log("Fetching prompt templates...");
  
  const { data, error } = await supabase
    .from("prompt_templates")
    .select("id, type, content")
    .eq("is_active", true);
    
  if (error) {
    console.error("Error fetching prompt templates:", error);
    throw error;
  }
  
  console.log(`Found ${data.length} active prompt templates`);
  return data;
};

export default function CreateUseCasePage() {
  // Current step in the creation process
  const [step, setStep] = useState<Step>(Step.FORM);
  
  // Form data
  const [customerId, setCustomerId] = useState<string>("");
  const [type, setType] = useState<UseCaseType | "">("");
  
  // Chat state
  const [chatInput, setChatInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  
  // AI response and loading state
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiResponseJson, setAiResponseJson] = useState<any>(null);
  
  // Error handling
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  // Data fetching with React Query
  const { 
    data: customers = [], 
    isLoading: isLoadingCustomers,
    error: customersError 
  } = useQuery({ 
    queryKey: ["customers"], 
    queryFn: fetchCustomers 
  });
  
  const { 
    data: prompts = [], 
    isLoading: isLoadingPrompts,
    error: promptsError 
  } = useQuery({ 
    queryKey: ["prompt_templates"], 
    queryFn: fetchPrompts 
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Find the prompt template for the selected type
  const promptTemplate = prompts?.find((p: PromptTemplate) => p.type === type)?.content;

  // Handle initial validation issues
  React.useEffect(() => {
    if (customersError) {
      toast({
        variant: "destructive",
        title: "Fehler beim Laden der Kunden",
        description: (customersError as Error).message,
      });
    }
    
    if (promptsError) {
      toast({
        variant: "destructive",
        title: "Fehler beim Laden der Prompt-Vorlagen",
        description: (promptsError as Error).message,
      });
    }
  }, [customersError, promptsError, toast]);

  // Send chat message to AI
  async function sendChatToAI() {
    if (!promptTemplate || !customerId || !chatInput.trim()) {
      toast({
        variant: "destructive",
        title: "Eingabe unvollständig",
        description: "Bitte füllen Sie alle erforderlichen Felder aus.",
      });
      return;
    }

    // Reset error states
    setError(null);
    setRawResponse(null);
    setLoadingAI(true);
    
    // Add user message to chat
    const newMessage = { role: "user" as const, content: chatInput };
    setMessages(prev => [...prev, newMessage]);
    
    try {
      // Find the selected customer with tools
      const selectedCustomer = customers.find((c: Customer) => c.id === customerId);
      
      if (!selectedCustomer) {
        throw new Error("Kunde nicht gefunden");
      }
      
      console.log("Sending request to edge function with customer:", selectedCustomer.name);
      
      // Call the edge function with payload
      const res = await supabase.functions.invoke("generate-use-case", {
        body: {
          prompt: promptTemplate,
          metadata: selectedCustomer,
          userInput: chatInput,
          type,
          debug: true // Enable debug mode for troubleshooting
        },
      });
      
      console.log("Edge function response:", res);
      
      // Handle errors from the edge function
      if (res.error) {
        console.error("Edge function error:", res.error);
        setError(`Fehler: ${res.error.message || "Unbekannter Fehler"}`);
        
        // If we have raw response data from a validation error, show it
        if (res.data && typeof res.data === 'object') {
          if (res.data.raw_content) {
            setRawResponse(JSON.stringify(res.data.raw_content, null, 2));
          } else if (res.data.details) {
            setRawResponse(JSON.stringify(res.data.details, null, 2));
          }
        }
        
        toast({
          variant: "destructive",
          title: "Fehler bei der KI-Anfrage",
          description: res.error.message || "Es gab einen Fehler bei der Verarbeitung.",
        });
        setLoadingAI(false);
        return;
      }

      // Handle successful response
      if (res.data) {
        console.log("Received valid response from edge function");
        
        // Add AI response to chat
        if (res.data.chat_response?.info_block) {
          setMessages((prev) => [...prev, { 
            role: "assistant", 
            content: res.data.chat_response.info_block 
          }]);
        }
        
        // Add follow-up question if available
        if (res.data.next_question) {
          setMessages((prev) => [...prev, { 
            role: "assistant", 
            content: res.data.next_question 
          }]);
        }

        // Save the full response for the preview
        setAiResponseJson(res.data);
        setChatInput("");
        
        // If this is the first response, move to review step
        if (messages.length === 0) {
          setStep(Step.REVIEW);
        }
      } else {
        setError("Keine Daten in der Antwort erhalten");
        toast({
          variant: "destructive",
          title: "Leere Antwort",
          description: "Die Anfrage war erfolgreich, aber es wurden keine Daten zurückgegeben.",
        });
      }
    } catch (err: any) {
      console.error("Request error:", err);
      setError(`Fehler bei der Anfrage: ${err.message}`);
      toast({
        variant: "destructive",
        title: "Verbindungsfehler",
        description: err.message,
      });
    } finally {
      setLoadingAI(false);
    }
  }

  // Save the use case to the database
  async function handleSave() {
    if (!aiResponseJson || !customerId) {
      toast({
        variant: "destructive",
        title: "Unvollständige Daten",
        description: "Der Use Case kann nicht gespeichert werden.",
      });
      return;
    }
    
    try {
      console.log("Saving use case to database...");
      
      // Extrahieren und vorbereiten der Daten
      const { 
        type: responseType, 
        title, 
        information_needed, 
        steps, 
        typical_activities, 
        expected_result, 
        chat_response, 
        next_question, 
        process_map, 
        decision_logic 
      } = aiResponseJson;

      // Hier ist die wichtige Änderung: Wir stellen sicher, dass der Typ
      // exakt dem entspricht, was die Datenbank erwartet
      const { error } = await supabase.from("use_cases").insert([
        {
          type: responseType,  // Verwende direkt den Wert aus der API-Antwort
          customer_id: customerId,
          title,
          information_needed,
          steps,
          typical_activities,
          expected_result,
          chat_response,
          next_question,
          process_map,
          decision_logic,
          is_active: true,
        },
      ]);
      
      if (error) {
        console.error("Error saving use case:", error);
        toast({
          variant: "destructive",
          title: "Fehler beim Speichern",
          description: error.message,
        });
        return;
      }
      
      toast({
        title: "Use Case gespeichert",
        description: "Der Use Case wurde erfolgreich gespeichert.",
      });
      navigate("/admin/use-cases");
    } catch (err: any) {
      console.error("Save error:", err);
      toast({
        variant: "destructive",
        title: "Fehler beim Speichern",
        description: err.message,
      });
    }
  }

  // Main component render
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-6">Neuen Use Case anlegen</h2>

      {step === Step.FORM && (
        <CreateUseCaseForm
          customers={customers}
          customerId={customerId}
          setCustomerId={setCustomerId}
          type={type}
          setType={setType}
          onNext={() => setStep(Step.CHAT)}
          isLoading={isLoadingCustomers || isLoadingPrompts}
        />
      )}

      {(step === Step.CHAT || step === Step.REVIEW) && (
        <UseCaseChatAndPreview
          messages={messages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          onSendMessage={sendChatToAI}
          loadingAI={loadingAI}
          error={error}
          rawResponse={rawResponse}
          aiResponseJson={aiResponseJson}
          onSave={handleSave}
          onBack={() => setStep(Step.FORM)}
        />
      )}
    </div>
  );
}
