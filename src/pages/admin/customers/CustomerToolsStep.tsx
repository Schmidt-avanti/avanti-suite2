
import React from "react";
import { Input } from "@/components/ui/input";

const toolLabels: Record<string, { label: string; desc: string }> = {
  taskManagement: { label: "Task Management", desc: "Genutztes Tool für Aufgabenverwaltung (z. B. Asana, Jira). Falls nicht vorhanden, bitte 'N/A' eintragen." },
  knowledgeBase: { label: "Wissensdatenbank", desc: "Tool für Dokumentation und Wissensmanagement (z. B. Confluence, Notion). Falls nicht vorhanden, bitte 'N/A' eintragen." },
  crm: { label: "CRM", desc: "Kundenmanagement-System (z. B. HubSpot, Salesforce). Falls nicht vorhanden, bitte 'N/A' eintragen." }
};

interface Props {
  tools?: Record<"taskManagement" | "knowledgeBase" | "crm", string>;
  setTools?: (tools: Record<"taskManagement" | "knowledgeBase" | "crm", string>) => void;
  customer?: any;
  setCustomer?: (customer: any) => void;
}

const CustomerToolsStep: React.FC<Props> = ({ tools, setTools, customer, setCustomer }) => {
  // Handle customer object pattern
  if (customer && setCustomer) {
    const handleToolChange = (toolKey: string, value: string) => {
      setCustomer({
        ...customer,
        tools: {
          ...(customer.tools || {}),
          [toolKey]: value
        }
      });
    };
    
    return (
      <div className="space-y-6">
        {Object.entries(toolLabels).map(([key, { label, desc }]) => (
          <div key={key}>
            <label className="font-medium">{label} *</label>
            <Input
              value={(customer.tools && customer.tools[key]) || ""}
              placeholder={`z. B. ${label}`}
              onChange={e => handleToolChange(key, e.target.value)}
              required
            />
            <div className="text-xs text-muted-foreground">{desc}</div>
          </div>
        ))}
      </div>
    );
  }
  
  // Handle direct tools props
  if (tools && setTools) {
    const handleToolChange = (toolKey: keyof typeof tools, value: string) => {
      setTools({ ...tools, [toolKey]: value });
    };
    
    return (
      <div className="space-y-6">
        {Object.entries(toolLabels).map(([key, { label, desc }]) => (
          <div key={key}>
            <label className="font-medium">{label} *</label>
            <Input
              value={tools[key as keyof typeof tools] || ""}
              placeholder={`z. B. ${label}`}
              onChange={e => handleToolChange(key as keyof typeof tools, e.target.value)}
              required
            />
            <div className="text-xs text-muted-foreground">{desc}</div>
          </div>
        ))}
      </div>
    );
  }
  
  // Default rendering with empty data
  return (
    <div className="space-y-6">
      {Object.entries(toolLabels).map(([key, { label, desc }]) => (
        <div key={key}>
          <label className="font-medium">{label} *</label>
          <Input
            value={""}
            placeholder={`z. B. ${label}`}
            onChange={() => {}}
            required
          />
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      ))}
    </div>
  );
};

export default CustomerToolsStep;
