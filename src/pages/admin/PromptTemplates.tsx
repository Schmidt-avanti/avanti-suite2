
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const useCaseTypes = [
  { value: "information", label: "Information" },
  { value: "forwarding", label: "Weiterleitung" },
  { value: "processing", label: "Bearbeitung" },
];

export default function PromptTemplatesPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["prompt_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    type: "",
    content: "",
  });

  const addPromptMutation = useMutation({
    mutationFn: async (template: typeof newTemplate) => {
      const { error } = await supabase.from("prompt_templates").insert([template]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt_templates"] });
      setNewTemplate({ name: "", type: "", content: "" });
    },
  });

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h2 className="text-2xl font-semibold mb-6">Prompt-Templates verwalten</h2>
      <div className="mb-8">
        <h3 className="font-semibold mb-2">Neues Prompt-Template</h3>
        <div className="mb-2">
          <Input
            placeholder="Name"
            value={newTemplate.name}
            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
          />
        </div>
        <div className="mb-2">
          <select
            className="border rounded px-2 py-1 w-full"
            value={newTemplate.type}
            onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value })}
          >
            <option value="">Typ wählen</option>
            {useCaseTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-2">
          <Textarea
            placeholder="Prompt-Inhalt"
            value={newTemplate.content}
            onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
            rows={6}
          />
        </div>
        <Button
          disabled={!newTemplate.name || !newTemplate.type || !newTemplate.content || addPromptMutation.isLoading}
          onClick={() => addPromptMutation.mutateAsync(newTemplate)}
        >
          {addPromptMutation.isLoading ? "Speichern..." : "Neues Prompt speichern"}
        </Button>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Existierende Templates</h3>
        <table className="w-full border rounded">
          <thead>
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Typ</th>
              <th className="text-left p-2">Prompt</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any) => (
              <tr key={row.id}>
                <td className="p-2">{row.name}</td>
                <td className="p-2">{row.type}</td>
                <td className="p-2 text-xs">{row.content?.slice(0, 150)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

