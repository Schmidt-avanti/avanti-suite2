
-- Function to match similar use cases using vector similarity
-- This has been modified to improve matching with lower thresholds
CREATE OR REPLACE FUNCTION public.match_similar_use_cases(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  customer_id_param uuid DEFAULT NULL
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
  WHERE 
    1 - (uc.embedding <=> query_embedding) > match_threshold
    AND uc.type != 'knowledge_article'
    AND uc.is_active = true
    -- Only filter by customer_id if it's provided
    AND (customer_id_param IS NULL OR uc.customer_id = customer_id_param OR uc.customer_id IS NULL)
  ORDER BY 
    -- Special boost for newsletter-related use cases for newsletter queries
    CASE WHEN lower(uc.title) LIKE '%newsletter%' AND query_embedding[1] > 0.5 THEN 0.2 ELSE 0 END +
    -- Prioritize matches for the specific customer
    CASE WHEN uc.customer_id = customer_id_param THEN 0.1 ELSE 0 END +
    -- Then order by similarity score
    similarity DESC
  LIMIT match_count;
END;
$$;

-- Function to better match knowledge articles, especially for newsletter use cases
CREATE OR REPLACE FUNCTION public.match_relevant_knowledge_articles(
  query_embedding vector(1536),
  match_threshold float,
  match_count integer,
  customer_id_param uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  use_case_id uuid,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First try exact matching for newsletter keywords
  RETURN QUERY
  SELECT
    ka.id,
    ka.title,
    ka.content,
    ka.use_case_id,
    CASE 
      WHEN lower(ka.title) LIKE '%newsletter%' THEN 0.95
      ELSE 1 - (ka.embedding <=> query_embedding)
    END as similarity
  FROM public.knowledge_articles ka
  WHERE 
    ka.is_active = true
    -- Filter for the specific customer
    AND (ka.customer_id = customer_id_param)
    -- Either meets similarity threshold OR contains newsletter in title
    AND ((1 - (ka.embedding <=> query_embedding) > match_threshold) OR 
         (lower(ka.title) LIKE '%newsletter%'))
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
