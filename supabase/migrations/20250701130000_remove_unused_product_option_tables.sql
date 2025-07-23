-- Entfernen der ungenutzten Produktoptions-Tabellen

-- Zuerst alle FKs entfernen, die auf diese Tabellen verweisen könnten
DO $$ 
BEGIN
  -- FK Constraints für product_option_assignments entfernen
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'product_option_assignments' AND table_schema = 'public'
  ) THEN
    ALTER TABLE IF EXISTS public.product_option_assignments DROP CONSTRAINT IF EXISTS fk_product_option_assignments_option_id;
    ALTER TABLE IF EXISTS public.product_option_assignments DROP CONSTRAINT IF EXISTS fk_product_option_assignments_customer_id;
  END IF;

  -- FK Constraints für product_option_requirements entfernen
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'product_option_requirements' AND table_schema = 'public'
  ) THEN
    ALTER TABLE IF EXISTS public.product_option_requirements DROP CONSTRAINT IF EXISTS fk_product_option_requirements_option_id;
    ALTER TABLE IF EXISTS public.product_option_requirements DROP CONSTRAINT IF EXISTS fk_product_option_requirements_required_option_id;
  END IF;

  -- FK Constraints für option_categories entfernen
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'option_categories' AND table_schema = 'public'
  ) THEN
    ALTER TABLE IF EXISTS public.option_categories DROP CONSTRAINT IF EXISTS fk_option_categories_option_id;
    ALTER TABLE IF EXISTS public.product_options DROP CONSTRAINT IF EXISTS fk_product_options_category_id;
  END IF;
END $$;

-- Dann die Tabellen entfernen
DROP TABLE IF EXISTS public.product_option_assignments;
DROP TABLE IF EXISTS public.product_option_requirements;
DROP TABLE IF EXISTS public.option_categories;

-- Kommentar zur Migration hinzufügen
COMMENT ON SCHEMA public IS 'Unused product option related tables have been removed';
