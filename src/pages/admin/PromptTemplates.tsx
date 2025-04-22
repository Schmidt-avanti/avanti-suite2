
import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import { USE_CASE_TYPES, useCaseTypeLabels } from "@/types/use-case";
import { toast } from "sonner";

const useCaseTypesArray = Object.entries(USE_CASE_TYPES).map(([_, value]) => ({
  value,
  label: useCaseTypeLabels[value],
}));

export default function PromptTemplatesPage() {
  const queryClient = useQueryClient();
  
  const { data = [], isLoading } = useQuery({
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

  const usedTypes = data.map((template: any) => template.type);
  
  const availableTypes = useCaseTypesArray.filter(type => !usedTypes.includes(type.value));

  React.useEffect(() => {
    if (!templateId) {
      setNewTemplate({ name: "", type: "", content: "" });
      return;
    }
    const t = data.find((tpl: any) => tpl.id === templateId);
    if (t) setNewTemplate({ name: t.name, type: t.type, content: t.content });
  }, [templateId, data]);

  const handleTypeChange = useCallback((value: string) => {
    setNewTemplate(prev => ({ 
      ...prev, 
      type: value,
      content: value === USE_CASE_TYPES.KNOWLEDGE_ARTICLE 
        ? `Berücksichtige folgenden Kundenkontext:\n{{customer_context}}\n\nErstelle einen Wissensartikel...`
        : prev.content
    }));
  }, []);

  const { mutateAsync, status } = useMutation({
    mutationFn: async (template: typeof newTemplate) => {
      if (!templateId && usedTypes.includes(template.type)) {
        throw new Error("Ein Prompt für diesen Typ existiert bereits");
      }

      if (template.type === USE_CASE_TYPES.KNOWLEDGE_ARTICLE) {
        if (!template.content.includes("{{customer_context}}")) {
          throw new Error("Knowledge Article Prompts müssen {{customer_context}} enthalten");
        }
      }

      if (templateId) {
        const { error } = await supabase
          .from("prompt_templates")
          .update({ 
            name: template.name, 
            type: template.type, 
            content: template.content,
            is_active: true 
          })
          .eq("id", templateId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("prompt_templates")
          .insert([{ 
            ...template, 
            is_active: true 
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt_templates"] });
      setNewTemplate({ name: "", type: "", content: "" });
      setTemplateId(null);
      toast.success(
        templateId 
          ? "Prompt-Template erfolgreich aktualisiert" 
          : "Prompt-Template erfolgreich erstellt"
      );
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h2 className="text-2xl font-semibold mb-6">Prompt-Templates verwalten</h2>
      <div className="mb-8">
        <h3 className="font-semibold mb-2">
          {templateId ? "Prompt-Template bearbeiten" : "Neues Prompt-Template"}
        </h3>
        <div className="space-y-4">
          <div>
            <Input
              placeholder="Name"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
            />
          </div>
          <div>
            <Select
              value={newTemplate.type}
              onValueChange={handleTypeChange}
              disabled={templateId !== null}
            >
              <SelectTrigger className="w-full">
                {newTemplate.type ? useCaseTypeLabels[newTemplate.type as keyof typeof useCaseTypeLabels] : "Typ wählen"}
              </SelectTrigger>
              <SelectContent>
                {(templateId ? useCaseTypesArray : availableTypes).map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!templateId && availableTypes.length === 0 && (
              <p className="text-sm text-red-500 mt-1">
                Für alle Typen existieren bereits Prompts
              </p>
            )}
            {newTemplate.type === USE_CASE_TYPES.KNOWLEDGE_ARTICLE && (
              <p className="text-sm text-muted-foreground mt-1">
                Hinweis: Verwende {{"{{"}}customer_context{{"}}"}} im Prompt, um Kundeninformationen einzufügen
              </p>
            )}
          </div>
          <div>
            <Textarea
              placeholder="Prompt-Inhalt"
              value={newTemplate.content}
              onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
              rows={6}
            />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={!newTemplate.name || !newTemplate.type || !newTemplate.content || status === "pending"}
              onClick={() => mutateAsync(newTemplate)}
            >
              {status === "pending" 
                ? "Speichern..." 
                : (templateId ? "Änderungen speichern" : "Neues Prompt speichern")}
            </Button>
            {templateId && (
              <Button
                variant="outline"
                onClick={() => {
                  setTemplateId(null);
                  setNewTemplate({ name: "", type: "", content: "" });
                }}
              >
                Abbrechen
              </Button>
            )}
          </div>
        </div>
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
              <tr key={row.id} className="border-t">
                <td className="p-2">{row.name}</td>
                <td className="p-2">{useCaseTypeLabels[row.type as keyof typeof useCaseTypeLabels] || row.type}</td>
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
