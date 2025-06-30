-- Add is_active column to product_options table with default value true
ALTER TABLE public.product_options
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
