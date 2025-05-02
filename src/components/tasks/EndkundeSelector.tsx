
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
import { useAuth } from '@/contexts/AuthContext';

// Define a simple interface for the Endkunde option
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

// Define a plain interface for the database response
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
  const { user } = useAuth();

  useEffect(() => {
    const fetchEndkunden = async () => {
      if (!customerId) {
        setEndkunden([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        console.log(`Fetching endkunden for customer ID: ${customerId}, User role: ${user?.role}, User ID: ${user?.id}`);
        
        // First try querying with customer_ID (uppercase)
        const { data: endkundenData, error: endkundenError } = await supabase
          .from('endkunden')
          .select('id, Nachname, Vorname, Adresse, Wohnung, "Gebäude", Lage, Postleitzahl, Ort')
          .eq('customer_ID', customerId)
          .order('Nachname', { ascending: true });

        console.log('Query with customer_ID (uppercase):', { 
          data: endkundenData?.length || 0, 
          error: endkundenError?.message || 'none',
          status: endkundenError?.code || 'no-error'
        });
        
        // If error is permission related
        if (endkundenError && (endkundenError.code === 'PGRST301' || endkundenError.message.includes('permission'))) {
          console.error('Permission error fetching endkunden:', endkundenError);
          
          // For agents, verify if they have access to this customer
          if (user?.role === 'agent') {
            console.log("Checking if agent has access to this customer...");
            const { data: assignments, error: assignmentError } = await supabase
              .from('user_customer_assignments')
              .select('customer_id')
              .eq('user_id', user.id)
              .eq('customer_id', customerId);
              
            console.log("Agent assignments check:", { 
              assignments: assignments?.length || 0,
              error: assignmentError?.message || 'none' 
            });
              
            if (!assignments || assignments.length === 0) {
              console.warn("Agent does not have access to this customer");
              toast({
                title: "Zugriffsfehler",
                description: "Sie haben keine Berechtigung, auf Endkunden dieses Kunden zuzugreifen.",
                variant: "destructive"
              });
            }
          }
          
          setIsLoading(false);
          return;
        }

        if (endkundenError) {
          console.error('Error fetching endkunden:', endkundenError);
          toast({
            title: "Fehler beim Laden der Endkunden",
            description: endkundenError.message,
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        if (!endkundenData || endkundenData.length === 0) {
          console.log('No endkunden found for this customer ID');
          
          // As a fallback, try with lowercase customer_id
          console.log("Trying fallback with lowercase customer_id...");
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('endkunden')
            .select('id, Nachname, Vorname, Adresse, Wohnung, "Gebäude", Lage, Postleitzahl, Ort')
            .eq('customer_id', customerId)
            .order('Nachname', { ascending: true });
            
          console.log('Fallback query results:', { 
            data: fallbackData?.length || 0, 
            error: fallbackError?.message || 'none' 
          });
          
          if (fallbackData && fallbackData.length > 0) {
            processEndkundenData(fallbackData);
          } else {
            setEndkunden([]);
          }
          setIsLoading(false);
          return;
        }

        console.log(`Fetched ${endkundenData.length} endkunden records`);
        processEndkundenData(endkundenData);
        
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
    
    // Helper function to process the endkunden data - SIMPLIFIED to fix type recursion
    const processEndkundenData = (data: EndkundeResponse[]) => {
      const formattedData: EndkundeOption[] = [];
      
      // Use simple for loop to avoid complex type inference
      for (const ek of data) {
        const displayName = ek.Vorname ? `${ek.Nachname}, ${ek.Vorname}` : ek.Nachname;
        
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
          display: displayName
        });
      }

      setEndkunden(formattedData);
    };

    fetchEndkunden();
  }, [customerId, user]);

  const handleEndkundeChange = (endkundeId: string) => {
    if (endkundeId === 'none') {
      onChange(null);
      return;
    }
    
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
