-- Add business settings columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS industry text DEFAULT 'auto',
ADD COLUMN IF NOT EXISTS contract_value text DEFAULT 'auto';

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.industry IS 'Business segment: auto, saas_b2b, saas_b2c, education, other';
COMMENT ON COLUMN public.profiles.contract_value IS 'Average contract value: auto, low, medium, high';