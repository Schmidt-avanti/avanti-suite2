
import React, { useEffect, useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface EndkundeOption {
  id: string;
  display: string;
  adresse: string;
  nachname: string;
  vorname: string | null;
  wohnung: string | null;
  gebaeude: string | null;
  lage: string | null;
  postleitzahl: string;
  ort: string;
}

interface EndkundeSelectorProps {
  customerId: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

// Define a plain interface for the database response to avoid type recursion
interface EndkundeResponse {
  id: string;
  Nachname: string;
  Vorname: string | null;
  Adresse: string;
  Wohnung: string | null;
  Gebäude: string | null;
  Lage: string | null;
  Postleitzahl: string;
  Ort: string;
}

export const EndkundeSelector: React.FC<EndkundeSelectorProps> = ({ 
  customerId, 
  value, 
  onChange,
  disabled = false
}) => {
  const [endkunden, setEndkunden] = useState<EndkundeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEndkunden = async () => {
      if (!customerId) {
        setEndkunden([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        console.log('Fetching endkunden for customer ID:', customerId);
        
        // Try with both column names to handle potential case sensitivity issues
        // First try with customer_ID (the original column name in the database)
        const { data: dataWithUnderscoreID, error: errorWithUnderscoreID } = await supabase
          .from('endkunden')
          .select('id, Nachname, Vorname, Adresse, Wohnung, "Gebäude", Lage, Postleitzahl, Ort')
          .eq('customer_ID', customerId)
          .order('Nachname', { ascending: true });

        console.log('Query with customer_ID:', { data: dataWithUnderscoreID, error: errorWithUnderscoreID });

        // If first query fails or returns no results, try with customer_id (lowercase)
        let data, error;
        if (!dataWithUnderscoreID || dataWithUnderscoreID.length === 0) {
          const result = await supabase
            .from('endkunden')
            .select('id, Nachname, Vorname, Adresse, Wohnung, "Gebäude", Lage, Postleitzahl, Ort')
            .eq('customer_ID', customerId)
            .order('Nachname', { ascending: true });
          
          data = result.data;
          error = result.error;
          console.log('Query with customer_id (lowercase):', { data, error });
        } else {
          data = dataWithUnderscoreID;
          error = errorWithUnderscoreID;
        }

        if (error) {
          console.error('Error fetching endkunden:', error);
          toast({
            title: "Fehler beim Laden der Endkunden",
            description: error.message,
            variant: "destructive"
          });
          return;
        }

        console.log('Fetched endkunden:', data);

        if (!data || data.length === 0) {
          console.log('No endkunden found for this customer ID');
          setEndkunden([]);
          setIsLoading(false);
          return;
        }

        // Create a new array to store our formatted data
        const formattedData: EndkundeOption[] = [];
        
        // Use for...of loop to iterate over the data array to avoid type recursion issues
        for (const ek of data) {
          // Cast each item to the expected response type
          const typedEk = ek as unknown as EndkundeResponse;
          
          // Create the display name
          const vorname = typedEk.Vorname ? `${typedEk.Vorname}` : '';
          const displayName = vorname ? `${typedEk.Nachname}, ${vorname}` : typedEk.Nachname;
          
          // Build our formatted option
          formattedData.push({
            id: typedEk.id,
            nachname: typedEk.Nachname,
            vorname: typedEk.Vorname,
            adresse: typedEk.Adresse,
            wohnung: typedEk.Wohnung,
            gebaeude: typedEk.Gebäude,
            lage: typedEk.Lage,
            postleitzahl: typedEk.Postleitzahl,
            ort: typedEk.Ort,
            display: displayName
          });
        }

        setEndkunden(formattedData);
      } catch (err) {
        console.error('Error fetching endkunden:', err);
        toast({
          title: "Fehler beim Laden der Endkunden",
          description: "Es ist ein unerwarteter Fehler aufgetreten.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEndkunden();
  }, [customerId]);

  const handleEndkundeChange = (endkundeId: string) => {
    if (endkundeId === 'none') {
      onChange(null);
      return;
    }
    
    // Simply pass the endkunde ID without fetching email
    onChange(endkundeId);
  };

  return (
    <Select
      value={value || 'none'}
      onValueChange={handleEndkundeChange}
      disabled={disabled || !customerId}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Endkunde auswählen..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Kein Endkunde</SelectItem>
        {isLoading ? (
          <SelectItem value="loading" disabled>Laden...</SelectItem>
        ) : endkunden.length > 0 ? (
          endkunden.map((ek) => (
            <SelectItem key={ek.id} value={ek.id}>
              {ek.display}
            </SelectItem>
          ))
        ) : (
          <SelectItem value="empty" disabled>Keine Endkunden verfügbar</SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};
