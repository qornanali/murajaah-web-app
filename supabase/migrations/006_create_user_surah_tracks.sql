CREATE TABLE IF NOT EXISTS public.user_surah_tracks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surah_number INT NOT NULL CHECK (surah_number >= 1 AND surah_number <= 114),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, surah_number)
);

CREATE INDEX IF NOT EXISTS idx_user_surah_tracks_user_id
  ON public.user_surah_tracks (user_id);

ALTER TABLE public.user_surah_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_surah_tracks FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_surah_tracks FROM PUBLIC;
REVOKE ALL ON TABLE public.user_surah_tracks FROM anon;
REVOKE ALL ON TABLE public.user_surah_tracks FROM authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.user_surah_tracks TO authenticated;

CREATE POLICY "user_surah_tracks_select_own" ON public.user_surah_tracks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "user_surah_tracks_insert_own" ON public.user_surah_tracks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_surah_tracks_delete_own" ON public.user_surah_tracks
FOR DELETE
USING (auth.uid() = user_id);
