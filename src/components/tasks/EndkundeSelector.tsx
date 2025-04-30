
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
  onChange: (value: string | null, endkundeEmail?: string | null) => void;
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
        
        // Query only the fields we need and ensure correct column names
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
        const formattedData: EndkundeOption[] = data.map((ek) => {
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

  const handleEndkundeChange = async (endkundeId: string) => {
    if (endkundeId === 'none') {
      onChange(null);
      return;
    }
    
    // Since email is not fetched in the initial query, we need to get it separately
    try {
      console.log('Fetching email for endkunde ID:', endkundeId);
      
      const { data, error } = await supabase
        .from('endkunden')
        .select('email')
        .eq('id', endkundeId)
        .single();
      
      console.log('Email fetch result:', { data, error });
      
      if (!error && data) {
        onChange(endkundeId, data.email);
      } else {
        // If email doesn't exist in the schema or there's an error, pass null
        onChange(endkundeId, null);
      }
    } catch (err) {
      console.error('Error fetching endkunde details:', err);
      onChange(endkundeId, null);
    }
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
