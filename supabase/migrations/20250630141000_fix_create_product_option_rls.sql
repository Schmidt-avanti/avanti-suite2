CREATE OR REPLACE FUNCTION public.create_product_option_with_version(
    option_name text,
    p_product_id uuid,
    version_description text,
    monthly_price numeric,
    once_price numeric,
    p_organization_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    new_option_id uuid;
BEGIN
    -- Insert into product_options table, now including organization_id
    INSERT INTO public.product_options (name, product_id, organization_id)
    VALUES (option_name, p_product_id, p_organization_id)
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
