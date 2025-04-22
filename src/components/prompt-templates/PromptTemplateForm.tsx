
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { USE_CASE_TYPES, useCaseTypeLabels } from "@/types/use-case";
import { NewPromptTemplate } from "@/types/prompt-template";

interface PromptTemplateFormProps {
  template: NewPromptTemplate;
  onChange: (template: NewPromptTemplate) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEdit: boolean;
  usedTypes: string[];
  isSubmitting: boolean;
}

export const PromptTemplateForm = ({
  template,
  onChange,
  onSubmit,
  onCancel,
  isEdit,
  usedTypes,
  isSubmitting,
}: PromptTemplateFormProps) => {
  const availableTypes = Object.entries(USE_CASE_TYPES)
    .map(([_, value]) => ({
      value,
      label: useCaseTypeLabels[value],
    }))
    .filter(type => isEdit || !usedTypes.includes(type.value));

  const handleTypeChange = (value: string) => {
    onChange({
      ...template,
      type: value,
      content: value === USE_CASE_TYPES.KNOWLEDGE_ARTICLE
        ? `Berücksichtige folgenden Kundenkontext: {customer_context}\n\nErstelle einen Wissensartikel...`
        : template.content
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Input
          placeholder="Name"
          value={template.name}
          onChange={(e) => onChange({ ...template, name: e.target.value })}
        />
      </div>
      <div>
        <Select
          value={template.type}
          onValueChange={handleTypeChange}
          disabled={isEdit}
        >
          <SelectTrigger className="w-full">
            {template.type ? useCaseTypeLabels[template.type] : "Typ wählen"}
          </SelectTrigger>
          <SelectContent>
            {availableTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isEdit && availableTypes.length === 0 && (
          <p className="text-sm text-red-500 mt-1">
            Für alle Typen existieren bereits Prompts
          </p>
        )}
        {template.type === USE_CASE_TYPES.KNOWLEDGE_ARTICLE && (
          <p className="text-sm text-muted-foreground mt-1">
            Hinweis: Verwende {'{customer_context}'} im Prompt, um Kundeninformationen einzufügen
          </p>
        )}
      </div>
      <div>
        <Textarea
          placeholder="Prompt-Inhalt"
          value={template.content}
          onChange={(e) => onChange({ ...template, content: e.target.value })}
          rows={6}
        />
      </div>
      <div className="flex gap-2">
        <Button
          disabled={!template.name || !template.type || !template.content || isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting 
            ? "Speichern..." 
            : (isEdit ? "Änderungen speichern" : "Neues Prompt speichern")}
        </Button>
        {isEdit && (
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
        )}
      </div>
    </div>
  );
};
