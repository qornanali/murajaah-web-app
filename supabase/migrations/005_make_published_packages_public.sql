ALTER TABLE public.memorization_packages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.memorization_packages FROM PUBLIC;
REVOKE ALL ON TABLE public.memorization_packages FROM anon;
REVOKE ALL ON TABLE public.memorization_packages FROM authenticated;

GRANT SELECT ON TABLE public.memorization_packages TO anon;
GRANT SELECT ON TABLE public.memorization_packages TO authenticated;

DROP POLICY IF EXISTS "memorization_packages_select_published" ON public.memorization_packages;

CREATE POLICY "memorization_packages_select_published" ON public.memorization_packages
FOR SELECT
USING (is_published = true);