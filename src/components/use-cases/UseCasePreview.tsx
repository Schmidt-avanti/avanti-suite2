
import React from 'react';
import { Card } from "@/components/ui/card";

interface UseCasePreviewProps {
  aiResponseJson: any;
}

const UseCasePreview = ({ aiResponseJson }: UseCasePreviewProps) => {
  if (!aiResponseJson) return null;

  const fields = [
    { label: "Titel", value: aiResponseJson.title },
    { label: "Typ", value: aiResponseJson.type },
    { label: "Benötigte Informationen", value: aiResponseJson.information_needed },
    { label: "Schritte", value: aiResponseJson.steps },
    { label: "Typische Aktivitäten", value: aiResponseJson.typical_activities },
    { label: "Erwartetes Ergebnis", value: aiResponseJson.expected_result },
    { label: "Prozess-Map", value: aiResponseJson.process_map },
    { label: "Entscheidungslogik", value: aiResponseJson.decision_logic }
  ];

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Use Case Vorschau</h3>
      <div className="space-y-4">
        {fields.map((field) => (
          field.value && (
            <div key={field.label} className="border-b pb-2">
              <div className="font-medium text-sm text-gray-500">{field.label}</div>
              <div className="mt-1">{field.value}</div>
            </div>
          )
        ))}
      </div>
    </Card>
  );
};

export default UseCasePreview;
