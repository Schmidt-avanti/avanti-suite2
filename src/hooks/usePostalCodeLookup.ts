import { useState } from 'react';

type NominatimResult = {
  place_id: number;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
    country?: string;
    road?: string;
    [key: string]: string | undefined;
  };
};

export type LocationSuggestion = {
  city: string;
  state?: string;
};

/**
 * Hook zum Abfragen von Orten anhand von Postleitzahlen via Nominatim API
 */
export function usePostalCodeLookup() {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sucht Orte anhand einer Postleitzahl
   */
  const lookupPostalCode = async (postalCode: string) => {
    // Nur suchen, wenn die PLZ mindestens 4 Zeichen lang ist
    if (!postalCode || postalCode.length < 4) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Nominatim API-Anfrage für deutsche PLZ
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${postalCode}&country=de&format=json&addressdetails=1&limit=5`,
        {
          headers: {
            'Accept-Language': 'de',
            'User-Agent': 'AvantiSuiteApp'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Fehler bei der Abfrage der PLZ-Daten');
      }

      const data: NominatimResult[] = await response.json();
      
      // Verarbeite die Ergebnisse und entferne Duplikate
      const uniqueCities = new Map<string, LocationSuggestion>();
      
      data.forEach(item => {
        // Ermittle den Stadt-/Ortsnamen aus verschiedenen möglichen Feldern
        const city = item.address.city || 
                     item.address.town || 
                     item.address.village || 
                     item.address.municipality;
        
        if (city && !uniqueCities.has(city.toLowerCase())) {
          uniqueCities.set(city.toLowerCase(), {
            city,
            state: item.address.state
          });
        }
      });
      
      setSuggestions(Array.from(uniqueCities.values()));
    } catch (err) {
      console.error('PLZ-Lookup Fehler:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    suggestions,
    isLoading,
    error,
    lookupPostalCode
  };
}
