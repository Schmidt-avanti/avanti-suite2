import { useState } from 'react';

/**
 * Hook für die Suche nach Orten basierend auf Postleitzahlen
 * Kann später mit einer echten API-Integration erweitert werden
 */
export const usePostalCodeLookup = () => {
  const [suggestions, setSuggestions] = useState<{city: string; street?: string; state?: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Implementierung einer Lookup-Funktion, die den Postalcode als Parameter nimmt
  const lookupPostalCode = (postalCode: string) => {
    if (postalCode && postalCode.length >= 5) {
      setIsLoading(true);
      setError(null);
      // Simulating API call to get city suggestions
      setTimeout(() => {
        setSuggestions([{city: "Example City", state: "Example State"}]);
        setIsLoading(false);
      }, 500);
    } else {
      setSuggestions([]);
    }
  };

  return { suggestions, isLoading, error, lookupPostalCode };
};

export default usePostalCodeLookup;
