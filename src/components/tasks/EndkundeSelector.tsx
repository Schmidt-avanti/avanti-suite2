
import React, { useEffect, useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';

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
        
        // Use properly typed database query - fixed column name to customer_ID
        const { data, error } = await supabase
          .from('endkunden')
          .select('id, Nachname, Vorname, Adresse, Wohnung, "Gebäude", Lage, Postleitzahl, Ort')
          .eq('customer_ID', customerId)
          .order('Nachname', { ascending: true });

        if (error) {
          console.error('Error fetching endkunden:', error);
          throw error;
        }

        console.log('Fetched endkunden:', data);

        // Fix: Using a for loop instead of map to avoid deep type instantiation
        const formattedData: EndkundeOption[] = [];
        
        if (data) {
          // Explicitly cast data to the correct type
          const typedData = data as unknown as EndkundeResponse[];
          
          // Use a for loop instead of map to avoid TS2589 error
          for (const ek of typedData) {
            const vorname = ek.Vorname ? `${ek.Vorname}` : '';
            
            formattedData.push({
              id: ek.id,
              nachname: ek.Nachname,
              vorname: ek.Vorname,
              adresse: ek.Adresse,
              wohnung: ek.Wohnung,
              gebaeude: ek.Gebäude,
              lage: ek.Lage,
              postleitzahl: ek.Postleitzahl,
              ort: ek.Ort,
              // Simplified display for dropdown - just name and surname
              display: vorname ? `${ek.Nachname}, ${vorname}` : ek.Nachname
            });
          }
        }

        setEndkunden(formattedData);
      } catch (err) {
        console.error('Error fetching endkunden:', err);
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
        ) : (
          endkunden.map((ek) => (
            <SelectItem key={ek.id} value={ek.id}>
              {ek.display}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};
