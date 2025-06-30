-- Step 1: Add the organization_id column to the product_options table
ALTER TABLE public.product_options
ADD COLUMN organization_id UUID;

-- Step 2: Add a foreign key constraint to the 'customers' table (which represents organizations)
ALTER TABLE public.product_options
ADD CONSTRAINT fk_organization
FOREIGN KEY (organization_id)
REFERENCES public.customers(id)
ON DELETE CASCADE;

-- Step 3: Set the correct default value for the new organization_id column
-- This mirrors the working logic from the 'products' table.
ALTER TABLE public.product_options
ALTER COLUMN organization_id SET DEFAULT ( SELECT organization_id FROM public.profiles WHERE id = auth.uid() );

-- Step 4: Create the definitive RLS policy based on facts
DROP POLICY IF EXISTS "Enable access for organization members" ON public.product_options;
CREATE POLICY "Enable access for organization members"
ON public.product_options
FOR ALL
USING (
  organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Step 5: Ensure RLS is enabled on the table
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

-- Step 6: Ensure the RPC function is the simple version
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
    INSERT INTO public.product_options (name, product_id)
    VALUES (option_name, p_product_id)
    RETURNING id INTO new_option_id;

    UPDATE public.product_option_versions
    SET is_latest = false
    WHERE product_option_id = new_option_id AND is_latest = true;

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
