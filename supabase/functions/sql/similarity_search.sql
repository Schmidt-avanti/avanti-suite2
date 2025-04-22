
-- Function to match similar use cases using vector similarity
CREATE OR REPLACE FUNCTION public.match_similar_use_cases(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  type text,
  information_needed text,
  steps text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uc.id,
    uc.title,
    uc.type,
    uc.information_needed,
    uc.steps,
    1 - (uc.embedding <=> query_embedding) as similarity
  FROM public.use_cases uc
  WHERE 1 - (uc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
