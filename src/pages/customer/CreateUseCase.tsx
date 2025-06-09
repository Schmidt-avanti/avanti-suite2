import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { USE_CASE_TYPES, useCaseTypeLabels, UseCaseType } from "@/types/use-case";
import UseCaseChatAndPreview from "@/components/use-cases/UseCaseChatAndPreview";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type CustomerData = {
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

enum Step {
  FORM = 1,
  CHAT = 2,
  REVIEW = 3
}

const fetchCustomerData = async (userId: string) => {
  console.log("Fetching customer data for user:", userId);
  
  // First get the customer_ids the user is assigned to
  const { data: assignments, error: assignmentError } = await supabase
    .from('user_customer_assignments')
    .select('customer_id')
    .eq('user_id', userId);

  if (assignmentError) {
    console.error("Error fetching customer assignments:", assignmentError);
    throw assignmentError;
  }
  
  if (!assignments || assignments.length === 0) {
    throw new Error("Benutzer ist keinem Kunden zugeordnet");
  }
  
  const customerIds = assignments.map(a => a.customer_id);
  
  // Then get details of the first customer (assuming a customer user is only assigned to one customer)
  const customerId = customerIds[0];
  
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id, name, industry")
    .eq("id", customerId)
    .single();

  if (customerError) {
    console.error("Error fetching customer details:", customerError);
    throw customerError;
  }

  // Get customer tools
  const { data: tools, error: toolsError } = await supabase
    .from("customer_tools")
    .select("task_management, knowledge_base, crm")
    .eq("customer_id", customerId)
    .single();

  if (toolsError && toolsError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
    console.error("Error fetching customer tools:", toolsError);
    throw toolsError;
  }

  const customerWithTools: CustomerData = {
    ...customer,
    tools: tools ? {
      task_management: tools.task_management,
      knowledge_base: tools.knowledge_base,
      crm: tools.crm,
    } : undefined,
  };
  
  console.log("Found customer data:", customerWithTools);
  return customerWithTools;
};

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

const useCaseTypes = Object.entries(useCaseTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

const CustomerCreateUseCaseForm = ({ 
  type, 
  setType, 
  onNext, 
  isLoading,
  customerName 
}: { 
  type: UseCaseType | "", 
  setType: (type: UseCaseType | "") => void, 
  onNext: () => void, 
  isLoading: boolean,
  customerName: string
}) => {
  const handleTypeChange = (value: string) => {
    if (value === "" || Object.values(USE_CASE_TYPES).includes(value as UseCaseType)) {
      setType(value as UseCaseType | "");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Use Case erstellen für {customerName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block mb-2 font-medium">Use Case Typ *</label>
            <Select value={type} onValueChange={handleTypeChange} disabled={isLoading}>
              <SelectTrigger className="w-full">
                {isLoading ? (
                  <span className="flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird geladen...
                  </span>
                ) : (
                  useCaseTypes.find((t) => t.value === type)?.label || "Bitte auswählen"
                )}
              </SelectTrigger>
              <SelectContent>
                {useCaseTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type && (
            <div className="p-4 bg-muted rounded-xl text-sm">
              <h3 className="font-medium mb-2">Use Case Beschreibung</h3>
              <p>
                {type === USE_CASE_TYPES.KNOWLEDGE_REQUEST && (
                  "Eine reine Informationsanfrage, die mit Wissen aus der Wissensdatenbank beantwortet wird."
                )}
                {type === USE_CASE_TYPES.FORWARDING && (
                  "Ein Anliegen, das an einen Spezialisten weitergeleitet werden muss."
                )}
                {type === USE_CASE_TYPES.DIRECT && (
                  "Ein Anliegen, das direkt bearbeitet werden kann, z.B. durch Anlegen einer Aufgabe."
                )}
                {type === USE_CASE_TYPES.KNOWLEDGE_ARTICLE && (
                  "Ein Wissensartikel zur Dokumentation wichtiger Informationen."
                )}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          onClick={onNext}
          disabled={!type || isLoading}
          className="mt-4"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wird geladen...
            </>
          ) : (
            "Weiter"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

const CustomerCreateUseCasePage = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(Step.FORM);
  const [type, setType] = useState<UseCaseType | "">("");
  
  const [chatInput, setChatInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiResponseJson, setAiResponseJson] = useState<any>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  const { 
    data: customerData, 
    isLoading: isLoadingCustomer,
    error: customerError
  } = useQuery({ 
    queryKey: ["customer-data", user?.id], 
    queryFn: () => fetchCustomerData(user?.id || ""),
    enabled: !!user?.id
  });
  
  const { 
    data: prompts = [], 
    isLoading: isLoadingPrompts,
    error: promptsError 
  } = useQuery({ 
    queryKey: ["prompt_templates"], 
    queryFn: fetchPrompts 
  });

  const customerId = customerData?.id;
  const customerName = customerData?.name || "";
  
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Make sure we can find a matching prompt template, with fallback for type mismatch
  const matchingPrompt = prompts?.find((p: PromptTemplate) => p.type === type);
  const promptTemplate = matchingPrompt?.content;
  
  // Log for debugging
  useEffect(() => {
    if (type && !matchingPrompt && prompts?.length > 0) {
      console.warn(`No prompt template found for type: ${type}. Available types:`, 
        prompts.map(p => p.type));
    }
  }, [type, matchingPrompt, prompts]);

  useEffect(() => {
    if (customerError) {
      toast({
        variant: "destructive",
        title: "Fehler beim Laden der Kundendaten",
        description: (customerError as Error).message,
      });
    }
    
    if (promptsError) {
      toast({
        variant: "destructive",
        title: "Fehler beim Laden der Prompt-Vorlagen",
        description: (promptsError as Error).message,
      });
    }
  }, [customerError, promptsError, toast]);

  async function sendChatToAI() {
    // Validate inputs with specific error messages
    if (!type) {
      toast({
        variant: "destructive",
        title: "Kein Use Case Typ ausgewählt",
        description: "Bitte wählen Sie einen Use Case Typ aus.",
      });
      return;
    }
    
    if (!customerId) {
      toast({
        variant: "destructive",
        title: "Kein Kunde gefunden",
        description: "Ihr Benutzerkonto ist keinem Kunden zugeordnet.",
      });
      return;
    }
    
    if (!chatInput.trim()) {
      toast({
        variant: "destructive",
        title: "Keine Beschreibung",
        description: "Bitte geben Sie eine Beschreibung für den Use Case ein.",
      });
      return;
    }
    
    // Special check for missing prompt template
    if (!promptTemplate) {
      console.error(`No prompt template found for type: ${type}`);
      toast({
        variant: "destructive",
        title: "Technisches Problem",
        description: "Für diesen Use Case Typ wurde keine Vorlage gefunden. Bitte wählen Sie einen anderen Typ oder kontaktieren Sie den Support.",
      });
      return;
    }

    setError(null);
    setRawResponse(null);
    setLoadingAI(true);
    
    const newMessage = { role: "user" as const, content: chatInput };
    setMessages(prev => [...prev, newMessage]);
    
    try {
      if (!customerData) {
        throw new Error("Kundendaten nicht gefunden");
      }
      
      console.log("Sending request to edge function for customer:", customerData.name);
      
      const res = await supabase.functions.invoke("generate-use-case", {
        body: {
          prompt: promptTemplate,
          metadata: customerData,
          userInput: chatInput,
          type,
          debug: true
        },
      });
      
      console.log("Edge function response:", res);
      
      if (res.error) {
        console.error("Edge function error:", res.error);
        setError(`Fehler: ${res.error.message || "Unbekannter Fehler"}`);
        
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

      if (res.data) {
        console.log("Received valid response from edge function");
        
        if (res.data.chat_response?.info_block) {
          setMessages((prev) => [...prev, { 
            role: "assistant", 
            content: res.data.chat_response.info_block 
          }]);
        }
        
        if (res.data.next_question) {
          setMessages((prev) => [...prev, { 
            role: "assistant", 
            content: res.data.next_question 
          }]);
        }

        setAiResponseJson(res.data);
        setChatInput("");
        
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
      
      const { 
        type, 
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

      const { error } = await supabase.from("use_cases").insert([
        {
          type,
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
          created_by: user?.id,
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
      navigate("/client/use-cases");
    } catch (err: any) {
      console.error("Save error:", err);
      toast({
        variant: "destructive",
        title: "Fehler beim Speichern",
        description: err.message,
      });
    }
  }

  const isLoading = isLoadingCustomer || isLoadingPrompts;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-6">Neuen Use Case anlegen</h2>

      {step === Step.FORM && (
        <CustomerCreateUseCaseForm
          type={type}
          setType={setType}
          onNext={() => setStep(Step.CHAT)}
          isLoading={isLoading}
          customerName={customerName}
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
};

export default CustomerCreateUseCasePage;
