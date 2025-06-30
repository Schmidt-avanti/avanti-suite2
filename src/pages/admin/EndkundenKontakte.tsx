import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import EndkundenKontakteList from '@/components/admin/EndkundenKontakteList';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

const EndkundenKontaktePage = () => {
  const { id: endkundeId } = useParams<{ id: string }>();
  const [endkundeName, setEndkundeName] = useState('');

  useEffect(() => {
    const fetchEndkundeName = async () => {
      if (!endkundeId) return;
      const { data, error } = await supabase
        .from('endkunden')
        .select('Vorname, Nachname')
        .eq('id', endkundeId)
        .single();
      
      if (data) {
        setEndkundeName(`${data.Vorname || ''} ${data.Nachname || ''}`.trim());
      }
    };
    fetchEndkundeName();
  }, [endkundeId]);

  return (
    <div>
      <Link to="/admin/endkunden" className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Zurück zur Endkunden-Übersicht
      </Link>
      <h1 className="text-2xl font-bold mb-4">Ansprechpartner für: {endkundeName}</h1>
      <EndkundenKontakteList />
    </div>
  );
};

export default EndkundenKontaktePage;
