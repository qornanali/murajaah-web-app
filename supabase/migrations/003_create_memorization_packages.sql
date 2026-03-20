CREATE TABLE IF NOT EXISTS public.memorization_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  starter_surah_number INT NOT NULL CHECK (starter_surah_number >= 1 AND starter_surah_number <= 114),
  starter_ayah_number INT NOT NULL CHECK (starter_ayah_number >= 1 AND starter_ayah_number <= 300),
  selector JSONB NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'memorization_packages_title_key'
  ) THEN
    ALTER TABLE public.memorization_packages
      ADD CONSTRAINT memorization_packages_title_key UNIQUE (title);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_memorization_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.memorization_packages(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  daily_new_target INT NOT NULL DEFAULT 3 CHECK (daily_new_target >= 0 AND daily_new_target <= 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, package_id)
);

CREATE INDEX IF NOT EXISTS idx_memorization_packages_published
  ON public.memorization_packages (is_published, category);

CREATE INDEX IF NOT EXISTS idx_user_memorization_packages_user_status
  ON public.user_memorization_packages (user_id, status);

ALTER TABLE public.memorization_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorization_packages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_memorization_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memorization_packages FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.memorization_packages FROM PUBLIC;
REVOKE ALL ON TABLE public.memorization_packages FROM anon;
REVOKE ALL ON TABLE public.memorization_packages FROM authenticated;

REVOKE ALL ON TABLE public.user_memorization_packages FROM PUBLIC;
REVOKE ALL ON TABLE public.user_memorization_packages FROM anon;
REVOKE ALL ON TABLE public.user_memorization_packages FROM authenticated;

GRANT SELECT ON TABLE public.memorization_packages TO authenticated;
GRANT SELECT ON TABLE public.memorization_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_memorization_packages TO authenticated;

CREATE POLICY "memorization_packages_select_published" ON public.memorization_packages
FOR SELECT
USING (is_published = true);

CREATE POLICY "user_memorization_packages_select_own" ON public.user_memorization_packages
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "user_memorization_packages_insert_own" ON public.user_memorization_packages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_memorization_packages_update_own" ON public.user_memorization_packages
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_memorization_packages_delete_own" ON public.user_memorization_packages
FOR DELETE
USING (auth.uid() = user_id);

INSERT INTO public.memorization_packages (
  title,
  description,
  category,
  starter_surah_number,
  starter_ayah_number,
  selector,
  is_published
)
VALUES
  (
    'Surah Al-Fatihah',
    'Memorize Surah Al-Fatihah verse by verse.',
    'surah',
    1,
    1,
    '{"type":"surah","surahNumber":1}',
    true
  ),
  (
    'Last 10 Ayat of Al-Kahf',
    'Memorize and review the closing ten verses of Surah Al-Kahf.',
    'range',
    18,
    101,
    '{"type":"range","surahNumber":18,"startAyah":101,"endAyah":110}',
    true
  ),
  (
    'Juz Amma',
    'Focused memorization track for Juz Amma (Juz 30).',
    'juz',
    78,
    1,
    '{"type":"juz","juzNumber":30}',
    true
  ),
  (
    'Daily Salah Surahs',
    'A short-surah package commonly recited in daily prayers.',
    'theme',
    112,
    1,
    '{"type":"list","verseKeys":["112:1","113:1","114:1"]}',
    true
  ),
  (
    'Three Quls',
    'Memorize Surah Al-Ikhlas, Al-Falaq, and An-Nas.',
    'theme',
    112,
    1,
    '{"type":"list","verseKeys":["112:1","113:1","114:1"]}',
    true
  ),
  (
    'Ayat Al-Kursi + Baqarah Closing',
    'Memorize Ayat Al-Kursi and the last two ayahs of Surah Al-Baqarah.',
    'theme',
    2,
    255,
    '{"type":"list","verseKeys":["2:255","2:285","2:286"]}',
    true
  ),
  (
    'Juz Tabarak',
    'Focused memorization track for Juz 29 (Tabarak).',
    'juz',
    67,
    1,
    '{"type":"juz","juzNumber":29}',
    true
  ),
  (
    'Surah Al-Mulk',
    'Memorize Surah Al-Mulk with daily spaced repetition.',
    'surah',
    67,
    1,
    '{"type":"surah","surahNumber":67}',
    true
  ),
  (
    'Friday Program',
    'Weekly Friday program focused on key verses in Surah Al-Kahf.',
    'theme',
    18,
    1,
    '{"type":"list","verseKeys":["18:1","18:10","18:23","18:45","18:101"]}',
    true
  ),
  (
    'Surah As-Sajdah',
    'Memorize Surah As-Sajdah for weekly recitation practice.',
    'surah',
    32,
    1,
    '{"type":"surah","surahNumber":32}',
    true
  ),
  (
    'Surah Al-Insan',
    'Memorize Surah Al-Insan with phrase-based review.',
    'surah',
    76,
    1,
    '{"type":"surah","surahNumber":76}',
    true
  ),
  (
    'Morning Protection Verses',
    'Commonly recited protection verses for morning remembrance.',
    'theme',
    2,
    255,
    '{"type":"list","verseKeys":["2:255","112:1","113:1","114:1"]}',
    true
  ),
  (
    'Evening Protection Verses',
    'Commonly recited protection verses for evening remembrance.',
    'theme',
    2,
    255,
    '{"type":"list","verseKeys":["2:255","112:1","113:1","114:1"]}',
    true
  ),
  (
    '30-Day Short Surah Program',
    'A month-long memorization plan for selected short surahs.',
    'theme',
    87,
    1,
    '{"type":"list","verseKeys":["87:1","88:1","89:1","90:1","91:1","92:1","93:1","94:1","95:1","96:1","97:1","98:1","99:1","100:1","101:1","102:1","103:1","104:1","105:1","106:1","107:1","108:1","109:1","110:1","111:1","112:1","113:1","114:1"]}',
    true
  ),
  (
    'Ramadan Review Program',
    'A guided package for balanced memorization and daily revision in Ramadan.',
    'theme',
    1,
    1,
    '{"type":"range","surahNumber":2,"startAyah":1,"endAyah":20}',
    true
  )
ON CONFLICT (title) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  starter_surah_number = EXCLUDED.starter_surah_number,
  starter_ayah_number = EXCLUDED.starter_ayah_number,
  selector = EXCLUDED.selector,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();
