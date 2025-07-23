

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'Unused product option related tables have been removed';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE OR REPLACE FUNCTION "public"."admin_populate_profile_emails"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Populate profile emails from auth.users table
  UPDATE public.profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.id = u.id AND p.email IS NULL;
END;
$$;


ALTER FUNCTION "public"."admin_populate_profile_emails"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_completed_times_for_customer"("customer_id_param" "uuid", "from_date_param" timestamp with time zone, "to_date_param" timestamp with time zone) RETURNS TABLE("date_day" "date", "total_minutes" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(tt.started_at) AS date_day,
    CAST(SUM(COALESCE(tt.duration_seconds, 0)) / 60 AS INTEGER) AS total_minutes
  FROM task_times tt
  JOIN tasks t ON tt.task_id = t.id
  WHERE 
    t.customer_id = customer_id_param
    AND tt.started_at >= from_date_param
    AND tt.started_at <= to_date_param
    AND tt.duration_seconds IS NOT NULL
    AND tt.duration_seconds > 0
  GROUP BY DATE(tt.started_at)
  ORDER BY date_day;
END;
$$;


ALTER FUNCTION "public"."calculate_completed_times_for_customer"("customer_id_param" "uuid", "from_date_param" timestamp with time zone, "to_date_param" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_task_total_duration"("task_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  total_seconds INTEGER;
BEGIN
  -- Sum all completed session durations
  SELECT COALESCE(SUM(duration_seconds), 0)
  INTO total_seconds
  FROM task_sessions
  WHERE task_sessions.task_id = calculate_task_total_duration.task_id
  AND duration_seconds IS NOT NULL;
  
  -- Update the tasks table with the total duration
  UPDATE tasks
  SET total_duration_seconds = total_seconds
  WHERE id = calculate_task_total_duration.task_id;
  
  RETURN total_seconds;
END;
$$;


ALTER FUNCTION "public"."calculate_task_total_duration"("task_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_total_time_for_customer"("customer_id_param" "uuid", "from_date_param" timestamp with time zone, "to_date_param" timestamp with time zone) RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  total_seconds BIGINT;
BEGIN
  -- Direct calculation with a cleaner query that handles NULLs
  SELECT COALESCE(SUM(COALESCE(tt.duration_seconds, 0)), 0)
  INTO total_seconds
  FROM task_times tt
  JOIN tasks t ON tt.task_id = t.id
  WHERE t.customer_id = customer_id_param
    AND tt.started_at >= from_date_param
    AND tt.started_at <= to_date_param;
  
  -- For debugging
  RAISE NOTICE 'Customer ID: %, Total seconds calculated: %', customer_id_param, total_seconds;
  
  RETURN total_seconds;
END;
$$;


ALTER FUNCTION "public"."calculate_total_time_for_customer"("customer_id_param" "uuid", "from_date_param" timestamp with time zone, "to_date_param" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_chat_session"("chat_id_param" "uuid", "user_id_param" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.whatsapp_chat_sessions (chat_id, user_id)
  VALUES (chat_id_param, user_id_param);
END;
$$;


ALTER FUNCTION "public"."create_chat_session"("chat_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification_for_email_reply"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  customer_name TEXT;
  task_title TEXT;
  task_readable_id TEXT;
BEGIN
  -- Nur fortfahren, wenn die Richtung 'inbound' ist (also eine Antwort vom Kunden)
  IF NEW.direction = 'inbound' THEN
    -- Die Aufgaben- und Kundeninformationen abrufen
    SELECT 
      t.title,
      t.readable_id,
      c.name
    INTO 
      task_title,
      task_readable_id,
      customer_name
    FROM tasks t
    JOIN customers c ON t.customer_id = c.id
    WHERE t.id = NEW.task_id;
    
    -- Benachrichtigungen für Administratoren erstellen
    INSERT INTO notifications (user_id, message, task_id)
    SELECT 
      p.id, 
      'Neue E-Mail-Antwort für Aufgabe ' || COALESCE(task_readable_id, '') || 
      ' von ' || NEW.sender, 
      NEW.task_id
    FROM profiles p
    WHERE p.role = 'admin'
    AND p.is_active = true;
    
    -- Benachrichtigungen für Agenten erstellen, die diesem Kunden zugewiesen sind
    INSERT INTO notifications (user_id, message, task_id)
    SELECT 
      uca.user_id, 
      'Neue E-Mail-Antwort für Aufgabe ' || COALESCE(task_readable_id, '') || 
      ' von ' || NEW.sender, 
      NEW.task_id
    FROM user_customer_assignments uca
    JOIN tasks t ON t.customer_id = uca.customer_id
    JOIN profiles p ON uca.user_id = p.id
    WHERE t.id = NEW.task_id
    AND p.is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_notification_for_email_reply"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification_for_email_task"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  customer_name TEXT;
BEGIN
  -- Nur fortfahren, wenn die Aufgabenquelle 'email' ist und der Status 'new'
  IF NEW.source = 'email' AND NEW.status = 'new' THEN
    -- Den Kundennamen abrufen
    SELECT name INTO customer_name FROM customers WHERE id = NEW.customer_id;
    
    -- Benachrichtigungen für Benutzer basierend auf Rollen und Zuweisungen erstellen
    -- Zuerst für Administratoren
    INSERT INTO notifications (user_id, message, task_id)
    SELECT p.id, 'Neue Aufgabe "' || NEW.title || '" via E-Mail von ' || COALESCE(customer_name, 'unbekannt') || ' eingegangen.', NEW.id
    FROM profiles p
    WHERE p.role = 'admin'
    AND p.is_active = true;
    
    -- Dann für Agenten, die diesem Kunden zugewiesen sind
    INSERT INTO notifications (user_id, message, task_id)
    SELECT uca.user_id, 'Neue Aufgabe "' || NEW.title || '" via E-Mail von ' || COALESCE(customer_name, 'unbekannt') || ' eingegangen.', NEW.id
    FROM user_customer_assignments uca
    JOIN profiles p ON uca.user_id = p.id
    WHERE uca.customer_id = NEW.customer_id
    AND p.is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_notification_for_email_task"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."product_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "product_id" "uuid",
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."product_options" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_product_option_with_version"("option_name" "text", "description" "text", "price_monthly" numeric, "price_once" numeric) RETURNS "public"."product_options"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_option product_options;
BEGIN
    -- Insert the new product option and return it into the new_option variable
    INSERT INTO public.product_options (name)
    VALUES (option_name)
    RETURNING * INTO new_option;

    -- Insert the first version for this new option - USING CORRECT COLUMN NAME option_id
    INSERT INTO public.product_option_versions (
        option_id,
        version,
        description,
        price_monthly,
        price_once,
        is_latest,
        is_active
    )
    VALUES (
        new_option.id,
        1, -- Initial version
        description,
        price_monthly,
        price_once,
        TRUE, -- This is the latest version by default
        TRUE  -- Active by default
    );

    -- Return the newly created product option
    RETURN new_option;
END;
$$;


ALTER FUNCTION "public"."create_product_option_with_version"("option_name" "text", "description" "text", "price_monthly" numeric, "price_once" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_product_option_with_version"("option_name" "text", "p_product_id" "uuid", "version_description" "text", "monthly_price" numeric, "once_price" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_option_id uuid;
BEGIN
    INSERT INTO public.product_options (name, product_id)
    VALUES (option_name, p_product_id)
    RETURNING id INTO new_option_id;

    -- CORRECT COLUMN NAME HERE: option_id instead of product_option_id
    UPDATE public.product_option_versions
    SET is_latest = false
    WHERE option_id = new_option_id AND is_latest = true;

    -- CORRECT COLUMN NAME HERE: option_id instead of product_option_id
    INSERT INTO public.product_option_versions (option_id, version, description, price_monthly, price_once, is_active, is_latest)
    VALUES (new_option_id, 
            COALESCE((SELECT MAX(version) FROM public.product_option_versions WHERE option_id = new_option_id), 0) + 1, 
            version_description, 
            monthly_price, 
            once_price, 
            true, 
            true);
END;
$$;


ALTER FUNCTION "public"."create_product_option_with_version"("option_name" "text", "p_product_id" "uuid", "version_description" "text", "monthly_price" numeric, "once_price" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_customer_times"("customer_id_param" "uuid", "from_date_param" timestamp with time zone, "to_date_param" timestamp with time zone) RETURNS TABLE("task_id" "uuid", "task_title" "text", "started_at" timestamp with time zone, "duration_seconds" integer, "user_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tt.task_id, 
    t.title, 
    tt.started_at, 
    tt.duration_seconds,
    tt.user_id
  FROM task_times tt
  JOIN tasks t ON tt.task_id = t.id
  WHERE t.customer_id = customer_id_param
    AND tt.started_at >= from_date_param
    AND tt.started_at <= to_date_param
  ORDER BY tt.started_at;
END;
$$;


ALTER FUNCTION "public"."debug_customer_times"("customer_id_param" "uuid", "from_date_param" timestamp with time zone, "to_date_param" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_customer_cascade"("customer_id_param" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Delete knowledge articles
  DELETE FROM knowledge_articles WHERE customer_id = customer_id_param;
  
  -- Delete use cases
  DELETE FROM use_cases WHERE customer_id = customer_id_param;
  
  -- Delete customer contacts
  DELETE FROM customer_contacts WHERE customer_id = customer_id_param;
  
  -- Delete customer tools
  DELETE FROM customer_tools WHERE customer_id = customer_id_param;
  
  -- Delete customer task counters
  DELETE FROM customer_task_counters WHERE customer_id = customer_id_param;
  
  -- Delete payment methods associated with this customer
  DELETE FROM payment_methods WHERE customer_id = customer_id_param;
  
  -- Delete WhatsApp accounts associated with this customer
  DELETE FROM whatsapp_accounts WHERE customer_id = customer_id_param;
  
  -- Delete user customer assignments
  DELETE FROM user_customer_assignments WHERE customer_id = customer_id_param;
  
  -- Handle tasks
  -- First delete related task data
  DELETE FROM task_messages WHERE task_id IN (SELECT id FROM tasks WHERE customer_id = customer_id_param);
  DELETE FROM task_activities WHERE task_id IN (SELECT id FROM tasks WHERE customer_id = customer_id_param);
  DELETE FROM task_times WHERE task_id IN (SELECT id FROM tasks WHERE customer_id = customer_id_param);
  DELETE FROM email_threads WHERE task_id IN (SELECT id FROM tasks WHERE customer_id = customer_id_param);
  
  -- Then delete the tasks themselves
  DELETE FROM tasks WHERE customer_id = customer_id_param;
  
  -- Finally delete the customer
  DELETE FROM customers WHERE id = customer_id_param;
END;
$$;


ALTER FUNCTION "public"."delete_customer_cascade"("customer_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_product_option"("p_option_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Erst die Versionen löschen
    DELETE FROM public.product_option_versions WHERE option_id = p_option_id;
    
    -- Dann die Option selbst löschen
    DELETE FROM public.product_options WHERE id = p_option_id;
END;
$$;


ALTER FUNCTION "public"."delete_product_option"("p_option_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_use_case_cascade"("use_case_id_param" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Update tasks to remove references to this use case
  UPDATE public.tasks
  SET matched_use_case_id = NULL
  WHERE matched_use_case_id = use_case_id_param;
  
  -- Update knowledge articles to remove references to this use case
  UPDATE public.knowledge_articles
  SET use_case_id = NULL
  WHERE use_case_id = use_case_id_param;
  
  -- Delete the use case itself
  DELETE FROM public.use_cases 
  WHERE id = use_case_id_param;
END;
$$;


ALTER FUNCTION "public"."delete_use_case_cascade"("use_case_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_avanti_email"("customer_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  base_email TEXT;
BEGIN
  -- Convert to lowercase
  base_email := lower(customer_name);
  
  -- Replace spaces with hyphens
  base_email := regexp_replace(base_email, '\s+', '-', 'g');
  
  -- Remove special characters (keep only alphanumeric and hyphens)
  base_email := regexp_replace(base_email, '[^a-z0-9\-]', '', 'g');
  
  -- Append domain
  base_email := base_email || '@inbox.avanti.cx';
  
  RETURN base_email;
END;
$$;


ALTER FUNCTION "public"."generate_avanti_email"("customer_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_customer_prefix"("customer_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  words TEXT[];
  prefix TEXT := '';
  word TEXT;
BEGIN
  -- Split the name into words
  words := regexp_split_to_array(upper(customer_name), '\s+');
  
  -- Take first letter of each word for up to 3 letters
  FOREACH word IN ARRAY words LOOP
    IF length(prefix) < 3 THEN
      prefix := prefix || left(word, 1);
    END IF;
  END LOOP;
  
  -- If we don't have at least 2 characters, pad with first letter
  WHILE length(prefix) < 2 LOOP
    prefix := prefix || left(words[1], 1);
  END LOOP;
  
  RETURN prefix;
END;
$$;


ALTER FUNCTION "public"."generate_customer_prefix"("customer_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_embedding"("input_text" "text") RETURNS "public"."vector"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- This is a placeholder function that will be called from code
  -- The actual embedding generation happens via OpenAI API
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."generate_embedding"("input_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_readable_task_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  customer_name TEXT;
  prefix TEXT;
  counter_val INTEGER;
BEGIN
  -- Get customer name
  SELECT name INTO customer_name FROM public.customers WHERE id = NEW.customer_id;
  
  -- Generate prefix or get existing one
  SELECT ctc.prefix, ctc.current_count + 1 
  INTO prefix, counter_val
  FROM public.customer_task_counters ctc
  WHERE ctc.customer_id = NEW.customer_id;
  
  IF NOT FOUND THEN
    -- Create new prefix and counter for this customer
    prefix := public.generate_customer_prefix(customer_name);
    counter_val := 1;
    
    INSERT INTO public.customer_task_counters (customer_id, prefix, current_count)
    VALUES (NEW.customer_id, prefix, counter_val);
  ELSE
    -- Update the counter
    UPDATE public.customer_task_counters 
    SET current_count = counter_val
    WHERE customer_id = NEW.customer_id;
  END IF;
  
  -- Format the readable ID (e.g., GBB000001)
  NEW.readable_id := prefix || LPAD(counter_val::TEXT, 6, '0');
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_readable_task_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_break_slots"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  active_slots INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_slots 
  FROM public.short_breaks 
  WHERE status = 'active' AND start_time >= (now() - interval '10 minutes');
  
  RETURN active_slots;
END;
$$;


ALTER FUNCTION "public"."get_active_break_slots"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_break_minutes"("user_id_param" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  total_minutes INTEGER;
  used_minutes INTEGER;
  daily_limit INTEGER;
BEGIN
  -- Get the daily limit from settings
  SELECT daily_minutes_per_agent INTO daily_limit
  FROM public.short_break_settings
  LIMIT 1;
  
  -- Calculate how many minutes the user has already used today
  SELECT COALESCE(SUM(duration) / 60, 0) INTO used_minutes
  FROM public.short_breaks
  WHERE user_id = user_id_param
    AND date_trunc('day', start_time) = date_trunc('day', now())
    AND (status = 'completed' OR status = 'active');
  
  -- Return available minutes
  RETURN GREATEST(0, daily_limit - used_minutes);
END;
$$;


ALTER FUNCTION "public"."get_available_break_minutes"("user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_chat_session"("chat_id_param" "uuid") RETURNS TABLE("user_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT cs.user_id
  FROM public.whatsapp_chat_sessions cs
  WHERE cs.chat_id = chat_id_param;
END;
$$;


ALTER FUNCTION "public"."get_chat_session"("chat_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_system_settings"() RETURNS TABLE("key" "text", "value" "text", "description" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if the user has permission to read system settings
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: only admins can read system settings';
  END IF;
  
  RETURN QUERY
  SELECT 
    system_settings.key,
    system_settings.value,
    system_settings.description
  FROM 
    public.system_settings;
END;
$$;


ALTER FUNCTION "public"."get_system_settings"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_system_settings"() IS 'Securely access system settings (admin only)';



CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(role, 'customer') FROM public.profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_deleted_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."handle_deleted_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_call"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- If the call is linked to a task, update the task with call information
  IF NEW.task_id IS NOT NULL THEN
    UPDATE tasks SET
      updated_at = NOW()
    WHERE id = NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_call"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_inbound_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  customer_id UUID;
  system_user_id UUID;
  task_id UUID;
BEGIN
  -- Try to match the email to a customer
  customer_id := public.match_email_to_customer(NEW.from_email);
  
  -- Get system user ID (first admin user)
  SELECT id INTO system_user_id
  FROM profiles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;

  -- Only create task if we found a matching customer
  IF customer_id IS NOT NULL THEN
    INSERT INTO tasks (
      title,
      description,
      status,
      customer_id,
      created_by,
      source,
      endkunde_email,
      source_email_id  -- Store the reference to the inbound email
    ) VALUES (
      COALESCE(NEW.subject, 'Email ohne Betreff'),
      COALESCE(NEW.body_text, NEW.body_html),
      'new',
      customer_id,
      system_user_id,
      'email',
      NEW.from_email,
      NEW.id
    )
    RETURNING id INTO task_id;
  END IF;

  -- Mark email as processed
  NEW.processed := TRUE;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_inbound_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_product_option_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.product_option_versions
  SET is_latest = false
  WHERE option_id = NEW.option_id AND id != NEW.id;
  
  NEW.is_latest = true;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_product_option_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_session"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Simply return NEW without attempting to track sessions
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_session"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    "Full Name", 
    role,
    email,
    is_active
  ) VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'Full Name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::text,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'is_active')::boolean, true)
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_email_to_customer"("email_address" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  matched_customer_id UUID;
BEGIN
  -- First try to match against avanti_email (highest priority)
  SELECT id INTO matched_customer_id
  FROM customers
  WHERE avanti_email = email_address
  LIMIT 1;
  
  -- If no match found, try to match against customer email directly
  IF matched_customer_id IS NULL THEN
    SELECT id INTO matched_customer_id
    FROM customers
    WHERE email = email_address
    LIMIT 1;
  END IF;

  -- If still no direct match, try to match against contact persons
  IF matched_customer_id IS NULL THEN
    SELECT customer_id INTO matched_customer_id
    FROM customer_contacts
    WHERE email = email_address
    LIMIT 1;
  END IF;

  RETURN matched_customer_id;
END;
$$;


ALTER FUNCTION "public"."match_email_to_customer"("email_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_relevant_knowledge_articles"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "customer_id_param" "uuid") RETURNS TABLE("id" "uuid", "title" "text", "content" "text", "similarity" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."match_relevant_knowledge_articles"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "customer_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_similar_use_cases"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("id" "uuid", "title" "text", "type" "text", "information_needed" "text", "steps" "text", "similarity" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
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
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_similar_use_cases"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_similar_use_cases"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "customer_id_param" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "title" "text", "type" "text", "information_needed" "text", "steps" "text", "similarity" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
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
    -- Prioritize matches for the specific customer
    CASE WHEN uc.customer_id = customer_id_param THEN 1 ELSE 0 END DESC,
    -- Then order by similarity score
    similarity DESC
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_similar_use_cases"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "customer_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_task_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  customer_name TEXT;
  assignee_name TEXT;
  status_text TEXT;
BEGIN
  -- Nur fortfahren, wenn sich der Status geändert hat
  IF NEW.status != OLD.status THEN
    -- Den Kundennamen abrufen
    SELECT name INTO customer_name FROM customers WHERE id = NEW.customer_id;
    
    -- Status in lesbaren Text umwandeln
    CASE NEW.status
      WHEN 'new' THEN status_text := 'Neu';
      WHEN 'in_progress' THEN status_text := 'In Bearbeitung';
      WHEN 'followup' THEN status_text := 'Auf Wiedervorlage';
      WHEN 'completed' THEN status_text := 'Abgeschlossen';
      ELSE status_text := NEW.status;
    END CASE;
    
    -- Benachrichtigungen erstellen für den Ersteller und zugewiesene Benutzer
    -- Wenn es einen Ersteller gibt und dieser nicht derselbe ist wie der, der die Änderung vorgenommen hat
    IF NEW.created_by IS NOT NULL AND NEW.created_by != auth.uid() THEN
      INSERT INTO notifications (user_id, message, task_id)
      VALUES (
        NEW.created_by,
        'Status der Aufgabe "' || NEW.title || '" wurde zu "' || status_text || '" geändert.',
        NEW.id
      );
    END IF;
    
    -- Für Agenten, die diesem Kunden zugewiesen sind
    INSERT INTO notifications (user_id, message, task_id)
    SELECT uca.user_id, 'Status der Aufgabe "' || NEW.title || '" wurde zu "' || status_text || '" geändert.', NEW.id
    FROM user_customer_assignments uca
    JOIN profiles p ON uca.user_id = p.id
    WHERE uca.customer_id = NEW.customer_id
    AND p.is_active = true
    AND uca.user_id != auth.uid(); -- Nicht den Benutzer benachrichtigen, der die Änderung vorgenommen hat
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_task_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_session"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_id_var UUID;
BEGIN
  -- Get the current user ID safely
  user_id_var := auth.uid();
  
  -- Only proceed if we have a valid user ID
  IF user_id_var IS NOT NULL THEN
    INSERT INTO public.user_sessions(user_id, last_seen)
    VALUES (user_id_var, now())
    ON CONFLICT (user_id)
    DO UPDATE SET last_seen = now();
  END IF;
  
  -- Add proper error handling
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in refresh_session: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."refresh_session"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_chat_session"("chat_id_param" "uuid", "user_id_param" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.whatsapp_chat_sessions
  WHERE chat_id = chat_id_param AND user_id = user_id_param;
END;
$$;


ALTER FUNCTION "public"."release_chat_session"("chat_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_email_to_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_user_email_to_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_all_task_durations"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  updated_count INTEGER := 0;
  t_id UUID;
BEGIN
  FOR t_id IN SELECT DISTINCT task_id FROM task_sessions
  LOOP
    PERFORM calculate_task_total_duration(t_id);
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$;


ALTER FUNCTION "public"."update_all_task_durations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_chat_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.whatsapp_chats
  SET 
    last_message = NEW.content,
    last_message_time = NEW.sent_at,
    unread_count = CASE 
      WHEN NEW.is_from_me THEN 0
      ELSE unread_count + 1
    END
  WHERE id = NEW.chat_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_chat_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_chat_session"("chat_id_param" "uuid", "user_id_param" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.whatsapp_chat_sessions
  SET last_activity = now()
  WHERE chat_id = chat_id_param AND user_id = user_id_param;
END;
$$;


ALTER FUNCTION "public"."update_chat_session"("chat_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_product_option_version"("p_option_id" "uuid", "p_description" "text", "p_price_monthly" numeric, "p_price_once" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Alte Version deaktivieren
    UPDATE public.product_option_versions
    SET is_latest = false
    WHERE option_id = p_option_id AND is_latest = true;
    
    -- Neue Version erstellen
    INSERT INTO public.product_option_versions (
        option_id,
        version,
        description,
        price_monthly,
        price_once,
        is_latest,
        is_active
    )
    VALUES (
        p_option_id,
        COALESCE((SELECT MAX(version) FROM public.product_option_versions WHERE option_id = p_option_id), 0) + 1,
        p_description,
        p_price_monthly,
        p_price_once,
        TRUE,
        TRUE
    );
END;
$$;


ALTER FUNCTION "public"."update_product_option_version"("p_option_id" "uuid", "p_description" "text", "p_price_monthly" numeric, "p_price_once" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_duration_on_session_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_task_total_duration(OLD.task_id);
  ELSE
    PERFORM calculate_task_total_duration(NEW.task_id);
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_task_duration_on_session_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_session_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_task_session_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_time_spent"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    latest_total INTEGER;
BEGIN
    -- Get the latest total time_spent_task for this task
    SELECT COALESCE(time_spent_task, 0) INTO latest_total
    FROM public.task_times
    WHERE task_id = NEW.task_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- For new records or updates with duration
    IF NEW.duration_seconds IS NOT NULL THEN
        -- Simply add the new duration to the latest total
        NEW.time_spent_task := latest_total + NEW.duration_seconds;
    ELSE
        -- For tracking sessions with no duration yet, just use the latest total
        NEW.time_spent_task := latest_total;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_task_time_spent"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_total_duration"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update the total_duration_seconds in the tasks table
  UPDATE tasks
  SET total_duration_seconds = (
    SELECT COALESCE(SUM(duration_seconds), 0)
    FROM task_sessions
    WHERE task_id = NEW.task_id
  )
  WHERE id = NEW.task_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_task_total_duration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_customer_access"("customer_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Admin users have access to all customers
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;

  -- Agents have access to assigned customers
  RETURN EXISTS (
    SELECT 1 FROM user_customer_assignments
    WHERE user_id = auth.uid() 
    AND customer_id = customer_id_param
  );
END;
$$;


ALTER FUNCTION "public"."user_has_customer_access"("customer_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."auth_users_view" AS
 SELECT "users"."id",
    "users"."email",
    "users"."email_confirmed_at",
    "users"."last_sign_in_at",
    "users"."created_at"
   FROM "auth"."users";


ALTER TABLE "public"."auth_users_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    "agent_id" "uuid",
    "customer_id" "uuid",
    "call_sid" "text",
    "status" "text" NOT NULL,
    "direction" "text" NOT NULL,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "duration_seconds" integer,
    "recording_url" "text",
    "call_notes" "text",
    "endkunde_id" "uuid",
    "endkunde_phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "twilio_phone_number_id" "uuid"
);


ALTER TABLE "public"."call_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "position" "text",
    "is_main" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_documents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "document_type" character varying(50) NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "file_type" character varying(100) NOT NULL,
    "storage_path" "text" NOT NULL,
    "url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp with time zone,
    "updated_by" "uuid"
);


ALTER TABLE "public"."customer_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "product_number" "text" NOT NULL,
    "product_version" integer NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_task_counters" (
    "customer_id" "uuid" NOT NULL,
    "prefix" "text" NOT NULL,
    "current_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."customer_task_counters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_tools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "task_management" "text",
    "knowledge_base" "text",
    "crm" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_tools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "industry" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "street" "text",
    "zip" "text",
    "city" "text",
    "has_invoice_address" boolean DEFAULT false,
    "invoice_street" "text",
    "invoice_zip" "text",
    "invoice_city" "text",
    "email" "text",
    "branch" "text",
    "billing_email" "text",
    "billing_address" "text",
    "contact_person" "text",
    "cost_center" "text",
    "avanti_email" "text",
    "csm_email" "text",
    "schwungrad_mail" "text",
    "is_schwungrad_by_csm_active" boolean DEFAULT true,
    "address_addition" "text",
    "invoice_address_addition" "text",
    "billing_interval" "text",
    "product" "text",
    "products" "text"[],
    "options" "text"[],
    "start_date" "date",
    "contract_type" "text",
    "invoice_contact_name" "text",
    "invoice_email" "text",
    "country" "text" DEFAULT 'Deutschland'::"text",
    "invoice_country" "text"
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."customers"."csm_email" IS 'E-Mail des zuständigen Customer Success Managers.';



COMMENT ON COLUMN "public"."customers"."schwungrad_mail" IS 'E-Mail des direkten Kundenansprechpartners für "Schwungrad"-Fälle.';



COMMENT ON COLUMN "public"."customers"."is_schwungrad_by_csm_active" IS 'Zeigt an, ob der "Schwungrad"-Prozess primär über den CSM läuft (TRUE) oder über die schwungrad_mail (FALSE).';



CREATE TABLE IF NOT EXISTS "public"."dev_task_attachments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "size" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."dev_task_attachments" OWNER TO "postgres";


COMMENT ON TABLE "public"."dev_task_attachments" IS 'Anhänge für Development-Tasks, gespeichert im Supabase Storage';



CREATE TABLE IF NOT EXISTS "public"."dev_task_audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" character varying NOT NULL,
    "previous_value" "jsonb",
    "new_value" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dev_task_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dev_task_comments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."dev_task_comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."dev_task_comments" IS 'Kommentare zu Development-Tasks';



CREATE TABLE IF NOT EXISTS "public"."dev_task_tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dev_task_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."dev_task_tags" IS 'Tags für Development-Tasks';



CREATE TABLE IF NOT EXISTS "public"."dev_task_to_tags" (
    "task_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."dev_task_to_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."dev_task_to_tags" IS 'Verknüpfung zwischen Development-Tasks und Tags';



CREATE TABLE IF NOT EXISTS "public"."dev_tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "priority" "text" NOT NULL,
    "status" "text" NOT NULL,
    "due_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "dev_tasks_category_check" CHECK (("category" = ANY (ARRAY['critical_bug'::"text", 'bug'::"text", 'feature'::"text"]))),
    CONSTRAINT "dev_tasks_priority_check" CHECK (("priority" = ANY (ARRAY['high'::"text", 'medium'::"text", 'low'::"text"]))),
    CONSTRAINT "dev_tasks_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'planned'::"text", 'in_progress'::"text", 'testing'::"text", 'done'::"text", 'archived'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."dev_tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."dev_tasks" IS 'Tabelle für Development-Tasks im Admin-Kanban-Board';



CREATE TABLE IF NOT EXISTS "public"."email_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "subject" "text",
    "direction" "text" NOT NULL,
    "sender" "text" NOT NULL,
    "recipient" "text" NOT NULL,
    "content" "text" NOT NULL,
    "attachments" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "thread_id" "text",
    "reply_to_id" "uuid",
    "message_id" "text",
    CONSTRAINT "email_threads_direction_check" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"])))
);


ALTER TABLE "public"."email_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."endkunden" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "external_ID" "text",
    "Nachname" "text" NOT NULL,
    "Vorname" "text",
    "Adresse" "text" NOT NULL,
    "Postleitzahl" "text",
    "Ort" "text",
    "Wohnung" "text",
    "Gebäude" "text",
    "Lage" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "customer_ID" "uuid",
    "endkunden_contacts" "uuid",
    "Rufnummer" "text"
);


ALTER TABLE "public"."endkunden" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."endkunden_contacts" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "text",
    "name" "text",
    "email" "text",
    "phone" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid"
);


ALTER TABLE "public"."endkunden_contacts" OWNER TO "postgres";


COMMENT ON TABLE "public"."endkunden_contacts" IS 'Contacts for endkunden';



CREATE TABLE IF NOT EXISTS "public"."inbound_emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "from_email" "text" NOT NULL,
    "from_name" "text",
    "to_emails" "text"[] NOT NULL,
    "subject" "text",
    "body_text" "text",
    "body_html" "text",
    "attachments" "jsonb",
    "message_id" "text",
    "raw_headers" "text",
    "processed" boolean DEFAULT false NOT NULL,
    "reference_ids" "text",
    "in_reply_to" "text"
);


ALTER TABLE "public"."inbound_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "use_case_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "response_id" "text",
    "metadata" "jsonb"
);


ALTER TABLE "public"."knowledge_articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."new_use_cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text"[],
    "version" integer DEFAULT 1 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "goal" "text",
    "steps" "jsonb" NOT NULL,
    "exceptions" "text"[],
    "final_comment" "text",
    "embedding" "public"."vector"(1536),
    "audit_log" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text",
    "knowledge" "jsonb"
);


ALTER TABLE "public"."new_use_cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "task_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_at" timestamp with time zone
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."opening_hours" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "weekdays" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."opening_hours" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."outbound_times" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "minutes" integer NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "outbound_times_minutes_check" CHECK (("minutes" > 0))
);


ALTER TABLE "public"."outbound_times" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "value" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_used" timestamp with time zone,
    "active" boolean DEFAULT true NOT NULL,
    "card_holder" "text",
    "expiry_month" integer,
    "expiry_year" integer,
    "billing_address" "text",
    "billing_zip" "text",
    "billing_city" "text",
    "customer_id" "uuid",
    CONSTRAINT "credit_card_fields_check" CHECK (((("type" = 'creditcard'::"text") AND ("card_holder" IS NOT NULL) AND ("expiry_month" IS NOT NULL) AND ("expiry_year" IS NOT NULL)) OR ("type" = 'paypal'::"text"))),
    CONSTRAINT "payment_methods_expiry_month_check" CHECK ((("expiry_month" >= 1) AND ("expiry_month" <= 12))),
    CONSTRAINT "payment_methods_expiry_year_check" CHECK ((("expiry_year")::numeric >= EXTRACT(year FROM CURRENT_DATE))),
    CONSTRAINT "payment_methods_type_check" CHECK (("type" = ANY (ARRAY['paypal'::"text", 'creditcard'::"text"])))
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_option_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "option_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "description" "text",
    "price_monthly" numeric(10,2) DEFAULT 0.00,
    "price_once" numeric(10,2) DEFAULT 0.00,
    "is_active" boolean DEFAULT true,
    "is_latest" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_option_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_number" "text" NOT NULL,
    "version" integer NOT NULL,
    "name" "text" NOT NULL,
    "minutes" integer NOT NULL,
    "opening_hours_id" "uuid",
    "monthly_fee" numeric(10,2) NOT NULL,
    "setup_fee" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "valid_from" "date",
    "valid_to" "date",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "outbound_hours" integer DEFAULT 20 NOT NULL
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "Full Name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "email" "text",
    "twilio_worker_sid" "text",
    "twilio_worker_attributes" "jsonb" DEFAULT '{}'::"jsonb",
    "voice_status" "text" DEFAULT 'offline'::"text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'agent'::"text", 'customer'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prompt_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    CONSTRAINT "prompt_templates_type_check" CHECK ((("type" IS NULL) OR ("type" = ANY (ARRAY['knowledge_request'::"text", 'forwarding_use_case'::"text", 'direct_use_case'::"text"]))))
);


ALTER TABLE "public"."prompt_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."short_break_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "max_slots" integer DEFAULT 5 NOT NULL,
    "daily_minutes_per_agent" integer DEFAULT 20 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."short_break_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."short_breaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_time" timestamp with time zone,
    "duration" integer,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."short_breaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."step_library" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "template" "jsonb",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."step_library" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supervisor_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "text" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."supervisor_messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."supervisor_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_settings" IS 'Stores system-wide settings including API keys and configuration values';



CREATE TABLE IF NOT EXISTS "public"."task_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "status_from" "text",
    "status_to" "text",
    "user_id" "uuid" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "task_activities_action_check" CHECK (("action" = ANY (ARRAY['create'::"text", 'open'::"text", 'close'::"text", 'status_change'::"text"])))
);


ALTER TABLE "public"."task_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "previous_message_id" "uuid",
    CONSTRAINT "task_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."task_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_time" timestamp with time zone,
    "duration_seconds" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_times" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "duration_seconds" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "time_spent_task" integer,
    "session_type" "text" DEFAULT 'working'::"text"
);


ALTER TABLE "public"."task_times" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."task_time_summary" AS
 SELECT "task_times"."task_id",
    "task_times"."user_id",
    "count"("task_times"."id") AS "session_count",
    "sum"(COALESCE("task_times"."duration_seconds", 0)) AS "total_seconds",
    (("sum"(COALESCE("task_times"."duration_seconds", 0)))::numeric / (3600)::numeric) AS "total_hours"
   FROM "public"."task_times"
  GROUP BY "task_times"."task_id", "task_times"."user_id";


ALTER TABLE "public"."task_time_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_workflow_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "use_case_id" "uuid" NOT NULL,
    "workflow_data" "jsonb",
    "completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_workflow_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "created_by" "uuid",
    "assigned_to" "uuid",
    "customer_id" "uuid" NOT NULL,
    "matched_use_case_id" "uuid",
    "match_confidence" double precision,
    "match_reasoning" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text",
    "endkunde_email" "text",
    "attachments" "jsonb",
    "source_email_id" "uuid",
    "forwarded_to" "text",
    "follow_up_date" timestamp with time zone,
    "closing_comment" "text",
    "readable_id" "text",
    "endkunde_id" "uuid",
    "processed_no_use_case" boolean,
    "total_time_seconds" integer DEFAULT 0,
    "total_duration_seconds" integer DEFAULT 0,
    "last_reminder_sent_at" timestamp with time zone,
    "reminder_count" integer DEFAULT 0 NOT NULL,
    "awaiting_customer_since" timestamp with time zone,
    "is_blank_task" boolean DEFAULT false,
    "last_message_at" timestamp with time zone,
    "last_message_id" "uuid",
    "openai_response_id" "text",
    "followup_note" "text",
    CONSTRAINT "tasks_source_check" CHECK (("source" = ANY (ARRAY['email'::"text", 'phone'::"text", 'manual'::"text", 'api'::"text", 'inbound'::"text", 'outbound'::"text", 'chat'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tasks"."forwarded_to" IS 'Indicates if the task has been forwarded to another team (e.g., KVP) when no use case is matched';



COMMENT ON COLUMN "public"."tasks"."last_reminder_sent_at" IS 'Zeitstempel der letzten gesendeten Erinnerung im Schwungrad-Prozess.';



COMMENT ON COLUMN "public"."tasks"."reminder_count" IS 'Anzahl der gesendeten Erinnerungen im Schwungrad-Prozess.';



COMMENT ON COLUMN "public"."tasks"."awaiting_customer_since" IS 'Zeitstempel, seit wann die Aufgabe im Schwungrad-Prozess auf Kundenrückmeldung wartet.';



CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" character varying NOT NULL,
    "title" character varying NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."twilio_phone_numbers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone_number" "text" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "friendly_name" "text" NOT NULL,
    "twilio_sid" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."twilio_phone_numbers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."use_cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "type" "text",
    "title" "text" NOT NULL,
    "information_needed" "text",
    "steps" "text",
    "typical_activities" "text",
    "expected_result" "text",
    "chat_response" "jsonb",
    "next_question" "text",
    "process_map" "jsonb",
    "decision_logic" "jsonb"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "is_active" boolean DEFAULT true,
    "embedding" "public"."vector"(1536),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "response_id" "text",
    CONSTRAINT "use_cases_type_check" CHECK (("type" = ANY (ARRAY['knowledge_request'::"text", 'forwarding_use_case'::"text", 'direct_use_case'::"text"])))
);


ALTER TABLE "public"."use_cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_chats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "receiver_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_status" boolean DEFAULT false NOT NULL,
    CONSTRAINT "user_chats_not_self" CHECK (("sender_id" <> "receiver_id"))
);


ALTER TABLE "public"."user_chats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_customer_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_customer_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "remind_at" timestamp with time zone,
    "completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "last_seen" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" DEFAULT "gen_random_uuid"(),
    "name" "text",
    "pphone_number" "text",
    "api_key" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone
);


ALTER TABLE "public"."whatsapp_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_chat_sessions" (
    "chat_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "last_activity" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."whatsapp_chat_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_chats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "contact_name" "text" NOT NULL,
    "contact_number" "text" NOT NULL,
    "last_message" "text",
    "last_message_time" timestamp with time zone,
    "unread_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."whatsapp_chats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_inbound_webhooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_number" "text" NOT NULL,
    "body" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."whatsapp_inbound_webhooks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chat_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "is_from_me" boolean DEFAULT false NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_at" timestamp with time zone
);


ALTER TABLE "public"."whatsapp_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_deviations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "use_case_id" "uuid" NOT NULL,
    "deviation_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."workflow_deviations" OWNER TO "postgres";


ALTER TABLE ONLY "public"."call_sessions"
    ADD CONSTRAINT "call_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_contacts"
    ADD CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_documents"
    ADD CONSTRAINT "customer_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_products"
    ADD CONSTRAINT "customer_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_task_counters"
    ADD CONSTRAINT "customer_task_counters_pkey" PRIMARY KEY ("customer_id");



ALTER TABLE ONLY "public"."customer_tools"
    ADD CONSTRAINT "customer_tools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dev_task_attachments"
    ADD CONSTRAINT "dev_task_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dev_task_audit_logs"
    ADD CONSTRAINT "dev_task_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dev_task_comments"
    ADD CONSTRAINT "dev_task_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dev_task_tags"
    ADD CONSTRAINT "dev_task_tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."dev_task_tags"
    ADD CONSTRAINT "dev_task_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dev_task_to_tags"
    ADD CONSTRAINT "dev_task_to_tags_pkey" PRIMARY KEY ("task_id", "tag_id");



ALTER TABLE ONLY "public"."dev_tasks"
    ADD CONSTRAINT "dev_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_threads"
    ADD CONSTRAINT "email_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."endkunden_contacts"
    ADD CONSTRAINT "endkunden_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."endkunden"
    ADD CONSTRAINT "endkunden_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inbound_emails"
    ADD CONSTRAINT "inbound_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_articles"
    ADD CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."new_use_cases"
    ADD CONSTRAINT "new_use_cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "one_payment_method_per_customer" UNIQUE ("customer_id");



ALTER TABLE ONLY "public"."opening_hours"
    ADD CONSTRAINT "opening_hours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."outbound_times"
    ADD CONSTRAINT "outbound_times_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_option_versions"
    ADD CONSTRAINT "product_option_versions_option_id_version_key" UNIQUE ("option_id", "version");



ALTER TABLE ONLY "public"."product_option_versions"
    ADD CONSTRAINT "product_option_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_options"
    ADD CONSTRAINT "product_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_product_number_version_key" UNIQUE ("product_number", "version");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prompt_templates"
    ADD CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."short_break_settings"
    ADD CONSTRAINT "short_break_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."short_breaks"
    ADD CONSTRAINT "short_breaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."step_library"
    ADD CONSTRAINT "step_library_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supervisor_messages"
    ADD CONSTRAINT "supervisor_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_activities"
    ADD CONSTRAINT "task_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_messages"
    ADD CONSTRAINT "task_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_sessions"
    ADD CONSTRAINT "task_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_times"
    ADD CONSTRAINT "task_times_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_workflow_progress"
    ADD CONSTRAINT "task_workflow_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."twilio_phone_numbers"
    ADD CONSTRAINT "twilio_phone_numbers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."use_cases"
    ADD CONSTRAINT "use_cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_chats"
    ADD CONSTRAINT "user_chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_customer_assignments"
    ADD CONSTRAINT "user_customer_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_customer_assignments"
    ADD CONSTRAINT "user_customer_assignments_user_id_customer_id_key" UNIQUE ("user_id", "customer_id");



ALTER TABLE ONLY "public"."user_reminders"
    ADD CONSTRAINT "user_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."whatsapp_accounts"
    ADD CONSTRAINT "whatsapp_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_chat_sessions"
    ADD CONSTRAINT "whatsapp_chat_sessions_unique_chat" PRIMARY KEY ("chat_id");



ALTER TABLE ONLY "public"."whatsapp_chats"
    ADD CONSTRAINT "whatsapp_chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_inbound_webhooks"
    ADD CONSTRAINT "whatsapp_inbound_webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_deviations"
    ADD CONSTRAINT "workflow_deviations_pkey" PRIMARY KEY ("id");



CREATE INDEX "email_threads_created_at_idx" ON "public"."email_threads" USING "btree" ("created_at");



CREATE INDEX "email_threads_task_id_idx" ON "public"."email_threads" USING "btree" ("task_id");



CREATE INDEX "idx_customer_documents_customer_id" ON "public"."customer_documents" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_documents_document_type" ON "public"."customer_documents" USING "btree" ("document_type");



CREATE INDEX "idx_new_use_cases_customer_id" ON "public"."new_use_cases" USING "btree" ("customer_id");



CREATE INDEX "idx_new_use_cases_embedding" ON "public"."new_use_cases" USING "ivfflat" ("embedding" "public"."vector_cosine_ops");



CREATE INDEX "idx_notifications_read_at" ON "public"."notifications" USING "btree" ("read_at");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_outbound_times_customer_date" ON "public"."outbound_times" USING "btree" ("customer_id", "date");



CREATE INDEX "idx_task_sessions_start_time" ON "public"."task_sessions" USING "btree" ("start_time");



CREATE INDEX "idx_task_sessions_task_id" ON "public"."task_sessions" USING "btree" ("task_id");



CREATE INDEX "idx_task_sessions_user_id" ON "public"."task_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_task_times_task_id" ON "public"."task_times" USING "btree" ("task_id");



CREATE INDEX "idx_task_times_user_id" ON "public"."task_times" USING "btree" ("user_id");



CREATE INDEX "idx_tasks_readable_id" ON "public"."tasks" USING "btree" ("readable_id");



CREATE INDEX "idx_tasks_source_email_id" ON "public"."tasks" USING "btree" ("source_email_id");



CREATE INDEX "idx_whatsapp_chats_account_id" ON "public"."whatsapp_chats" USING "btree" ("account_id");



CREATE INDEX "idx_whatsapp_messages_chat_id" ON "public"."whatsapp_messages" USING "btree" ("chat_id");



CREATE INDEX "profiles_email_idx" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "system_settings_key_idx" ON "public"."system_settings" USING "btree" ("key");



CREATE INDEX "twilio_phone_numbers_customer_id_idx" ON "public"."twilio_phone_numbers" USING "btree" ("customer_id");



CREATE INDEX "twilio_phone_numbers_phone_number_idx" ON "public"."twilio_phone_numbers" USING "btree" ("phone_number");



CREATE OR REPLACE TRIGGER "create_notification_for_email_reply_trigger" AFTER INSERT ON "public"."email_threads" FOR EACH ROW EXECUTE FUNCTION "public"."create_notification_for_email_reply"();



CREATE OR REPLACE TRIGGER "create_notification_for_email_task_trigger" AFTER INSERT ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."create_notification_for_email_task"();



CREATE OR REPLACE TRIGGER "email_reply_notification_trigger" AFTER INSERT ON "public"."email_threads" FOR EACH ROW EXECUTE FUNCTION "public"."create_notification_for_email_reply"();



CREATE OR REPLACE TRIGGER "generate_task_readable_id" BEFORE INSERT ON "public"."tasks" FOR EACH ROW WHEN (("new"."readable_id" IS NULL)) EXECUTE FUNCTION "public"."generate_readable_task_id"();



CREATE OR REPLACE TRIGGER "handle_new_email" BEFORE UPDATE ON "public"."inbound_emails" FOR EACH ROW WHEN ((("old"."processed" = false) AND ("new"."processed" = false))) EXECUTE FUNCTION "public"."handle_new_inbound_email"();

ALTER TABLE "public"."inbound_emails" DISABLE TRIGGER "handle_new_email";



CREATE OR REPLACE TRIGGER "notify_task_status_change_trigger" AFTER UPDATE ON "public"."tasks" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."notify_task_status_change"();



CREATE OR REPLACE TRIGGER "on_call_created" AFTER INSERT ON "public"."call_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_call"();



CREATE OR REPLACE TRIGGER "on_new_inbound_email" BEFORE INSERT ON "public"."inbound_emails" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_inbound_email"();

ALTER TABLE "public"."inbound_emails" DISABLE TRIGGER "on_new_inbound_email";



CREATE OR REPLACE TRIGGER "on_new_product_option_version" BEFORE INSERT ON "public"."product_option_versions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_product_option_version"();



CREATE OR REPLACE TRIGGER "set_endkunden_updated_at" BEFORE UPDATE ON "public"."endkunden" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_payment_methods_updated_at" BEFORE UPDATE ON "public"."payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp" BEFORE UPDATE ON "public"."user_chats" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "set_twilio_phone_numbers_updated_at" BEFORE UPDATE ON "public"."twilio_phone_numbers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."knowledge_articles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_use_cases_updated_at" BEFORE UPDATE ON "public"."use_cases" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "set_whatsapp_chats_updated_at" BEFORE UPDATE ON "public"."whatsapp_chats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_create_notification_for_email_task" AFTER INSERT ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."create_notification_for_email_task"();



CREATE OR REPLACE TRIGGER "trigger_update_task_duration" AFTER INSERT OR UPDATE OF "duration_seconds" ON "public"."task_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_total_duration"();



CREATE OR REPLACE TRIGGER "trigger_update_task_time_spent" BEFORE INSERT OR UPDATE OF "duration_seconds" ON "public"."task_times" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_time_spent"();



CREATE OR REPLACE TRIGGER "update_chat_on_message_insert" AFTER INSERT ON "public"."whatsapp_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_chat_last_message"();



CREATE OR REPLACE TRIGGER "update_short_break_settings_updated_at" BEFORE UPDATE ON "public"."short_break_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_short_breaks_updated_at" BEFORE UPDATE ON "public"."short_breaks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_task_duration_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."task_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_duration_on_session_change"();



CREATE OR REPLACE TRIGGER "update_task_session_updated_at" BEFORE UPDATE ON "public"."task_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_session_updated_at"();



CREATE OR REPLACE TRIGGER "update_task_workflow_progress_updated_at" BEFORE UPDATE ON "public"."task_workflow_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."call_sessions"
    ADD CONSTRAINT "call_sessions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."call_sessions"
    ADD CONSTRAINT "call_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."call_sessions"
    ADD CONSTRAINT "call_sessions_endkunde_id_fkey" FOREIGN KEY ("endkunde_id") REFERENCES "public"."endkunden"("id");



ALTER TABLE ONLY "public"."call_sessions"
    ADD CONSTRAINT "call_sessions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."call_sessions"
    ADD CONSTRAINT "call_sessions_twilio_phone_number_id_fkey" FOREIGN KEY ("twilio_phone_number_id") REFERENCES "public"."twilio_phone_numbers"("id");



ALTER TABLE ONLY "public"."customer_contacts"
    ADD CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_documents"
    ADD CONSTRAINT "customer_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_documents"
    ADD CONSTRAINT "customer_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_documents"
    ADD CONSTRAINT "customer_documents_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_products"
    ADD CONSTRAINT "customer_products_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_task_counters"
    ADD CONSTRAINT "customer_task_counters_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_tools"
    ADD CONSTRAINT "customer_tools_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dev_task_attachments"
    ADD CONSTRAINT "dev_task_attachments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."dev_task_attachments"
    ADD CONSTRAINT "dev_task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."dev_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dev_task_audit_logs"
    ADD CONSTRAINT "dev_task_audit_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."dev_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dev_task_comments"
    ADD CONSTRAINT "dev_task_comments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."dev_task_comments"
    ADD CONSTRAINT "dev_task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."dev_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dev_task_to_tags"
    ADD CONSTRAINT "dev_task_to_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."dev_task_tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dev_task_to_tags"
    ADD CONSTRAINT "dev_task_to_tags_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."dev_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dev_tasks"
    ADD CONSTRAINT "dev_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."email_threads"
    ADD CONSTRAINT "email_threads_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "public"."email_threads"("id");



ALTER TABLE ONLY "public"."email_threads"
    ADD CONSTRAINT "email_threads_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."endkunden"
    ADD CONSTRAINT "endkunden_customer_ID_fkey" FOREIGN KEY ("customer_ID") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."endkunden"
    ADD CONSTRAINT "endkunden_endkunden_contacts_fkey" FOREIGN KEY ("endkunden_contacts") REFERENCES "public"."endkunden_contacts"("id");



ALTER TABLE ONLY "public"."endkunden_contacts"
    ADD CONSTRAINT "fk_customer" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_articles"
    ADD CONSTRAINT "knowledge_articles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."knowledge_articles"
    ADD CONSTRAINT "knowledge_articles_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_articles"
    ADD CONSTRAINT "knowledge_articles_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "public"."use_cases"("id");



ALTER TABLE ONLY "public"."new_use_cases"
    ADD CONSTRAINT "new_use_cases_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."outbound_times"
    ADD CONSTRAINT "outbound_times_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."outbound_times"
    ADD CONSTRAINT "outbound_times_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."product_option_versions"
    ADD CONSTRAINT "product_option_versions_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "public"."product_options"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_options"
    ADD CONSTRAINT "product_options_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_opening_hours_id_fkey" FOREIGN KEY ("opening_hours_id") REFERENCES "public"."opening_hours"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."short_breaks"
    ADD CONSTRAINT "short_breaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supervisor_messages"
    ADD CONSTRAINT "supervisor_messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."supervisor_messages"
    ADD CONSTRAINT "supervisor_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."task_activities"
    ADD CONSTRAINT "task_activities_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_messages"
    ADD CONSTRAINT "task_messages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."task_messages"
    ADD CONSTRAINT "task_messages_previous_message_id_fkey" FOREIGN KEY ("previous_message_id") REFERENCES "public"."task_messages"("id");



ALTER TABLE ONLY "public"."task_messages"
    ADD CONSTRAINT "task_messages_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_sessions"
    ADD CONSTRAINT "task_sessions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_sessions"
    ADD CONSTRAINT "task_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_times"
    ADD CONSTRAINT "task_times_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_times"
    ADD CONSTRAINT "task_times_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."task_workflow_progress"
    ADD CONSTRAINT "task_workflow_progress_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_workflow_progress"
    ADD CONSTRAINT "task_workflow_progress_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "public"."use_cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_endkunde_id_fkey" FOREIGN KEY ("endkunde_id") REFERENCES "public"."endkunden"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_last_message_id_fkey" FOREIGN KEY ("last_message_id") REFERENCES "public"."task_messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_matched_use_case_id_fkey" FOREIGN KEY ("matched_use_case_id") REFERENCES "public"."use_cases"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_source_email_id_fkey" FOREIGN KEY ("source_email_id") REFERENCES "public"."inbound_emails"("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."twilio_phone_numbers"
    ADD CONSTRAINT "twilio_phone_numbers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."use_cases"
    ADD CONSTRAINT "use_cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."use_cases"
    ADD CONSTRAINT "use_cases_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_chats"
    ADD CONSTRAINT "user_chats_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_chats"
    ADD CONSTRAINT "user_chats_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_customer_assignments"
    ADD CONSTRAINT "user_customer_assignments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_customer_assignments"
    ADD CONSTRAINT "user_customer_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_reminders"
    ADD CONSTRAINT "user_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."whatsapp_accounts"
    ADD CONSTRAINT "whatsapp_accounts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_chat_sessions"
    ADD CONSTRAINT "whatsapp_chat_sessions_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."whatsapp_chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_chat_sessions"
    ADD CONSTRAINT "whatsapp_chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_chats"
    ADD CONSTRAINT "whatsapp_chats_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."whatsapp_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."whatsapp_chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_deviations"
    ADD CONSTRAINT "workflow_deviations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_deviations"
    ADD CONSTRAINT "workflow_deviations_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_deviations"
    ADD CONSTRAINT "workflow_deviations_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "public"."use_cases"("id") ON DELETE CASCADE;



CREATE POLICY "Admin darf alle WhatsApp-Webhook-Nachrichten sehen" ON "public"."whatsapp_inbound_webhooks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins and supervisors can read sessions" ON "public"."user_sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."role" = 'supervisor'::"text"))))));



CREATE POLICY "Admins can create task messages" ON "public"."task_messages" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can create tasks" ON "public"."tasks" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can create whatsapp accounts" ON "public"."whatsapp_accounts" FOR INSERT WITH CHECK (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins can delete any payment method" ON "public"."payment_methods" FOR DELETE USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can delete tasks" ON "public"."tasks" FOR DELETE TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can delete whatsapp accounts" ON "public"."whatsapp_accounts" FOR DELETE USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins can do all operations" ON "public"."outbound_times" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"text"))));



CREATE POLICY "Admins can do all operations" ON "public"."task_times" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"text"))));



CREATE POLICY "Admins can do everything with customer documents" ON "public"."customer_documents" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"text"))));



CREATE POLICY "Admins can do everything with knowledge articles" ON "public"."knowledge_articles" TO "authenticated" USING (("public"."get_user_role"() = 'admin'::"text")) WITH CHECK (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins can insert payment methods for any user" ON "public"."payment_methods" FOR INSERT WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can insert profiles" ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "profiles_1"."role"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can insert system settings" ON "public"."system_settings" FOR INSERT WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Admins can manage all customers" ON "public"."customers" USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins can manage all profiles" ON "public"."profiles" USING (("auth"."uid"() IN ( SELECT "profiles_1"."id"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."role" = 'admin'::"text"))));



CREATE POLICY "Admins can manage dev_task_attachments" ON "public"."dev_task_attachments" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"text"))));



CREATE POLICY "Admins can manage dev_task_comments" ON "public"."dev_task_comments" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"text"))));



CREATE POLICY "Admins can manage dev_task_tags" ON "public"."dev_task_tags" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"text"))));



CREATE POLICY "Admins can manage dev_task_to_tags" ON "public"."dev_task_to_tags" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"text"))));



CREATE POLICY "Admins can manage dev_tasks" ON "public"."dev_tasks" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"text"))));



CREATE POLICY "Admins can manage prompt templates" ON "public"."prompt_templates" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage use cases" ON "public"."use_cases" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can modify all assignments" ON "public"."user_customer_assignments" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read all activities" ON "public"."task_activities" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read settings" ON "public"."short_break_settings" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read system settings" ON "public"."system_settings" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Admins can see all email threads" ON "public"."email_threads" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can see all payment methods" ON "public"."payment_methods" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can see all tasks" ON "public"."tasks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update any payment method" ON "public"."payment_methods" FOR UPDATE USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can update profiles" ON "public"."profiles" FOR UPDATE USING ((( SELECT "profiles_1"."role"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can update settings" ON "public"."short_break_settings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update system settings" ON "public"."system_settings" FOR UPDATE USING ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Admins can update tasks" ON "public"."tasks" FOR UPDATE TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can update whatsapp accounts" ON "public"."whatsapp_accounts" FOR UPDATE USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins can view all payment methods" ON "public"."payment_methods" FOR SELECT USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT USING ((( SELECT "profiles_1"."role"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can view all task messages" ON "public"."task_messages" FOR SELECT TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can view all tasks" ON "public"."tasks" FOR SELECT TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can view all whatsapp accounts" ON "public"."whatsapp_accounts" FOR SELECT USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins have full access to call_sessions" ON "public"."call_sessions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins have full access to endkunden" ON "public"."endkunden" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")) WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins und Agents können WhatsApp-Chats anzeigen" ON "public"."whatsapp_chats" FOR SELECT USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'agent'::"text"])));



CREATE POLICY "Admins und Agents können WhatsApp-Chats verwalten" ON "public"."whatsapp_chats" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'agent'::"text"])));



CREATE POLICY "Admins und Agents können WhatsApp-Nachrichten anzeigen" ON "public"."whatsapp_messages" FOR SELECT USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'agent'::"text"])));



CREATE POLICY "Admins und Agents können WhatsApp-Nachrichten verwalten" ON "public"."whatsapp_messages" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'agent'::"text"])));



CREATE POLICY "Agents can create task messages for assigned customers" ON "public"."task_messages" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'agent'::"text") AND ("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."customer_id" IN ( SELECT "user_customer_assignments"."customer_id"
           FROM "public"."user_customer_assignments"
          WHERE ("user_customer_assignments"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Agents can create tasks for assigned customers" ON "public"."tasks" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'agent'::"text") AND ("customer_id" IN ( SELECT "user_customer_assignments"."customer_id"
   FROM "public"."user_customer_assignments"
  WHERE ("user_customer_assignments"."user_id" = "auth"."uid"())))));



CREATE POLICY "Agents can see email threads for their assigned tasks" ON "public"."email_threads" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."tasks" "t"
     JOIN "public"."user_customer_assignments" "uca" ON (("t"."customer_id" = "uca"."customer_id")))
  WHERE (("t"."id" = "email_threads"."task_id") AND ("uca"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."tasks" "t"
  WHERE (("t"."id" = "email_threads"."task_id") AND ("t"."assigned_to" = "auth"."uid"()))))));



CREATE POLICY "Agents can see task messages of assigned customers" ON "public"."task_messages" FOR SELECT TO "authenticated" USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'agent'::"text") AND ("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."customer_id" IN ( SELECT "user_customer_assignments"."customer_id"
           FROM "public"."user_customer_assignments"
          WHERE ("user_customer_assignments"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Agents can see tasks for their assigned customers" ON "public"."tasks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_customer_assignments"
  WHERE (("user_customer_assignments"."user_id" = "auth"."uid"()) AND ("user_customer_assignments"."customer_id" = "tasks"."customer_id")))));



CREATE POLICY "Agents can see tasks of assigned customers" ON "public"."tasks" FOR SELECT TO "authenticated" USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'agent'::"text") AND ("customer_id" IN ( SELECT "user_customer_assignments"."customer_id"
   FROM "public"."user_customer_assignments"
  WHERE ("user_customer_assignments"."user_id" = "auth"."uid"())))));



CREATE POLICY "Agents can see their own calls" ON "public"."call_sessions" FOR SELECT USING ((("agent_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."user_customer_assignments" "uca"
  WHERE (("uca"."user_id" = "auth"."uid"()) AND ("uca"."customer_id" = "call_sessions"."customer_id"))))));



CREATE POLICY "Agents can update tasks of assigned customers" ON "public"."tasks" FOR UPDATE TO "authenticated" USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'agent'::"text") AND ("customer_id" IN ( SELECT "user_customer_assignments"."customer_id"
   FROM "public"."user_customer_assignments"
  WHERE ("user_customer_assignments"."user_id" = "auth"."uid"())))));



CREATE POLICY "Agents can view and manage their own task times" ON "public"."task_times" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Agents can view assigned customers" ON "public"."customers" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."user_customer_assignments"
  WHERE (("user_customer_assignments"."user_id" = "auth"."uid"()) AND ("user_customer_assignments"."customer_id" = "customers"."id")))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Agents can view endkunden for assigned customers" ON "public"."endkunden" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_customer_assignments"
  WHERE (("user_customer_assignments"."user_id" = "auth"."uid"()) AND ("user_customer_assignments"."customer_id" = "user_customer_assignments"."customer_id")))) OR (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")));



CREATE POLICY "Agents can view outbound times for their customers" ON "public"."outbound_times" FOR SELECT USING (("customer_id" IN ( SELECT "user_customer_assignments"."customer_id"
   FROM "public"."user_customer_assignments"
  WHERE ("user_customer_assignments"."user_id" = "auth"."uid"()))));



CREATE POLICY "Agents can view their customers' knowledge articles" ON "public"."knowledge_articles" FOR SELECT TO "authenticated" USING ((("public"."get_user_role"() = 'agent'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."user_customer_assignments"
  WHERE (("user_customer_assignments"."user_id" = "auth"."uid"()) AND ("user_customer_assignments"."customer_id" = "knowledge_articles"."customer_id"))))));



CREATE POLICY "Alle dürfen Produktoptionen lesen" ON "public"."product_options" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Alle dürfen Produktoptionsversionen lesen" ON "public"."product_option_versions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow admins and agents to view all inbound emails" ON "public"."inbound_emails" FOR SELECT TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'agent'::"text"])));



CREATE POLICY "Allow admins to view all emails" ON "public"."inbound_emails" FOR SELECT TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Allow all for admin on product_options" ON "public"."product_options" USING ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



CREATE POLICY "Allow inserts from anyone temporarily" ON "public"."inbound_emails" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow read for all" ON "public"."inbound_emails" FOR SELECT USING (true);



CREATE POLICY "Allow read for authenticated on product_options" ON "public"."product_options" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Anyone can view profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Chat sessions are visible to authenticated users" ON "public"."whatsapp_chat_sessions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Clients can create task messages for their tasks" ON "public"."task_messages" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'client'::"text") AND ("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."customer_id" IN ( SELECT "user_customer_assignments"."customer_id"
           FROM "public"."user_customer_assignments"
          WHERE ("user_customer_assignments"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Clients can create tasks for their customer" ON "public"."tasks" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'client'::"text") AND ("customer_id" IN ( SELECT "user_customer_assignments"."customer_id"
   FROM "public"."user_customer_assignments"
  WHERE ("user_customer_assignments"."user_id" = "auth"."uid"())))));



CREATE POLICY "Clients can see only their own email threads" ON "public"."email_threads" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."tasks" "t"
     JOIN "public"."profiles" "p" ON (("auth"."uid"() = "p"."id")))
  WHERE (("t"."id" = "email_threads"."task_id") AND ("p"."role" = 'client'::"text") AND ("t"."customer_id" IN ( SELECT "user_customer_assignments"."customer_id"
           FROM "public"."user_customer_assignments"
          WHERE ("user_customer_assignments"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Clients can see only their own task messages" ON "public"."task_messages" FOR SELECT TO "authenticated" USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'client'::"text") AND ("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."customer_id" IN ( SELECT "user_customer_assignments"."customer_id"
           FROM "public"."user_customer_assignments"
          WHERE ("user_customer_assignments"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Clients can see only their own tasks" ON "public"."tasks" FOR SELECT TO "authenticated" USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'client'::"text") AND ("customer_id" IN ( SELECT "user_customer_assignments"."customer_id"
   FROM "public"."user_customer_assignments"
  WHERE ("user_customer_assignments"."user_id" = "auth"."uid"())))));



CREATE POLICY "Clients can view only their knowledge articles" ON "public"."knowledge_articles" FOR SELECT TO "authenticated" USING ((("public"."get_user_role"() = 'client'::"text") AND ("customer_id" IN ( SELECT "user_customer_assignments"."customer_id"
   FROM "public"."user_customer_assignments"
  WHERE ("user_customer_assignments"."user_id" = "auth"."uid"())))));



CREATE POLICY "Customers are viewable by assigned users or admins" ON "public"."customers" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."user_customer_assignments"
  WHERE (("user_customer_assignments"."customer_id" = "user_customer_assignments"."id") AND ("user_customer_assignments"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Customers can read their own use cases" ON "public"."use_cases" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_customer_assignments"
     JOIN "public"."profiles" ON (("profiles"."id" = "user_customer_assignments"."user_id")))
  WHERE (("user_customer_assignments"."user_id" = "auth"."uid"()) AND ("user_customer_assignments"."customer_id" = "use_cases"."customer_id") AND ("profiles"."role" = 'customer'::"text")))));



CREATE POLICY "Customers can see only their own tasks" ON "public"."tasks" FOR SELECT USING (("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'customer'::"text")))))));



CREATE POLICY "Customers can view all task times of their customer" ON "public"."task_times" FOR SELECT USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."customer_id" IN ( SELECT "customers"."id"
           FROM "public"."customers"
          WHERE (EXISTS ( SELECT 1
                   FROM "public"."profiles"
                  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'customer'::"text")))))))));



CREATE POLICY "Customers can view their own data" ON "public"."customers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'customer'::"text") AND ("profiles"."email" = "customers"."email")))));



CREATE POLICY "Customers can view their own documents" ON "public"."customer_documents" FOR SELECT TO "authenticated" USING (("auth"."uid"() IN ( SELECT "user_customer_assignments"."user_id"
   FROM "public"."user_customer_assignments"
  WHERE ("user_customer_assignments"."customer_id" = "customer_documents"."customer_id"))));



CREATE POLICY "Customers can view their own outbound times" ON "public"."outbound_times" FOR SELECT USING (("customer_id" = ( SELECT "outbound_times"."customer_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Edge functions can insert task messages" ON "public"."task_messages" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Enable ALL actions for authenticated users" ON "public"."products" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable RPC for authenticated users only" ON "public"."tasks" TO "authenticated" USING (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."customer_contacts" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."endkunden_contacts" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."opening_hours" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Jeder darf eigene Webhook-Nachrichten hinzufügen" ON "public"."whatsapp_inbound_webhooks" FOR INSERT WITH CHECK (true);



CREATE POLICY "Manage own task sessions" ON "public"."task_sessions" TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Messages inherit task visibility" ON "public"."task_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tasks"
  WHERE ("tasks"."id" = "task_messages"."task_id"))));



CREATE POLICY "Nur Admins dürfen Produktoptionen erstellen" ON "public"."product_options" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Nur Admins dürfen Produktoptionen löschen" ON "public"."product_options" FOR DELETE TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Nur Admins dürfen Produktoptionen ändern" ON "public"."product_options" FOR UPDATE TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Nur Admins dürfen Produktoptionsversionen erstellen" ON "public"."product_option_versions" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Nur Admins dürfen Produktoptionsversionen löschen" ON "public"."product_option_versions" FOR DELETE TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Nur Admins dürfen Produktoptionsversionen ändern" ON "public"."product_option_versions" FOR UPDATE TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Only admins and customers can manage knowledge articles" ON "public"."knowledge_articles" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_customer_assignments" "uca"
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("uca"."user_id" = "auth"."uid"()) AND ("uca"."customer_id" = "knowledge_articles"."customer_id") AND ("p"."role" = ANY (ARRAY['admin'::"text", 'customer'::"text"]))))));



CREATE POLICY "Only admins can delete profiles" ON "public"."profiles" FOR DELETE USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Only admins can insert profiles" ON "public"."profiles" FOR INSERT WITH CHECK ((("public"."get_user_role"() = 'admin'::"text") OR ("auth"."uid"() = "id")));



CREATE POLICY "Recipients can update messages" ON "public"."supervisor_messages" FOR UPDATE USING (("auth"."uid"() = "recipient_id"));



CREATE POLICY "User can access customer contacts if they have access to the cu" ON "public"."customer_contacts" USING ((("customer_id" IS NOT NULL) AND "public"."user_has_customer_access"("customer_id")));



CREATE POLICY "User can access customer task counters if they have access to t" ON "public"."customer_task_counters" USING ("public"."user_has_customer_access"("customer_id"));



CREATE POLICY "User can access customer tools if they have access to the custo" ON "public"."customer_tools" USING ((("customer_id" IS NOT NULL) AND "public"."user_has_customer_access"("customer_id")));



CREATE POLICY "Users can create messages where they are the sender" ON "public"."user_chats" FOR INSERT WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can create workflow deviations for assigned tasks" ON "public"."workflow_deviations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tasks" "t"
  WHERE (("t"."id" = "workflow_deviations"."task_id") AND (("auth"."uid"() IN ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."role" = 'admin'::"text"))) OR ("t"."assigned_to" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."user_customer_assignments" "uca"
          WHERE (("uca"."user_id" = "auth"."uid"()) AND ("uca"."customer_id" = "t"."customer_id")))))))));



CREATE POLICY "Users can create/update workflow progress for assigned tasks" ON "public"."task_workflow_progress" USING ((EXISTS ( SELECT 1
   FROM "public"."tasks" "t"
  WHERE (("t"."id" = "task_workflow_progress"."task_id") AND (("auth"."uid"() IN ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."role" = 'admin'::"text"))) OR ("t"."assigned_to" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."user_customer_assignments" "uca"
          WHERE (("uca"."user_id" = "auth"."uid"()) AND ("uca"."customer_id" = "t"."customer_id"))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tasks" "t"
  WHERE (("t"."id" = "task_workflow_progress"."task_id") AND (("auth"."uid"() IN ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."role" = 'admin'::"text"))) OR ("t"."assigned_to" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."user_customer_assignments" "uca"
          WHERE (("uca"."user_id" = "auth"."uid"()) AND ("uca"."customer_id" = "t"."customer_id")))))))));



CREATE POLICY "Users can delete their own payment methods" ON "public"."payment_methods" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own reminders" ON "public"."user_reminders" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own activities" ON "public"."task_activities" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own breaks" ON "public"."short_breaks" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own payment methods" ON "public"."payment_methods" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own reminders" ON "public"."user_reminders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own task times" ON "public"."task_times" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own chat sessions" ON "public"."whatsapp_chat_sessions" TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own session" ON "public"."user_sessions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can mark messages as read if they are the receiver" ON "public"."user_chats" FOR UPDATE USING (("auth"."uid"() = "receiver_id"));



CREATE POLICY "Users can read activities for their own or assigned customers' " ON "public"."task_activities" FOR SELECT USING (("task_id" IN ( SELECT "t"."id"
   FROM ("public"."tasks" "t"
     LEFT JOIN "public"."user_customer_assignments" "uca" ON (("t"."customer_id" = "uca"."customer_id")))
  WHERE (("uca"."user_id" = "auth"."uid"()) OR ("t"."created_by" = "auth"."uid"()) OR ("t"."assigned_to" = "auth"."uid"())))));



CREATE POLICY "Users can read their own chat messages" ON "public"."user_chats" FOR SELECT USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "receiver_id")));



CREATE POLICY "Users can see their assigned customers' payment methods" ON "public"."payment_methods" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_customer_assignments" "uca"
  WHERE (("uca"."user_id" = "auth"."uid"()) AND ("uca"."customer_id" = "payment_methods"."customer_id")))));



CREATE POLICY "Users can see their own assignments" ON "public"."user_customer_assignments" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can see their own breaks" ON "public"."short_breaks" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can send messages" ON "public"."supervisor_messages" FOR INSERT WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own breaks" ON "public"."short_breaks" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own payment methods" ON "public"."payment_methods" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can update their own reminders" ON "public"."user_reminders" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own task times" ON "public"."task_times" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view other profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can view own assignments or admins can view all" ON "public"."user_customer_assignments" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their customer's knowledge articles" ON "public"."knowledge_articles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_customer_assignments" "uca"
  WHERE (("uca"."user_id" = "auth"."uid"()) AND ("uca"."customer_id" = "knowledge_articles"."customer_id")))));



CREATE POLICY "Users can view their own messages" ON "public"."supervisor_messages" FOR SELECT USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "recipient_id")));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own payment methods" ON "public"."payment_methods" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own reminders" ON "public"."user_reminders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view workflow deviations for assigned tasks" ON "public"."workflow_deviations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tasks" "t"
  WHERE (("t"."id" = "workflow_deviations"."task_id") AND (("auth"."uid"() IN ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."role" = 'admin'::"text"))) OR ("t"."assigned_to" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."user_customer_assignments" "uca"
          WHERE (("uca"."user_id" = "auth"."uid"()) AND ("uca"."customer_id" = "t"."customer_id")))))))));



CREATE POLICY "Users can view workflow progress for assigned tasks" ON "public"."task_workflow_progress" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tasks" "t"
  WHERE (("t"."id" = "task_workflow_progress"."task_id") AND (("auth"."uid"() IN ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."role" = 'admin'::"text"))) OR ("t"."assigned_to" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."user_customer_assignments" "uca"
          WHERE (("uca"."user_id" = "auth"."uid"()) AND ("uca"."customer_id" = "t"."customer_id")))))))));



CREATE POLICY "View all task sessions" ON "public"."task_sessions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "admin_only_opening_hours" ON "public"."opening_hours" USING (("auth"."role"() = 'admin'::"text"));



CREATE POLICY "admin_task_sessions_policy" ON "public"."task_sessions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



ALTER TABLE "public"."call_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_task_counters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_tools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dev_task_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dev_task_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dev_task_audit_logs_insert_policy" ON "public"."dev_task_audit_logs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "dev_task_audit_logs_select_policy" ON "public"."dev_task_audit_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



ALTER TABLE "public"."dev_task_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dev_task_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dev_task_to_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dev_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_threads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."endkunden" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."endkunden_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inbound_emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knowledge_articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."opening_hours" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."outbound_times" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_option_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prompt_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."short_break_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."short_breaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supervisor_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_times" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_workflow_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."twilio_phone_numbers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."use_cases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_chats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_customer_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_task_sessions_policy" ON "public"."task_sessions" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."whatsapp_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_chat_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_chats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_inbound_webhooks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_deviations" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."supervisor_messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."admin_populate_profile_emails"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_populate_profile_emails"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_populate_profile_emails"() TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_completed_times_for_customer"("customer_id_param" "uuid", "from_date_param" timestamp with time zone, "to_date_param" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_completed_times_for_customer"("customer_id_param" "uuid", "from_date_param" timestamp with time zone, "to_date_param" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_completed_times_for_customer"("customer_id_param" "uuid", "from_date_param" timestamp with time zone, "to_date_param" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_task_total_duration"("task_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_task_total_duration"("task_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_task_total_duration"("task_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_total_time_for_customer"("customer_id_param" "uuid", "from_date_param" timestamp with time zone, "to_date_param" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_total_time_for_customer"("customer_id_param" "uuid", "from_date_param" timestamp with time zone, "to_date_param" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_total_time_for_customer"("customer_id_param" "uuid", "from_date_param" timestamp with time zone, "to_date_param" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_chat_session"("chat_id_param" "uuid", "user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_chat_session"("chat_id_param" "uuid", "user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_chat_session"("chat_id_param" "uuid", "user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification_for_email_reply"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification_for_email_reply"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification_for_email_reply"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification_for_email_task"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification_for_email_task"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification_for_email_task"() TO "service_role";



GRANT ALL ON TABLE "public"."product_options" TO "anon";
GRANT ALL ON TABLE "public"."product_options" TO "authenticated";
GRANT ALL ON TABLE "public"."product_options" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_product_option_with_version"("option_name" "text", "description" "text", "price_monthly" numeric, "price_once" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."create_product_option_with_version"("option_name" "text", "description" "text", "price_monthly" numeric, "price_once" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_product_option_with_version"("option_name" "text", "description" "text", "price_monthly" numeric, "price_once" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_product_option_with_version"("option_name" "text", "p_product_id" "uuid", "version_description" "text", "monthly_price" numeric, "once_price" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."create_product_option_with_version"("option_name" "text", "p_product_id" "uuid", "version_description" "text", "monthly_price" numeric, "once_price" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_product_option_with_version"("option_name" "text", "p_product_id" "uuid", "version_description" "text", "monthly_price" numeric, "once_price" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_customer_times"("customer_id_param" "uuid", "from_date_param" timestamp with time zone, "to_date_param" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."debug_customer_times"("customer_id_param" "uuid", "from_date_param" timestamp with time zone, "to_date_param" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_customer_times"("customer_id_param" "uuid", "from_date_param" timestamp with time zone, "to_date_param" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_customer_cascade"("customer_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_customer_cascade"("customer_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_customer_cascade"("customer_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_product_option"("p_option_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_product_option"("p_option_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_product_option"("p_option_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_use_case_cascade"("use_case_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_use_case_cascade"("use_case_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_use_case_cascade"("use_case_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_avanti_email"("customer_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_avanti_email"("customer_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_avanti_email"("customer_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_customer_prefix"("customer_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_customer_prefix"("customer_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_customer_prefix"("customer_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_embedding"("input_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_embedding"("input_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_embedding"("input_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_readable_task_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_readable_task_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_readable_task_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_break_slots"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_break_slots"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_break_slots"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_break_minutes"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_break_minutes"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_break_minutes"("user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_chat_session"("chat_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_chat_session"("chat_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_chat_session"("chat_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_system_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_system_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_system_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_deleted_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_deleted_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_deleted_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_call"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_call"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_call"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_inbound_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_inbound_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_inbound_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_product_option_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_product_option_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_product_option_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_session"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_session"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_session"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_email_to_customer"("email_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."match_email_to_customer"("email_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_email_to_customer"("email_address" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_relevant_knowledge_articles"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "customer_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."match_relevant_knowledge_articles"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "customer_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_relevant_knowledge_articles"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "customer_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_similar_use_cases"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_similar_use_cases"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_similar_use_cases"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_similar_use_cases"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "customer_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."match_similar_use_cases"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "customer_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_similar_use_cases"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "customer_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_task_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_task_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_task_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_session"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_session"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_session"() TO "service_role";



GRANT ALL ON FUNCTION "public"."release_chat_session"("chat_id_param" "uuid", "user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."release_chat_session"("chat_id_param" "uuid", "user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_chat_session"("chat_id_param" "uuid", "user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_email_to_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_email_to_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_email_to_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_all_task_durations"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_all_task_durations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_all_task_durations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_chat_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_chat_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_chat_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_chat_session"("chat_id_param" "uuid", "user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_chat_session"("chat_id_param" "uuid", "user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_chat_session"("chat_id_param" "uuid", "user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_product_option_version"("p_option_id" "uuid", "p_description" "text", "p_price_monthly" numeric, "p_price_once" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_product_option_version"("p_option_id" "uuid", "p_description" "text", "p_price_monthly" numeric, "p_price_once" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_product_option_version"("p_option_id" "uuid", "p_description" "text", "p_price_monthly" numeric, "p_price_once" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_duration_on_session_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_duration_on_session_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_duration_on_session_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_session_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_session_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_session_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_time_spent"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_time_spent"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_time_spent"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_total_duration"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_total_duration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_total_duration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_customer_access"("customer_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_customer_access"("customer_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_customer_access"("customer_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."auth_users_view" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."auth_users_view" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_users_view" TO "service_role";



GRANT ALL ON TABLE "public"."call_sessions" TO "anon";
GRANT ALL ON TABLE "public"."call_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."call_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."customer_contacts" TO "anon";
GRANT ALL ON TABLE "public"."customer_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."customer_documents" TO "anon";
GRANT ALL ON TABLE "public"."customer_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_documents" TO "service_role";



GRANT ALL ON TABLE "public"."customer_products" TO "anon";
GRANT ALL ON TABLE "public"."customer_products" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_products" TO "service_role";



GRANT ALL ON TABLE "public"."customer_task_counters" TO "anon";
GRANT ALL ON TABLE "public"."customer_task_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_task_counters" TO "service_role";



GRANT ALL ON TABLE "public"."customer_tools" TO "anon";
GRANT ALL ON TABLE "public"."customer_tools" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_tools" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."dev_task_attachments" TO "anon";
GRANT ALL ON TABLE "public"."dev_task_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."dev_task_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."dev_task_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."dev_task_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."dev_task_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."dev_task_comments" TO "anon";
GRANT ALL ON TABLE "public"."dev_task_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."dev_task_comments" TO "service_role";



GRANT ALL ON TABLE "public"."dev_task_tags" TO "anon";
GRANT ALL ON TABLE "public"."dev_task_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."dev_task_tags" TO "service_role";



GRANT ALL ON TABLE "public"."dev_task_to_tags" TO "anon";
GRANT ALL ON TABLE "public"."dev_task_to_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."dev_task_to_tags" TO "service_role";



GRANT ALL ON TABLE "public"."dev_tasks" TO "anon";
GRANT ALL ON TABLE "public"."dev_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."dev_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."email_threads" TO "anon";
GRANT ALL ON TABLE "public"."email_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."email_threads" TO "service_role";



GRANT ALL ON TABLE "public"."endkunden" TO "anon";
GRANT ALL ON TABLE "public"."endkunden" TO "authenticated";
GRANT ALL ON TABLE "public"."endkunden" TO "service_role";



GRANT ALL ON TABLE "public"."endkunden_contacts" TO "anon";
GRANT ALL ON TABLE "public"."endkunden_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."endkunden_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."inbound_emails" TO "anon";
GRANT ALL ON TABLE "public"."inbound_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."inbound_emails" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_articles" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_articles" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_articles" TO "service_role";



GRANT ALL ON TABLE "public"."new_use_cases" TO "anon";
GRANT ALL ON TABLE "public"."new_use_cases" TO "authenticated";
GRANT ALL ON TABLE "public"."new_use_cases" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."opening_hours" TO "anon";
GRANT ALL ON TABLE "public"."opening_hours" TO "authenticated";
GRANT ALL ON TABLE "public"."opening_hours" TO "service_role";



GRANT ALL ON TABLE "public"."outbound_times" TO "anon";
GRANT ALL ON TABLE "public"."outbound_times" TO "authenticated";
GRANT ALL ON TABLE "public"."outbound_times" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."product_option_versions" TO "anon";
GRANT ALL ON TABLE "public"."product_option_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."product_option_versions" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."prompt_templates" TO "anon";
GRANT ALL ON TABLE "public"."prompt_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."prompt_templates" TO "service_role";



GRANT ALL ON TABLE "public"."short_break_settings" TO "anon";
GRANT ALL ON TABLE "public"."short_break_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."short_break_settings" TO "service_role";



GRANT ALL ON TABLE "public"."short_breaks" TO "anon";
GRANT ALL ON TABLE "public"."short_breaks" TO "authenticated";
GRANT ALL ON TABLE "public"."short_breaks" TO "service_role";



GRANT ALL ON TABLE "public"."step_library" TO "anon";
GRANT ALL ON TABLE "public"."step_library" TO "authenticated";
GRANT ALL ON TABLE "public"."step_library" TO "service_role";



GRANT ALL ON TABLE "public"."supervisor_messages" TO "anon";
GRANT ALL ON TABLE "public"."supervisor_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."supervisor_messages" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."task_activities" TO "anon";
GRANT ALL ON TABLE "public"."task_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."task_activities" TO "service_role";



GRANT ALL ON TABLE "public"."task_messages" TO "anon";
GRANT ALL ON TABLE "public"."task_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."task_messages" TO "service_role";



GRANT ALL ON TABLE "public"."task_sessions" TO "anon";
GRANT ALL ON TABLE "public"."task_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."task_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."task_times" TO "anon";
GRANT ALL ON TABLE "public"."task_times" TO "authenticated";
GRANT ALL ON TABLE "public"."task_times" TO "service_role";



GRANT ALL ON TABLE "public"."task_time_summary" TO "anon";
GRANT ALL ON TABLE "public"."task_time_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."task_time_summary" TO "service_role";



GRANT ALL ON TABLE "public"."task_workflow_progress" TO "anon";
GRANT ALL ON TABLE "public"."task_workflow_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."task_workflow_progress" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";



GRANT ALL ON TABLE "public"."twilio_phone_numbers" TO "anon";
GRANT ALL ON TABLE "public"."twilio_phone_numbers" TO "authenticated";
GRANT ALL ON TABLE "public"."twilio_phone_numbers" TO "service_role";



GRANT ALL ON TABLE "public"."use_cases" TO "anon";
GRANT ALL ON TABLE "public"."use_cases" TO "authenticated";
GRANT ALL ON TABLE "public"."use_cases" TO "service_role";



GRANT ALL ON TABLE "public"."user_chats" TO "anon";
GRANT ALL ON TABLE "public"."user_chats" TO "authenticated";
GRANT ALL ON TABLE "public"."user_chats" TO "service_role";



GRANT ALL ON TABLE "public"."user_customer_assignments" TO "anon";
GRANT ALL ON TABLE "public"."user_customer_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_customer_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."user_reminders" TO "anon";
GRANT ALL ON TABLE "public"."user_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."user_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_accounts" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_chat_sessions" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_chat_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_chat_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_chats" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_chats" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_chats" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_inbound_webhooks" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_inbound_webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_inbound_webhooks" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_messages" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_messages" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_deviations" TO "anon";
GRANT ALL ON TABLE "public"."workflow_deviations" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_deviations" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
