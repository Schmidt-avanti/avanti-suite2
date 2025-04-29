
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Check, SpellCheck, X } from "lucide-react";

interface SpellCheckerProps {
  text: string;
  onCorrect: (correctedText: string) => void;
}

export function SpellChecker({ text, onCorrect }: SpellCheckerProps) {
  const [suggestions, setSuggestions] = useState<{
    original: string;
    suggestions: string[];
    startPos: number;
    endPos: number;
  }[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [correctedText, setCorrectedText] = useState(text);

  // Simple German typo dictionary
  const typoDict: Record<string, string[]> = {
    'newletter': ['newsletter'],
    'newsltter': ['newsletter'],
    'newsleter': ['newsletter'],
    'newslettr': ['newsletter'],
    'newsltr': ['newsletter'],
    'anmeldung': ['anmeldung'],
    'anmeldng': ['anmeldung'],
    'kundentermin': ['kundentermin'],
    'termin': ['termin'],
    'terminvereinbarng': ['terminvereinbarung'],
    'terminvereinbarung': ['terminvereinbarung'],
    'problm': ['problem'],
    'aufgbe': ['aufgabe'],
    'aktualisiren': ['aktualisieren'],
    'updaten': ['aktualisieren', 'updaten'],
    'websete': ['webseite'],
    'webseit': ['webseite'],
  };

  useEffect(() => {
    setCorrectedText(text);
  }, [text]);

  const checkSpelling = () => {
    if (!text.trim()) return;
    
    setIsChecking(true);
    const words = text.split(/\s+/);
    const newSuggestions: {
      original: string;
      suggestions: string[];
      startPos: number;
      endPos: number;
    }[] = [];

    let currentPos = 0;
    
    words.forEach(word => {
      // Remove punctuation for checking
      const cleanWord = word.toLowerCase().replace(/[.,!?;:()]/g, '');
      const startPos = text.indexOf(word, currentPos);
      const endPos = startPos + word.length;
      currentPos = endPos;

      if (cleanWord.length > 2 && typoDict[cleanWord]) {
        newSuggestions.push({
          original: word,
          suggestions: typoDict[cleanWord],
          startPos,
          endPos
        });
      }
    });

    setSuggestions(newSuggestions);
    setIsChecking(false);
  };

  const applySuggestion = (original: string, suggestion: string) => {
    const newText = text.replace(original, suggestion);
    setCorrectedText(newText);
    onCorrect(newText);
    
    // Remove the applied suggestion
    setSuggestions(suggestions.filter(s => s.original !== original));
  };

  const ignoreSuggestion = (original: string) => {
    setSuggestions(suggestions.filter(s => s.original !== original));
  };

  const applyAllSuggestions = () => {
    let newText = text;
    suggestions.forEach(suggestion => {
      newText = newText.replace(suggestion.original, suggestion.suggestions[0]);
    });
    
    setCorrectedText(newText);
    onCorrect(newText);
    setSuggestions([]);
  };

  if (suggestions.length === 0) {
    return (
      <div className="mt-2 flex items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
          onClick={checkSpelling}
          disabled={isChecking || !text.trim()}
        >
          <SpellCheck className="h-3.5 w-3.5" />
          <span>Rechtschreibung prüfen</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-1 text-amber-600">
          <SpellCheck className="h-4 w-4" />
          <span>Rechtschreibvorschläge</span>
        </h4>
        <div className="flex items-center gap-2">
          {suggestions.length > 1 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7 px-2"
              onClick={applyAllSuggestions}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Alle übernehmen
            </Button>
          )}
        </div>
      </div>
      
      <div className="bg-amber-50 border border-amber-100 rounded-md p-2 space-y-2 text-sm">
        {suggestions.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div>
              <span className="text-amber-800 line-through">{item.original}</span>
              <span className="mx-2 text-gray-500">→</span>
              <span className="font-medium">{item.suggestions[0]}</span>
              {item.suggestions.length > 1 && (
                <span className="text-xs text-gray-500 ml-1">
                  ({item.suggestions.slice(1).join(', ')})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => applySuggestion(item.original, item.suggestions[0])}
                title="Vorschlag übernehmen"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-500 hover:bg-gray-50"
                onClick={() => ignoreSuggestion(item.original)}
                title="Ignorieren"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
