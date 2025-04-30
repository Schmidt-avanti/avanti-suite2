
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
}

interface EndkundeSelectorProps {
  customerId: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
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
        
        // Explicitly define the response type to avoid recursion issues
        type EndkundeResponse = {
          id: string;
          Nachname: string;
          Vorname: string | null;
          Adresse: string;
          Wohnung: string | null;
          Gebäude: string | null;
          Lage: string | null;
          Postleitzahl: string;
          Ort: string;
        };
        
        const { data, error } = await supabase
          .from('endkunden')
          .select('id, Nachname, Vorname, Adresse, Wohnung, "Gebäude", Lage, Postleitzahl, Ort')
          .eq('customer_ID', customerId)
          .eq('is_active', true)
          .order('Nachname', { ascending: true });

        if (error) {
          console.error('Error fetching endkunden:', error);
          throw error;
        }

        console.log('Fetched endkunden:', data);

        // Transform the data with explicit typing to avoid recursion issues
        const formattedData: EndkundeOption[] = (data as EndkundeResponse[]).map((ek) => {
          // Create a display name based on available fields
          const vorname = ek.Vorname ? ` ${ek.Vorname}` : '';
          const wohnung = ek.Wohnung ? ` • Wohnung ${ek.Wohnung}` : '';
          const lage = ek.Lage ? ` • ${ek.Lage}` : '';
          const gebaeude = ek.Gebäude ? ` • ${ek.Gebäude}` : '';
          
          return {
            id: ek.id,
            nachname: ek.Nachname,
            vorname: ek.Vorname,
            adresse: ek.Adresse,
            wohnung: ek.Wohnung,
            gebaeude: ek.Gebäude,
            lage: ek.Lage,
            display: `${ek.Nachname}${vorname}, ${ek.Adresse}${wohnung}${gebaeude}${lage}`
          };
        });

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
