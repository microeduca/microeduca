ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS password_hash TEXT;


