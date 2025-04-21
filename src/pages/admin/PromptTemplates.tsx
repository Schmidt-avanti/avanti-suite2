
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";

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

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    type: "",
    content: "",
  });

  // Vorhandene Vorlage für Bearbeitung laden
  React.useEffect(() => {
    if (!templateId) {
      setNewTemplate({ name: "", type: "", content: "" });
      return;
    }
    const t = data.find((tpl: any) => tpl.id === templateId);
    if (t) setNewTemplate({ name: t.name, type: t.type, content: t.content });
  }, [templateId, data]);

  const { mutateAsync, status } = useMutation({
    mutationFn: async (template: typeof newTemplate) => {
      if (templateId) {
        // Update
        const { error } = await supabase
          .from("prompt_templates")
          .update({ name: template.name, type: template.type, content: template.content })
          .eq("id", templateId);
        if (error) throw error;
      } else {
        // Create neu
        const { error } = await supabase.from("prompt_templates").insert([template]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt_templates"] });
      setNewTemplate({ name: "", type: "", content: "" });
      setTemplateId(null);
    },
  });

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h2 className="text-2xl font-semibold mb-6">Prompt-Templates verwalten</h2>
      <div className="mb-8">
        <h3 className="font-semibold mb-2">{templateId ? "Prompt-Template bearbeiten" : "Neues Prompt-Template"}</h3>
        <div className="mb-2">
          <Input
            placeholder="Name"
            value={newTemplate.name}
            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
          />
        </div>
        <div className="mb-2">
          <Select value={newTemplate.type} onValueChange={val => setNewTemplate({ ...newTemplate, type: val })}>
            <SelectTrigger className="w-full">
              {useCaseTypes.find(t => t.value === newTemplate.type)?.label || "Typ wählen"}
            </SelectTrigger>
            <SelectContent>
              {useCaseTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          disabled={!newTemplate.name || !newTemplate.type || !newTemplate.content || status === "pending"}
          onClick={() => mutateAsync(newTemplate)}
        >
          {status === "pending" ? "Speichern..." : (templateId ? "Änderungen speichern" : "Neues Prompt speichern")}
        </Button>
        {templateId && (
          <Button
            variant="outline"
            className="ml-2"
            onClick={() => { setTemplateId(null); setNewTemplate({ name: "", type: "", content: "" }); }}
          >
            Abbrechen
          </Button>
        )}
      </div>
      <div>
        <h3 className="font-semibold mb-2">Existierende Templates</h3>
        <table className="w-full border rounded">
          <thead>
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Typ</th>
              <th className="text-left p-2">Prompt</th>
              <th className="text-left p-2"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any) => (
              <tr key={row.id}>
                <td className="p-2">{row.name}</td>
                <td className="p-2">{useCaseTypes.find(t => t.value === row.type)?.label || row.type}</td>
                <td className="p-2 text-xs">{row.content?.slice(0, 100)}{row.content?.length > 100 && "…"}</td>
                <td className="p-2">
                  <Button size="sm" variant="secondary" onClick={() => setTemplateId(row.id)}>
                    Bearbeiten
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
