
// Diese Datei wird nicht ausgeführt, sie dient nur der Dokumentation
// Die SQL-Befehle wurden bereits in der vorherigen SQL-Migration ausgeführt
// und nun werden die RPC-Funktionen hinzugefügt

/*
-- RPC-Funktion zum Abrufen einer Chat-Session
CREATE OR REPLACE FUNCTION public.get_chat_session(chat_id_param UUID)
RETURNS TABLE(user_id UUID) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT cs.user_id
  FROM public.whatsapp_chat_sessions cs
  WHERE cs.chat_id = chat_id_param;
END;
$$;

-- RPC-Funktion zum Erstellen einer Chat-Session
CREATE OR REPLACE FUNCTION public.create_chat_session(chat_id_param UUID, user_id_param UUID)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.whatsapp_chat_sessions (chat_id, user_id)
  VALUES (chat_id_param, user_id_param);
END;
$$;

-- RPC-Funktion zum Aktualisieren der last_activity einer Chat-Session
CREATE OR REPLACE FUNCTION public.update_chat_session(chat_id_param UUID, user_id_param UUID)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.whatsapp_chat_sessions
  SET last_activity = now()
  WHERE chat_id = chat_id_param AND user_id = user_id_param;
END;
$$;

-- RPC-Funktion zum Freigeben einer Chat-Session
CREATE OR REPLACE FUNCTION public.release_chat_session(chat_id_param UUID, user_id_param UUID)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.whatsapp_chat_sessions
  WHERE chat_id = chat_id_param AND user_id = user_id_param;
END;
$$;
*/
