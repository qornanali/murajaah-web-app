ALTER TABLE public.user_memorization_packages
  DROP CONSTRAINT IF EXISTS user_memorization_packages_user_id_fkey;

ALTER TABLE public.user_surah_tracks
  DROP CONSTRAINT IF EXISTS user_surah_tracks_user_id_fkey;
