import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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

  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const { data: prompts = [] } = useQuery({ queryKey: ["prompt_templates"], queryFn: fetchPrompts });

  const prompt = prompts?.find((p: PromptTemplate) => p.type === type)?.content;

  const navigate = useNavigate();

  async function sendChatToAI() {
    if (!prompt || !chatInput) return;

    setLoadingAI(true);
    setMessages((prev) => [...prev, { role: "user", content: chatInput }]);
    try {
      const res = await fetch("https://knoevkvjyuchhcmzsdpq.supabase.co/functions/v1/generate-use-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          metadata: customers.find((c: Customer) => c.id === customerId),
          userInput: chatInput,
          type,
        }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.chat_response?.info_block || JSON.stringify(data, null, 2) }]);
      setAiResponseJson(data);
      setStep(3);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Fehler: ${err.message}` }]);
    }
    setLoadingAI(false);
  }

  async function handleSave() {
    if (!aiResponseJson || !customerId) return;
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
      alert("Fehler beim Speichern: " + error.message);
      return;
    }
    navigate("/admin/use-cases");
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
          <Button
            disabled={!chatInput || loadingAI}
            onClick={sendChatToAI}
          >
            {loadingAI ? "Analyisiere..." : "Absenden & analysieren"}
          </Button>
          <div className="mt-6 space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className={`p-2 rounded-md text-sm ${msg.role === "assistant" ? "bg-primary/10" : "bg-gray-100"}`}>
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
            <pre className="bg-gray-100 rounded-md p-2 text-xs overflow-x-auto">{JSON.stringify(aiResponseJson, null, 2)}</pre>
          </div>
          <Button className="mr-2" onClick={handleSave}>Speichern</Button>
          <Button variant="outline" onClick={() => setStep(2)}>Zurück</Button>
        </>
      )}
    </div>
  );
}
