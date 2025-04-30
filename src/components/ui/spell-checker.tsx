
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, AlertTriangle, Sparkles } from 'lucide-react';

interface SpellCheckerProps {
  text: string;
  onCorrect: (correctedText: string) => void;
}

export const SpellChecker: React.FC<SpellCheckerProps> = ({ text, onCorrect }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkSpelling = async () => {
    if (!text.trim()) return;

    setIsChecking(true);
    setError(null);
    setSuggestions(null);

    try {
      console.log("Starting spell check for text:", text.substring(0, 30) + "...");
      
      // Making sure we use the correct OpenAI API structure for gpt-4.1
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY || ''}`
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          max_tokens: 4000,
          messages: [
            {
              role: "system",
              content: "Du bist ein Assistent, der Rechtschreib- und Grammatikfehler korrigiert. Korrigiere den folgenden Text, ohne den Inhalt zu ändern. Gib nur den korrigierten Text zurück, ohne zusätzliche Erklärungen."
            },
            {
              role: "user",
              content: text
            }
          ]
        })
      });

      console.log("OpenAI API response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API error:", errorText);
        throw new Error(`Fehler bei der Rechtschreibprüfung: ${response.status}`);
      }

      const data = await response.json();
      console.log("OpenAI response received:", data);
      setSuggestions(data.choices[0].message.content);
    } catch (err) {
      console.error('Spell check error:', err);
      setError('Rechtschreibprüfung konnte nicht durchgeführt werden.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleAcceptCorrections = () => {
    if (suggestions) {
      onCorrect(suggestions);
      setSuggestions(null);
    }
  };

  const handleReject = () => {
    setSuggestions(null);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={checkSpelling}
          disabled={isChecking || !text.trim()}
          className="flex items-center text-sm text-blue-600"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {isChecking ? 'Prüfe Text...' : 'Rechtschreibung & Grammatik prüfen'}
        </Button>
      </div>
      
      {error && (
        <div className="mt-2 p-2 bg-red-50 text-red-600 rounded-md text-sm flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2" />
          {error}
        </div>
      )}
      
      {suggestions && (
        <div className="mt-2 p-3 border border-blue-200 bg-blue-50 rounded-md">
          <div className="mb-2 text-sm font-medium text-blue-700">Korrigierter Text:</div>
          <div className="text-sm whitespace-pre-wrap bg-white p-2 rounded border border-blue-100 mb-3">
            {suggestions}
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50"
              onClick={handleAcceptCorrections}
            >
              <Check className="h-4 w-4 mr-1" /> Übernehmen
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50"
              onClick={handleReject}
            >
              <X className="h-4 w-4 mr-1" /> Ablehnen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
