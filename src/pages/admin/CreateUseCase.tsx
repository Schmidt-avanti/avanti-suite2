
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
    if (!prompt || !chatInput.trim()) return;

    setError(null);
    setLoadingAI(true);
    setRawResponse(null);
    
    // Erst Nachricht zum lokalen State hinzufügen
    const newMessage = { role: "user" as const, content: chatInput };
    setMessages(prev => [...prev, newMessage]);
    
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-6">Neuen Use Case anlegen</h2>

      {step === 1 && (
        <CreateUseCaseForm
          customers={customers}
          customerId={customerId}
          setCustomerId={setCustomerId}
          type={type}
          setType={setType}
          onNext={() => setStep(2)}
        />
      )}

      {(step === 2 || step === 3) && (
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
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}
