// src/lib/services/intelligentDialogService.ts

import { supabase as supabaseClient } from '@/lib/supabaseClient';

// Interface für die Nachrichten
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

// Interface für die Dialog-API-Antwort
interface DialogApiResponse {
  message: string;
  response_id: string;
  dialog_flow?: any;
  flow_extracted?: boolean;
}

/**
 * Service für die Kommunikation mit der Intelligent Dialog API
 */
export const intelligentDialogService = {
  /**
   * Sendet einen Chat an die Intelligent Dialog API
   * 
   * @param messages Die Chat-Nachrichten
   * @param previousResponseId Die ID der vorherigen Antwort (für Thread-Fortsetzung)
   * @param mode Der Modus (generate, refine, validate)
   * @param parameters Zusätzliche Parameter
   * @param customer Kundeninformationen (Name und Branche)
   * @returns Die API-Antwort mit Nachricht, Response-ID und ggf. Dialog-Flow
   */
  async sendChat(
    messages: ChatMessage[], 
    previousResponseId?: string,
    mode: 'generate' | 'refine' | 'validate' = 'generate',
    parameters: Record<string, any> = {},
    customer?: { name: string; industry?: string }
  ): Promise<DialogApiResponse> {
    try {
      // Nachrichten für die API vorbereiten
      const apiMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // API-Request erstellen
      const { data, error } = await supabaseClient.functions.invoke('intelligent-dialog-api', {
        body: {
          messages: apiMessages,
          previousResponseId,
          mode,
          parameters,
          customer
        }
      });

      if (error) {
        console.error('Fehler beim Aufruf der Edge Function:', error);
        throw new Error(`API-Fehler: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Fehler im intelligentDialogService:', error);
      throw error;
    }
  }
};
