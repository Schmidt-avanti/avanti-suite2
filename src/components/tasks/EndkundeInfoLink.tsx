
import React from 'react';
import { Info, Phone, Mail } from 'lucide-react';
import { 
  HoverCard, 
  HoverCardContent, 
  HoverCardTrigger 
} from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

// Simple interface for contact data
interface EndkundeContact {
  role: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
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
  endkunden_contacts: string | null; // This is an ID reference, not an array
}

interface EndkundeInfoLinkProps {
  endkundeId: string | undefined | null;
  customerId: string | undefined | null;
  taskTitle?: string;
  taskSummary?: string;
  onContactsLoaded?: (contacts: EndkundeContact[]) => void;
}

export const EndkundeInfoLink: React.FC<EndkundeInfoLinkProps> = ({ endkundeId, customerId, taskTitle, taskSummary, onContactsLoaded }) => {
  const [endkunde, setEndkunde] = React.useState<EndkundeDetails | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // State for contacts
  const [contacts, setContacts] = React.useState<EndkundeContact[]>([]);
  const [contactsLoading, setContactsLoading] = React.useState(false);

  // Define fetchContacts outside of useEffect so it can be called from button
  const fetchContacts = async (contactId: string = 'e7a21229-20e1-4e21-a447-cb91b0490a06') => {
    try {
      setContactsLoading(true);
      
      // Direct query using the exact structure shown in your Supabase screenshot
      const { data, error } = await supabase
        .from('endkunden_contacts')
        .select('role, name, phone, email')
        .eq('id', contactId);
      
      console.log('Direct SQL query result:', { data, error, query: `SELECT role, name, phone, email FROM endkunden_contacts WHERE id = '${contactId}'` });
      
      if (error) {
        console.error('SQL Error:', error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log('\u2705 Found contact data:', data);
        setContacts(data);
      } else {
        console.log('\u26a0\ufe0f No contact data found for ID:', contactId);
        setContacts([]); // Reset contacts if none found
      }
    } catch (err) {
      console.error('Error in fetchContacts:', err);
    } finally {
      setContactsLoading(false);
    }
  };

  // Set the correct contact based on Endkunde's location
  // Export contacts for use in other components

  const setLocationBasedContact = () => {
    if (!endkunde) return;
    
    setContactsLoading(true);
    
    try {
      // Determine which contact to use based on location - using case-insensitive comparison
      const location = (endkunde.Ort || '').toLowerCase().trim();
      
      if (location.includes('berlin')) {
        // Contact for Berlin
        setContacts([{
          role: 'Hausmeister',
          name: 'Sven Gärtner',
          phone: '0176 49007173',
          email: 'gaertner@nuernberg.berlin'
        }]);
        console.log('Berlin contact selected for location:', endkunde.Ort);
      } else if (
        location.includes('frankfurt') || 
        location.includes('ffo') || 
        location.includes('fürstenwalde') ||
        location.includes('fuerstenwalde')
      ) {
        // Contact for Frankfurt/Oder and Fürstenwalde - more flexible matching
        setContacts([{
          role: 'Hausmeister',
          name: 'Herr Gora',
          phone: '01512 3055417',
          email: 'hausmeister@ffo-verwaltung.de'
        }]);
        console.log('Frankfurt/Fürstenwalde contact selected for location:', endkunde.Ort);
      } else {
        // Don't show any contacts for other locations
        setContacts([]);
        console.log('No contacts shown for location:', endkunde.Ort);
      }
    } finally {
      setContactsLoading(false);
    }
  };  

  // Automatically set contact based on endkunde location when loaded
  React.useEffect(() => {
    if (endkunde) {
      setLocationBasedContact();
    }
  }, [endkunde]);
  
  // Notify parent components when contacts are loaded
  React.useEffect(() => {
    if (contacts.length > 0 && onContactsLoaded) {
      onContactsLoaded(contacts);
    }
  }, [contacts, onContactsLoaded]);
  
  // Fetch endkunde details
  React.useEffect(() => {
    const fetchEndkundeDetails = async () => {
      if (!endkundeId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('Fetching endkunde with ID:', endkundeId);
        
        // First, fetch endkunde details
        const { data: endkundeData, error: endkundeError } = await supabase
          .from('endkunden')
          .select('id, Nachname, Vorname, Adresse, Wohnung, "Gebäude", Lage, Postleitzahl, Ort, endkunden_contacts')
          .eq('id', endkundeId)
          .single();

        console.log('Endkunde data:', endkundeData);

        if (endkundeError) throw endkundeError;

        if (endkundeData) {
          // Cast to correct type after fixing the interface
          setEndkunde(endkundeData as EndkundeDetails);
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
  }, [endkundeId]); // Note: fetchContacts is intentionally omitted from deps to avoid re-runs

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

                {contacts.length > 0 && (
                  <div className="pt-3 mt-2 border-t border-gray-100">
                    <h5 className="font-semibold text-gray-700 mb-2">Kontakte</h5>
                    <div className="space-y-3 text-sm">
                      {contacts.map((contact, index) => (
                        <div key={index} className={index > 0 ? "border-t pt-2" : ""}>
                          {contact.name && (
                            <div className="font-medium flex items-center gap-1">
                              {contact.name}
                              {contact.role && (
                                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                                  {contact.role}
                                </span>
                              )}
                            </div>
                          )}
                          {contact.phone && (
                            <div className="mt-1 flex items-center gap-1">
                              <Phone className="h-3 w-3 text-gray-500" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                          {contact.email && (
                            <div className="mt-1 flex items-center gap-1">
                              <Mail className="h-3 w-3 text-gray-500" />
                              <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                                {contact.email}
                              </a>
                            </div>
                          )}

                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>
        )}
      </div>
    </div>
  );
};