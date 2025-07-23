-- Step 1: Add the organization_id column to the product_options table
-- This column is necessary for the RLS policy to work correctly.
-- It references the organizations table to ensure data integrity.
ALTER TABLE public.product_options
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Step 2: Set a default value for the new organization_id column
-- This will automatically associate the new option with the current user's organization.
ALTER TABLE public.product_options
ALTER COLUMN organization_id SET DEFAULT ( SELECT organization_id FROM public.profiles WHERE id = auth.uid() );

-- Step 3: Create the RLS policy to use the new column
-- This ensures that users can only see and manage options belonging to their organization.
-- First, drop the old policy if it exists to avoid errors.
DROP POLICY IF EXISTS "Enable access for organization members" ON public.product_options;
-- Create the new, correct policy.
CREATE POLICY "Enable access for organization members"
ON public.product_options
FOR ALL
USING (
  organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Make sure RLS is enabled on the table
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

-- Step 4: Revert the RPC function to its simpler form.
-- It no longer needs the organization_id passed in, as the database now handles it automatically.
CREATE OR REPLACE FUNCTION public.create_product_option_with_version(
    option_name text,
    p_product_id uuid,
    version_description text,
    monthly_price numeric,
    once_price numeric
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    new_option_id uuid;
BEGIN
    -- Insert into product_options table. The organization_id is now set by default.
    INSERT INTO public.product_options (name, product_id)
    VALUES (option_name, p_product_id)
    RETURNING id INTO new_option_id;

    -- Deactivate previous latest version if it exists
    UPDATE public.product_option_versions
    SET is_latest = false
    WHERE product_option_id = new_option_id AND is_latest = true;

    -- Insert the new version and mark it as the latest
    INSERT INTO public.product_option_versions (product_option_id, version, description, price_monthly, price_once, is_active, is_latest)
    VALUES (new_option_id, 
            COALESCE((SELECT MAX(version) FROM public.product_option_versions WHERE product_option_id = new_option_id), 0) + 1, 
            version_description, 
            monthly_price, 
            once_price, 
            true, 
            true);

END;
$$;
