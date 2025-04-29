
-- Function to match relevant knowledge articles using vector similarity
CREATE OR REPLACE FUNCTION public.match_relevant_knowledge_articles(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  customer_id_param uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ka.id,
    ka.title,
    ka.content,
    1 - (ka.embedding <=> query_embedding) as similarity
  FROM public.knowledge_articles ka
  WHERE 
    1 - (ka.embedding <=> query_embedding) > match_threshold
    AND ka.is_active = true
    -- Filter für den spezifischen Kunden
    AND (ka.customer_id = customer_id_param)
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
