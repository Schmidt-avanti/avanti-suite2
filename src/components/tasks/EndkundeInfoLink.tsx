
import React from 'react';
import { Info } from 'lucide-react';
import { 
  HoverCard, 
  HoverCardContent, 
  HoverCardTrigger 
} from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

interface EndkundeInfoLinkProps {
  endkundeId: string | undefined | null;
  customerId: string | undefined | null;
}

interface EndkundeDetails {
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

export const EndkundeInfoLink: React.FC<EndkundeInfoLinkProps> = ({ endkundeId, customerId }) => {
  const [endkunde, setEndkunde] = React.useState<EndkundeDetails | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchEndkundeDetails = async () => {
      if (!endkundeId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('endkunden')
          .select('id, Nachname, Vorname, Adresse, Wohnung, "Gebäude", Lage, Postleitzahl, Ort')
          .eq('id', endkundeId)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setEndkunde(data as EndkundeDetails);
        } else {
          setError('Keine Endkunden-Details gefunden');
        }
      } catch (err: any) {
        console.error('Error fetching endkunde details:', err);
        setError(err.message || 'Fehler beim Laden der Endkunden-Details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEndkundeDetails();
  }, [endkundeId]);

  if (!endkundeId || (!isLoading && !endkunde)) {
    return null;
  }

  const displayName = endkunde ? 
    `${endkunde.Nachname}${endkunde.Vorname ? `, ${endkunde.Vorname}` : ''}` : 
    'Endkunde laden...';

  return (
    <div className="bg-white/90 rounded-xl shadow-md border border-gray-100 p-4 mb-4">
      <h3 className="text-lg font-semibold text-blue-900 mb-1 flex items-center">
        Endkunde
      </h3>
      <div className="text-sm text-gray-600">
        {isLoading ? (
          <div className="animate-pulse flex space-x-2 items-center">
            <div className="h-4 w-28 bg-gray-200 rounded"></div>
            <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
          </div>
        ) : error ? (
          <span className="text-red-500">{error}</span>
        ) : (
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div className="flex items-center cursor-pointer hover:text-blue-600 transition-colors">
                <span className="font-medium">{displayName}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 ml-2 text-blue-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Details anzeigen</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 p-4">
              <div className="space-y-2">
                <h4 className="font-semibold">{displayName}</h4>
                
                <div className="grid grid-cols-[80px_1fr] gap-1 text-sm">
                  <span className="text-gray-500">Adresse:</span>
                  <span>{endkunde?.Adresse}</span>
                  
                  {endkunde?.Wohnung && (
                    <>
                      <span className="text-gray-500">Wohnung:</span>
                      <span>{endkunde.Wohnung}</span>
                    </>
                  )}
                  
                  {endkunde?.Gebäude && (
                    <>
                      <span className="text-gray-500">Gebäude:</span>
                      <span>{endkunde.Gebäude}</span>
                    </>
                  )}
                  
                  {endkunde?.Lage && (
                    <>
                      <span className="text-gray-500">Lage:</span>
                      <span>{endkunde.Lage}</span>
                    </>
                  )}
                  
                  <span className="text-gray-500">PLZ/Ort:</span>
                  <span>{endkunde?.Postleitzahl} {endkunde?.Ort}</span>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        )}
      </div>
    </div>
  );
};
