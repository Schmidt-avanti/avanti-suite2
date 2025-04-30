
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
        // Fixed column name to customer_ID (capital ID) and removed is_active filter
        const { data, error } = await supabase
          .from('endkunden')
          .select('id, nachname, vorname, adresse, wohnung, gebaeude, lage, postleitzahl, ort')
          .eq('customer_ID', customerId)
          .order('nachname', { ascending: true });

        if (error) throw error;

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
    
    // Since email field doesn't exist in endkunden table, we'll just pass null for the email
    onChange(endkundeId, null);
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
