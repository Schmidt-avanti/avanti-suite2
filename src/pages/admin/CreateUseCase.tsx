
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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

const useCaseTypes = [
  { value: "information", label: "Information" },
  { value: "forwarding", label: "Weiterleitung" },
  { value: "processing", label: "Bearbeitung" },
];

export default function CreateUseCasePage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [customerId, setCustomerId] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [chatInput, setChatInput] = useState<string>("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiResponseJson, setAiResponseJson] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const { data: prompts = [] } = useQuery({ queryKey: ["prompt_templates"], queryFn: fetchPrompts });
  const { toast } = useToast();

  const prompt = prompts?.find((p: PromptTemplate) => p.type === type)?.content;

  const navigate = useNavigate();

  async function sendChatToAI() {
    if (!prompt || !chatInput) return;

    setError(null);
    setLoadingAI(true);
    setMessages((prev) => [...prev, { role: "user", content: chatInput }]);
    
    try {
      console.log("Sending request to Edge Function with:", {
        prompt: prompt ? "Prompt template loaded" : "No prompt template",
        metadata: customers.find((c: Customer) => c.id === customerId),
        userInput: chatInput,
        type,
      });
      
      const res = await supabase.functions.invoke("generate-use-case", {
        body: {
          prompt,
          metadata: customers.find((c: Customer) => c.id === customerId),
          userInput: chatInput,
          type,
        },
      });
      
      console.log("Response from Edge Function:", res);
      
      if (res.error) {
        console.error("Edge function error:", res.error);
        setError(`Fehler: ${res.error.message || "Unbekannter Fehler beim Generieren des Use Cases"}`);
        setMessages((prev) => [...prev, { 
          role: "assistant", 
          content: `Es trat ein Fehler auf: ${res.error.message || "Unbekannter Fehler"}` 
        }]);
        toast({
          variant: "destructive",
          title: "Fehler bei der KI-Anfrage",
          description: res.error.message || "Es gab einen Fehler bei der Verarbeitung.",
        });
        setLoadingAI(false);
        return;
      }
      
      console.log("AI Response data:", res.data);
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: res.data?.chat_response?.info_block || JSON.stringify(res.data, null, 2) 
      }]);
      setAiResponseJson(res.data);
      setStep(3);
    } catch (err: any) {
      console.error("Chat error:", err);
      setError(`Fehler bei der Verbindung: ${err.message}`);
      setMessages((prev) => [...prev, { role: "assistant", content: `Fehler: ${err.message}` }]);
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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow">
      <h2 className="text-xl font-bold mb-6">Neuen Use Case anlegen</h2>

      {/* Step 1: Basisinfos */}
      {step === 1 && (
        <>
          <div className="mb-4">
            <label className="block mb-1 font-medium">Kunde</label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="w-full">{
                  customers.find((c:Customer) => c.id === customerId)?.name || "Bitte auswählen"
              }</SelectTrigger>
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
            <Select value={type} onValueChange={setType}>
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
            className="mt-2"
            onClick={() => setStep(2)}
          >
            Weiter
          </Button>
        </>
      )}

      {/* Step 2: Chat */}
      {step === 2 && (
        <>
          <div className="mb-4">
            <label className="block mb-2 font-medium">Beschreibe den Use Case (Stichworte oder Sätze)</label>
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              rows={4}
              placeholder="Beschreibe das Anliegen…"
            />
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button
            disabled={!chatInput || loadingAI}
            onClick={sendChatToAI}
            className="mb-4"
          >
            {loadingAI ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Analysiere...
              </>
            ) : (
              "Absenden & analysieren"
            )}
          </Button>
          
          <div className="mt-6 space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className={`p-3 rounded-lg text-sm ${msg.role === "assistant" ? "bg-primary/10" : "bg-gray-100"}`}>
                <b>{msg.role === "user" ? "Du:" : "Ava:"}</b> {msg.content}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Step 3: Ergebnis und Speichern */}
      {step === 3 && aiResponseJson && (
        <>
          <div className="mb-4">
            <h4 className="font-semibold">Vorschau / Felder aus GPT</h4>
            <pre className="bg-gray-100 rounded-md p-2 text-xs overflow-x-auto max-h-[400px] overflow-y-auto">{JSON.stringify(aiResponseJson, null, 2)}</pre>
          </div>
          <Button className="mr-2" onClick={handleSave}>Speichern</Button>
          <Button variant="outline" onClick={() => setStep(2)}>Zurück</Button>
        </>
      )}
    </div>
  );
}
