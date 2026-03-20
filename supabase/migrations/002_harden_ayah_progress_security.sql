ALTER TABLE public.ayah_progress FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ayah_progress FROM PUBLIC;
REVOKE ALL ON TABLE public.ayah_progress FROM anon;
REVOKE ALL ON TABLE public.ayah_progress FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ayah_progress TO authenticated;

DROP POLICY IF EXISTS "Users can view their own ayah progress" ON public.ayah_progress;
DROP POLICY IF EXISTS "Users can insert/update their own ayah progress" ON public.ayah_progress;
DROP POLICY IF EXISTS "Users can update their own ayah progress" ON public.ayah_progress;
DROP POLICY IF EXISTS "Users can delete their own ayah progress" ON public.ayah_progress;

CREATE POLICY "ayah_progress_select_own" ON public.ayah_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "ayah_progress_insert_own" ON public.ayah_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ayah_progress_update_own" ON public.ayah_progress
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ayah_progress_delete_own" ON public.ayah_progress
FOR DELETE
USING (auth.uid() = user_id);

ALTER TABLE public.ayah_progress
  DROP CONSTRAINT IF EXISTS valid_ease_factor,
  DROP CONSTRAINT IF EXISTS valid_interval,
  DROP CONSTRAINT IF EXISTS valid_repetitions;

ALTER TABLE public.ayah_progress
  ADD CONSTRAINT valid_ease_factor CHECK (ease_factor >= 1.3 AND ease_factor <= 3.5),
  ADD CONSTRAINT valid_interval CHECK (interval >= 0 AND interval <= 36500),
  ADD CONSTRAINT valid_repetitions CHECK (repetitions >= 0 AND repetitions <= 10000),
  ADD CONSTRAINT valid_surah_number CHECK (surah_number >= 1 AND surah_number <= 114),
  ADD CONSTRAINT valid_ayah_number CHECK (ayah_number >= 1 AND ayah_number <= 300);

DROP INDEX IF EXISTS public.idx_ayah_progress_next_review;
DROP INDEX IF EXISTS public.idx_ayah_progress_due_now;
DROP INDEX IF EXISTS public.idx_ayah_progress_due_today;

CREATE INDEX IF NOT EXISTS idx_ayah_progress_user_next_review
ON public.ayah_progress (user_id, next_review_date);
