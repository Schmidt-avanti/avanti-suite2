
import React from "react";
import { Button } from "@/components/ui/button";
import { useCaseTypeLabels } from "@/types/use-case";
import { PromptTemplate } from "@/types/prompt-template";

interface PromptTemplateListProps {
  templates: PromptTemplate[];
  onEdit: (templateId: string) => void;
}

export const PromptTemplateList = ({ templates, onEdit }: PromptTemplateListProps) => {
  return (
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
          {templates.map((template) => (
            <tr key={template.id} className="border-t">
              <td className="p-2">{template.name}</td>
              <td className="p-2">{useCaseTypeLabels[template.type] || template.type}</td>
              <td className="p-2 text-xs">
                {template.content?.slice(0, 100)}{template.content?.length > 100 && "…"}
              </td>
              <td className="p-2">
                <Button size="sm" variant="secondary" onClick={() => onEdit(template.id)}>
                  Bearbeiten
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
