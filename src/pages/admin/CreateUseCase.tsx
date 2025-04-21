import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import UseCaseChat from "@/components/use-cases/UseCaseChat";
import UseCasePreview from "@/components/use-cases/UseCasePreview";
import { USE_CASE_TYPES, useCaseTypeLabels, type UseCaseType } from "@/types/use-case";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type PromptTemplate = {
  id: string;
  type: string;
  content: string;
};

type Customer = {
  id: string;
  name: string;
  industry: string | null;
};

const fetchCustomers = async () => {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, industry")
    .order("name");
  if (error) throw error;
  return data;
};

const fetchPrompts = async () => {
  const { data, error } = await supabase
    .from("prompt_templates")
    .select("id, type, content")
    .eq("is_active", true);
  if (error) throw error;
  return data;
};

const useCaseTypes = Object.entries(useCaseTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

export default function CreateUseCasePage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [customerId, setCustomerId] = useState<string>("");
  const [type, setType] = useState<UseCaseType | "">("");
  const [chatInput, setChatInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiResponseJson, setAiResponseJson] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const { data: prompts = [] } = useQuery({ queryKey: ["prompt_templates"], queryFn: fetchPrompts });
  const { toast } = useToast();
  const navigate = useNavigate();
  const prompt = prompts?.find((p: PromptTemplate) => p.type === type)?.content;

  async function sendChatToAI() {
    if (!prompt || !chatInput) return;

    setError(null);
    setLoadingAI(true);
    setRawResponse(null);
    setMessages((prev) => [...prev, { role: "user", content: chatInput }]);
    
    try {
      const selectedCustomer = customers.find((c: Customer) => c.id === customerId);
      console.log("Selected customer data:", selectedCustomer);
      console.log("Selected use case type:", type);
      
      const res = await supabase.functions.invoke("generate-use-case", {
        body: {
          prompt,
          metadata: selectedCustomer,
          userInput: chatInput,
          type,
        },
      });
      
      console.log("Edge function response:", res);
      
      if (res.error) {
        console.error("Edge function error:", res.error);
        setError(`Fehler: ${res.error.message || "Unbekannter Fehler beim Generieren des Use Cases"}`);
        
        if (res.error.message && res.error.message.includes("Validation") && res.data?.raw_content) {
          setRawResponse(JSON.stringify(res.data.raw_content, null, 2));
          console.log("Raw invalid content:", res.data.raw_content);
        }
        
        toast({
          variant: "destructive",
          title: "Fehler bei der KI-Anfrage",
          description: res.error.message || "Es gab einen Fehler bei der Verarbeitung.",
        });
        setLoadingAI(false);
        return;
      }

      if (res.data?.chat_response?.info_block) {
        setMessages((prev) => [...prev, { 
          role: "assistant", 
          content: res.data.chat_response.info_block 
        }]);
      }
      
      if (res.data?.next_question) {
        setMessages((prev) => [...prev, { 
          role: "assistant", 
          content: res.data.next_question 
        }]);
      }

      setAiResponseJson(res.data);
      setChatInput("");
      
      if (!messages.length) {
        setStep(3);
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setError(`Fehler bei der Verbindung: ${err.message}`);
      toast({
        variant: "destructive",
        title: "Verbindungsfehler",
        description: err.message,
      });
    }
    setLoadingAI(false);
  }

  async function handleSave() {
    if (!aiResponseJson || !customerId) return;
    
    try {
      const { type, title, information_needed, steps, typical_activities, expected_result, chat_response,
        next_question, process_map, decision_logic } = aiResponseJson;

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
        },
      ]);
      
      if (error) {
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
      toast({
        variant: "destructive",
        title: "Fehler beim Speichern",
        description: err.message,
      });
    }
  }

  const handleTypeChange = (value: string) => {
    if (value === "" || Object.values(USE_CASE_TYPES).includes(value as UseCaseType)) {
      setType(value as UseCaseType | "");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-6">Neuen Use Case anlegen</h2>

      {step === 1 && (
        <div className="max-w-2xl">
          <div className="mb-4">
            <label className="block mb-1 font-medium">Kunde</label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="w-full">
                {customers.find((c: Customer) => c.id === customerId)?.name || "Bitte auswählen"}
              </SelectTrigger>
              <SelectContent>
                {customers?.map((c: Customer) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-medium">Typ</label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-full">
                {useCaseTypes.find(t => t.value === type)?.label || "Bitte auswählen"}
              </SelectTrigger>
              <SelectContent>
                {useCaseTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            disabled={!customerId || !type}
            onClick={() => setStep(2)}
          >
            Weiter
          </Button>
        </div>
      )}

      {(step === 2 || step === 3) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <UseCaseChat 
              messages={messages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              onSendMessage={sendChatToAI}
              loading={loadingAI}
            />
            
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {rawResponse && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Ungeparste Antwort der API:</h3>
                <pre className="bg-slate-100 p-3 rounded text-xs overflow-auto max-h-60">{rawResponse}</pre>
              </div>
            )}
          </div>
          
          <div>
            <UseCasePreview aiResponseJson={aiResponseJson} />
            
            {aiResponseJson && (
              <div className="mt-4 flex gap-2">
                <Button onClick={handleSave}>Speichern</Button>
                <Button variant="outline" onClick={() => setStep(2)}>Zurück</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
