
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PromptTemplate, NewPromptTemplate } from "@/types/prompt-template";
import { USE_CASE_TYPES } from "@/types/use-case";

export const usePromptTemplates = () => {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["prompt_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PromptTemplate[];
    },
  });

  const { mutateAsync: saveTemplate } = useMutation({
    mutationFn: async ({ template, templateId }: { template: NewPromptTemplate; templateId: string | null }) => {
      if (!templateId && templates.some(t => t.type === template.type)) {
        throw new Error("Ein Prompt für diesen Typ existiert bereits");
      }

      if (template.type === USE_CASE_TYPES.KNOWLEDGE_ARTICLE) {
        if (!template.content.includes("{customer_context}")) {
          throw new Error("Knowledge Article Prompts müssen {customer_context} enthalten");
        }
      }

      if (templateId) {
        const { error } = await supabase
          .from("prompt_templates")
          .update({ ...template, is_active: true })
          .eq("id", templateId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("prompt_templates")
          .insert([{ ...template, is_active: true }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt_templates"] });
      toast.success("Prompt-Template erfolgreich gespeichert");
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  return { templates, isLoading, saveTemplate };
};
