
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
        // Fix: Explicitly define the return type of the Supabase query to avoid deep type instantiation
        const { data, error } = await supabase
          .from('endkunden')
          .select('id, nachname, vorname, adresse, wohnung, gebaeude, lage, email, postleitzahl, ort')
          .eq('customer_id', customerId)
          .eq('is_active', true)
          .order('nachname', { ascending: true });

        if (error) throw error;

        // Transform the data into our expected format
        const formattedData = data.map(ek => {
          // Create a display name based on available fields
          const vorname = ek.vorname ? ` ${ek.vorname}` : '';
          const wohnung = ek.wohnung ? ` • Wohnung ${ek.wohnung}` : '';
          const lage = ek.lage ? ` • ${ek.lage}` : '';
          const gebaeude = ek.gebaeude ? ` • ${ek.gebaeude}` : '';
          
          return {
            id: ek.id,
            nachname: ek.nachname,
            vorname: ek.vorname,
            adresse: ek.adresse,
            wohnung: ek.wohnung,
            gebaeude: ek.gebaeude,
            lage: ek.lage,
            display: `${ek.nachname}${vorname}, ${ek.adresse}${wohnung}${gebaeude}${lage}`
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
    
    // Find the selected endkunde email to pass back
    try {
      // Fix: Explicitly define the return type to avoid deep type instantiation
      const { data, error } = await supabase
        .from('endkunden')
        .select('email')
        .eq('id', endkundeId)
        .single();
      
      if (!error && data) {
        onChange(endkundeId, data.email);
      } else {
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
