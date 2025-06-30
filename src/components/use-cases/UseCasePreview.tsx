import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface UseCasePreviewProps {
  aiResponseJson: any;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
}

const UseCasePreview = ({ aiResponseJson }: UseCasePreviewProps) => {
  if (!aiResponseJson) return null;
  
  const infoBlock = aiResponseJson.chat_response?.info_block;
  
  const simpleFields = [
    { label: "Titel", value: aiResponseJson.title },
    { label: "Erwartetes Ergebnis", value: aiResponseJson.expected_result },
    { 
      label: "Benötigte Informationen", 
      value: Array.isArray(aiResponseJson.information_needed) 
              ? aiResponseJson.information_needed.join(', ') 
              : aiResponseJson.information_needed 
    },
  ];
  
  if (infoBlock) {
    simpleFields.push({ label: "Zusammenfassung", value: infoBlock });
  }

  return (
    <Card className="rounded-2xl shadow-md overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Use Case Vorschau</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-auto">
        {simpleFields.map((field) => (
          field.value && (
            <div key={field.label} className="border-b pb-3">
              <div className="font-medium text-sm text-gray-500">{field.label}</div>
              <div className="mt-1 break-words">{field.value}</div>
            </div>
          )
        ))}
      </CardContent>
    </Card>
  );
};

export default UseCasePreview;
