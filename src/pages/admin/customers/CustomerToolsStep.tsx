
import React from "react";
import { Input } from "@/components/ui/input";

const toolLabels: Record<string, { label: string; desc: string }> = {
  taskManagement: { label: "Task Management", desc: "Genutztes Tool für Aufgabenverwaltung (z. B. Asana, Jira). Falls nicht vorhanden, bitte 'N/A' eintragen." },
  knowledgeBase: { label: "Wissensdatenbank", desc: "Tool für Dokumentation und Wissensmanagement (z. B. Confluence, Notion). Falls nicht vorhanden, bitte 'N/A' eintragen." },
  crm: { label: "CRM", desc: "Kundenmanagement-System (z. B. HubSpot, Salesforce). Falls nicht vorhanden, bitte 'N/A' eintragen." }
};

interface Props {
  tools: Record<"taskManagement" | "knowledgeBase" | "crm", string>;
  setTools: (tools: Record<"taskManagement" | "knowledgeBase" | "crm", string>) => void;
}

const CustomerToolsStep: React.FC<Props> = ({ tools, setTools }) => {
  const handleToolChange = (toolKey: keyof typeof tools, value: string) => {
    setTools({ ...tools, [toolKey]: value });
  };
  return (
    <div className="space-y-6">
      {Object.entries(toolLabels).map(([key, { label, desc }]) => (
        <div key={key}>
          <label className="font-medium">{label} *</label>
          <Input
            value={tools[key as keyof typeof tools]}
            placeholder={`z. B. ${label}`}
            onChange={e => handleToolChange(key as keyof typeof tools, e.target.value)}
            required
          />
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      ))}
    </div>
  );
};

export default CustomerToolsStep;
