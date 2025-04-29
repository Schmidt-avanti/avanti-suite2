
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Check, SpellCheck, X, Loader2, RefreshCw } from "lucide-react";

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
    currentSuggestionIndex: number;
  }[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [correctedText, setCorrectedText] = useState(text);

  useEffect(() => {
    setCorrectedText(text);
  }, [text]);

  // Function to check for spelling errors using LanguageTool API
  const checkSpelling = async () => {
    if (!text.trim()) return;
    
    setIsChecking(true);
    setSuggestions([]);
    
    try {
      // Use LanguageTool API for comprehensive checking
      const response = await checkTextWithLanguageTool(text);
      
      if (response && response.matches && response.matches.length > 0) {
        const apiSuggestions = response.matches.map(match => {
          return {
            original: text.substring(match.offset, match.offset + match.length),
            suggestions: match.replacements.map(r => r.value),
            startPos: match.offset,
            endPos: match.offset + match.length,
            currentSuggestionIndex: 0 // Start with the first suggestion
          };
        });
        
        setSuggestions(apiSuggestions);
      } else {
        // If no spelling errors found
        console.log("No spelling errors found");
      }
    } catch (error) {
      console.error("Error checking spelling:", error);
    } finally {
      setIsChecking(false);
    }
  };
  
  // Function to check text with LanguageTool API
  const checkTextWithLanguageTool = async (text: string) => {
    try {
      const response = await fetch("https://api.languagetool.org/v2/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          text: text,
          language: "de-DE",
          enabledOnly: "false"
        })
      });
      
      if (!response.ok) {
        throw new Error("API request failed");
      }
      
      return await response.json();
    } catch (error) {
      console.error("LanguageTool API error:", error);
      return null;
    }
  };

  const applySuggestion = (suggestionItem: typeof suggestions[0]) => {
    const { original, suggestions, currentSuggestionIndex } = suggestionItem;
    const selectedSuggestion = suggestions[currentSuggestionIndex];
    
    // Create a string with the current suggestion and alternatives in brackets
    let replacementText = selectedSuggestion;
    
    // Add alternatives in brackets if there are more than one suggestion
    if (suggestions.length > 1) {
      const alternativesList = suggestions
        .filter((_, idx) => idx !== currentSuggestionIndex)
        .slice(0, 2) // Limit to 2 alternatives to avoid clutter
        .join(", ");
      
      if (alternativesList) {
        replacementText += ` (alt: ${alternativesList})`;
      }
    }
    
    const newText = text.replace(original, replacementText);
    setCorrectedText(newText);
    onCorrect(newText);
    
    // Remove the applied suggestion
    setSuggestions(prev => prev.filter(s => s.original !== original));
  };

  const ignoreSuggestion = (original: string) => {
    setSuggestions(suggestions.filter(s => s.original !== original));
  };

  const cycleNextSuggestion = (index: number) => {
    setSuggestions(prev => {
      const updated = [...prev];
      const item = updated[index];
      
      if (item) {
        // Move to next suggestion or cycle back to first
        const nextIndex = (item.currentSuggestionIndex + 1) % item.suggestions.length;
        updated[index] = { ...item, currentSuggestionIndex: nextIndex };
      }
      
      return updated;
    });
  };

  const applyAllSuggestions = () => {
    let newText = text;
    suggestions.forEach(suggestion => {
      const selectedSuggestion = suggestion.suggestions[suggestion.currentSuggestionIndex];
      
      // Add alternatives in brackets for each suggestion
      let replacementText = selectedSuggestion;
      if (suggestion.suggestions.length > 1) {
        const alternativesList = suggestion.suggestions
          .filter((_, idx) => idx !== suggestion.currentSuggestionIndex)
          .slice(0, 2) // Limit to 2 alternatives to avoid clutter
          .join(", ");
        
        if (alternativesList) {
          replacementText += ` (alt: ${alternativesList})`;
        }
      }
      
      newText = newText.replace(suggestion.original, replacementText);
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
          {isChecking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <SpellCheck className="h-3.5 w-3.5" />
          )}
          <span>Rechtschreibung prüfen</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2 mb-4">
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
            <div className="flex-1 mr-2">
              <span className="text-amber-800 line-through">{item.original}</span>
              <span className="mx-2 text-gray-500">→</span>
              <span className="font-medium">
                {item.suggestions[item.currentSuggestionIndex]}
              </span>
              {item.suggestions.length > 1 && (
                <span className="text-xs text-gray-500 ml-1">
                  ({item.currentSuggestionIndex + 1}/{item.suggestions.length})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {item.suggestions.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => cycleNextSuggestion(i)}
                  title="Weitere Vorschläge"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => applySuggestion(item)}
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
