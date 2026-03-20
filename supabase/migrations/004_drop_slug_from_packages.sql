ALTER TABLE public.memorization_packages
  ADD COLUMN IF NOT EXISTS code UUID;

UPDATE public.memorization_packages
SET code = COALESCE(code, uuid_generate_v4());

ALTER TABLE public.memorization_packages
  ALTER COLUMN code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'memorization_packages_code_key'
  ) THEN
    ALTER TABLE public.memorization_packages
      ADD CONSTRAINT memorization_packages_code_key UNIQUE (code);
  END IF;
END $$;

ALTER TABLE public.memorization_packages
  DROP COLUMN IF EXISTS slug;
