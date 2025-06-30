
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

export const EndkundeInfoDisplay: React.FC<EndkundeInfoLinkProps> = ({ endkundeId, customerId, taskTitle, taskSummary, onContactsLoaded }) => { 
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

  if (!endkundeId) {
    return (
      <div className="bg-white/90 rounded-xl shadow-md border border-gray-100 p-4 mt-4">
        <h3 className="text-md font-semibold text-gray-700 mb-2">Endkunde</h3>
        <p className="text-sm text-gray-500">Kein Endkunde dieser Aufgabe zugeordnet.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white/90 rounded-xl shadow-md border border-gray-100 p-4 mt-4">
        <h3 className="text-md font-semibold text-gray-700 mb-2">Endkunde</h3>
        <p className="text-sm text-gray-500 italic">Lade Endkunden-Informationen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/90 rounded-xl shadow-md border border-gray-100 p-4 mt-4">
        <h3 className="text-md font-semibold text-red-700 mb-2">Endkunde</h3>
        <p className="text-sm text-red-500">Fehler beim Laden: {error}</p>
      </div>
    );
  }

  if (!endkunde) {
    return (
      <div className="bg-white/90 rounded-xl shadow-md border border-gray-100 p-4 mt-4">
        <h3 className="text-md font-semibold text-gray-700 mb-2">Endkunde</h3>
        <p className="text-sm text-gray-500">Endkunden-Informationen nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/90 rounded-xl shadow-md border border-gray-100 p-4 mt-4">
      <h3 className="text-md font-semibold text-gray-800 mb-2">
        Endkunde: {endkunde.Vorname} {endkunde.Nachname}
      </h3>
      <div className="text-sm text-gray-600 space-y-1">
        <p>
          {endkunde.Adresse}
          {endkunde.Wohnung && `, ${endkunde.Wohnung}`}
          {endkunde.Gebäude && `, Geb. ${endkunde.Gebäude}`}
          {endkunde.Lage && `, ${endkunde.Lage}`}<br />
          {endkunde.Postleitzahl} {endkunde.Ort}
        </p>
      </div>

      {contactsLoading && <p className="text-xs text-gray-500 italic mt-3 pt-3 border-t border-gray-200">Lade Kontakte...</p>}
      {!contactsLoading && contacts.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Zuständiger Kontakt:</h4>
          {contacts.map((contact, index) => (
            <div key={index} className="text-sm text-gray-600 mb-1 flex flex-wrap items-center">
              {contact.role && <span className="font-semibold mr-1">{contact.role}:</span>}
              <span className="mr-2">{contact.name}</span>
              {contact.phone && 
                <a href={`tel:${contact.phone}`} className="mr-2 flex items-center text-blue-500 hover:underline">
                  <Phone size={14} className="mr-1" /> {contact.phone}
                </a>}
              {contact.email && 
                <a href={`mailto:${contact.email}`} className="flex items-center text-blue-500 hover:underline">
                  <Mail size={14} className="mr-1" /> {contact.email}
                </a>}
            </div>
          ))}
        </div>
      )}
      {!contactsLoading && contacts.length === 0 && endkunde && (
          <p className="text-xs text-gray-500 italic mt-3 pt-3 border-t border-gray-200">Kein spezifischer Hausmeisterkontakt für {endkunde.Ort} hinterlegt.</p>
      )}
    </div>
  );
};