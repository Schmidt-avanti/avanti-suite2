
// Diese Datei wird nicht ausgeführt, sie dient nur der Dokumentation
// Die SQL-Befehle wurden bereits in der vorherigen SQL-Migration ausgeführt
// und nun werden die RPC-Funktionen hinzugefügt

/*
-- Neue Tabelle für Chat-Sessions erstellen
CREATE TABLE IF NOT EXISTS public.whatsapp_chat_sessions (
  chat_id UUID NOT NULL REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id),
  CONSTRAINT whatsapp_chat_sessions_unique_chat UNIQUE (chat_id)
);

-- RLS aktivieren
ALTER TABLE public.whatsapp_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policy für Lesezugriff
CREATE POLICY "Chat sessions are visible to authenticated users" 
ON public.whatsapp_chat_sessions
FOR SELECT 
TO authenticated
USING (true);

-- Policy für Schreibzugriff
CREATE POLICY "Users can manage their own chat sessions" 
ON public.whatsapp_chat_sessions
FOR ALL 
TO authenticated
USING (auth.uid() = user_id);

-- Die RPC-Funktionen wurden durch direkten Zugriff auf die Tabelle ersetzt
-- Es werden keine RPC-Funktionen mehr benötigt
*/
