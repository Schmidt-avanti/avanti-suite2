
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface UseCasePreviewProps {
  aiResponseJson: any;
}

const UseCasePreview = ({ aiResponseJson }: UseCasePreviewProps) => {
  if (!aiResponseJson) return null;

  // Render verschachtelte Objekte wie chat_response
  const renderNestedObject = (obj: any) => {
    if (!obj) return null;
    
    return (
      <div className="pl-4 mt-2 space-y-2 border-l-2 border-primary/20">
        {Object.entries(obj).map(([key, value]) => (
          <div key={key}>
            <div className="font-medium text-sm text-gray-500">{key.replace(/_/g, ' ')}</div>
            <div className="mt-1 break-words">{String(value)}</div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render Arrays wie process_map oder decision_logic
  const renderArray = (arr: any[]) => {
    if (!arr || !arr.length) return null;
    
    return (
      <div className="pl-4 mt-2 space-y-3 border-l-2 border-primary/20">
        {arr.map((item, index) => (
          <div key={index} className="p-2 bg-muted/30 rounded-md">
            {Object.entries(item).map(([key, value]) => (
              <div key={key} className="mb-1">
                <span className="font-medium text-sm text-gray-500">{key.replace(/_/g, ' ')}: </span>
                <span className="break-words">{String(value)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Spezielle Felder, die als verschachtelte Objekte oder Arrays dargestellt werden müssen
  const complexFields = ['process_map', 'decision_logic', 'chat_response'];
  
  // Einfache Felder, die als Text dargestellt werden
  const simpleFields = [
    { label: "Titel", value: aiResponseJson.title },
    { label: "Typ", value: aiResponseJson.type },
    { label: "Benötigte Informationen", value: aiResponseJson.information_needed },
    { label: "Schritte", value: aiResponseJson.steps },
    { label: "Typische Aktivitäten", value: aiResponseJson.typical_activities },
    { label: "Erwartetes Ergebnis", value: aiResponseJson.expected_result },
    { label: "Nächste Frage", value: aiResponseJson.next_question },
  ];

  return (
    <Card className="rounded-2xl shadow-md overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Use Case Vorschau</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-auto">
        {/* Einfache Textfelder */}
        {simpleFields.map((field) => (
          field.value && (
            <div key={field.label} className="border-b pb-3">
              <div className="font-medium text-sm text-gray-500">{field.label}</div>
              <div className="mt-1 break-words">{field.value}</div>
            </div>
          )
        ))}
        
        {/* Komplexe Felder */}
        {complexFields.map(field => {
          const value = aiResponseJson[field];
          if (!value) return null;
          
          return (
            <div key={field} className="border-b pb-3">
              <div className="font-medium text-sm text-gray-500">
                {field === 'process_map' ? 'Prozess-Map' : 
                 field === 'decision_logic' ? 'Entscheidungslogik' : 
                 field === 'chat_response' ? 'Chat-Antwort' : field.replace(/_/g, ' ')}
              </div>
              {Array.isArray(value) ? renderArray(value) : renderNestedObject(value)}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default UseCasePreview;
