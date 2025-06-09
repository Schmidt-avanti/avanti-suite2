
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowStepRequest {
  useCaseTitle: string;
  informationNeeded: string;
  taskDescription: string;
  steps?: string;
}

interface GeneratedWorkflowStep {
  id: string;
  title: string;
  question: string;
  conversationHelp: string;
  inputType: 'text' | 'textarea' | 'phone' | 'email' | 'select' | 'checkbox';
  options?: string[];
  required: boolean;
  placeholder?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { useCaseTitle, informationNeeded, taskDescription, steps }: WorkflowStepRequest = await req.json();

    const systemPrompt = `Du bist ein Experte für Kundenservice und Telefonkommunikation. 

Deine Aufgabe: Generiere konkrete, telefonfreundliche Arbeitsschritte für Mitarbeiter, die Kundenanfragen am Telefon bearbeiten.

WICHTIG:
- Verwende IMMER die DU-FORM
- Jeder Schritt soll eine konkrete, freundliche Frage für das Telefongespräch enthalten
- Gib Gesprächsführungs-Hilfen für schwierige Situationen
- Mache aus abstrakten Anforderungen konkrete, umsetzbare Schritte

Antwortformat (JSON):
{
  "steps": [
    {
      "id": "step-1",
      "title": "Kurzer, klarer Schritt-Titel",
      "question": "Konkrete Frage, die der Mitarbeiter stellen soll",
      "conversationHelp": "Gesprächsführungs-Hilfe für schwierige Situationen",
      "inputType": "text|textarea|phone|email|select|checkbox",
      "options": ["Option1", "Option2"] // nur bei select,
      "required": true/false,
      "placeholder": "Platzhalter-Text"
    }
  ]
}`;

    const userPrompt = `Use Case: "${useCaseTitle}"

Benötigte Informationen: "${informationNeeded}"

Aufgabenbeschreibung: "${taskDescription}"

${steps ? `Bestehende Schritte als Referenz: "${steps}"` : ''}

Generiere 3-6 konkrete, telefonfreundliche Arbeitsschritte in Du-Form, die einem Mitarbeiter helfen, alle benötigten Informationen professionell und freundlich zu erfassen.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let generatedSteps: GeneratedWorkflowStep[];
    try {
      const parsedContent = JSON.parse(content);
      generatedSteps = parsedContent.steps;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      steps: generatedSteps 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-workflow-steps function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      fallback: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
