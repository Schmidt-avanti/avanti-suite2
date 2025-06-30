import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialisiere Supabase-Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RefinementRequest {
  article: string;
  instruction: string;
  useCaseId?: string;
  metadata?: {
    industry?: string;
    customer?: string;
    [key: string]: any;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { article, instruction, useCaseId, metadata } = req.body as RefinementRequest;

  if (!article || !instruction) {
    return res.status(400).json({ error: 'Artikel und Anweisungen werden benötigt' });
  }

  try {
    // Debug-Informationen
    console.log('Sending to edge function refine-use-case:', { 
      articleLength: article?.length,
      instructionLength: instruction?.length,
      metadata
    });
    
    // Supabase Edge Function aufrufen
    const { data, error } = await supabase.functions.invoke('refine-use-case', {
      body: {
        article,
        instruction,
        metadata: metadata || {},
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      return res.status(500).json({ error: `Fehler beim Anpassen des Use Cases: ${error.message || error}` });
    }
    
    // Debug: Prüfen, ob die Antwort valide ist
    console.log('Edge function response:', { 
      hasData: !!data, 
      hasContent: data && !!data.content,
      contentLength: data?.content?.length
    });

    // Erfolgsfall - Rückgabe des verfeinerten Artikels
    return res.status(200).json({ content: data.content });
  } catch (error) {
    console.error('API route error:', error);
    return res.status(500).json({ error: 'Server-Fehler bei der Verarbeitung' });
  }
}
