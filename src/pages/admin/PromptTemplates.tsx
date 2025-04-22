
import React, { useState } from "react";
import { PromptTemplateForm } from "@/components/prompt-templates/PromptTemplateForm";
import { PromptTemplateList } from "@/components/prompt-templates/PromptTemplateList";
import { usePromptTemplates } from "@/hooks/usePromptTemplates";
import { NewPromptTemplate } from "@/types/prompt-template";

export default function PromptTemplatesPage() {
  const { templates, saveTemplate } = usePromptTemplates();
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState<NewPromptTemplate>({
    name: "",
    type: "",
    content: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usedTypes = templates.map(template => template.type);

  React.useEffect(() => {
    if (!templateId) {
      setNewTemplate({ name: "", type: "", content: "" });
      return;
    }
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setNewTemplate({
        name: template.name,
        type: template.type,
        content: template.content
      });
    }
  }, [templateId, templates]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await saveTemplate({ template: newTemplate, templateId });
      setTemplateId(null);
      setNewTemplate({ name: "", type: "", content: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h2 className="text-2xl font-semibold mb-6">Prompt-Templates verwalten</h2>
      <div className="mb-8">
        <h3 className="font-semibold mb-2">
          {templateId ? "Prompt-Template bearbeiten" : "Neues Prompt-Template"}
        </h3>
        <PromptTemplateForm
          template={newTemplate}
          onChange={setNewTemplate}
          onSubmit={handleSubmit}
          onCancel={() => setTemplateId(null)}
          isEdit={!!templateId}
          usedTypes={usedTypes}
          isSubmitting={isSubmitting}
        />
      </div>
      <PromptTemplateList
        templates={templates}
        onEdit={setTemplateId}
      />
    </div>
  );
}
