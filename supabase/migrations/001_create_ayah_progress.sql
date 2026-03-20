-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ayah_progress table
CREATE TABLE
  public.ayah_progress (
    id UUID NOT NULL DEFAULT uuid_generate_v4 (),
    user_id UUID NOT NULL,
    surah_number INT NOT NULL,
    ayah_number INT NOT NULL,
    ease_factor FLOAT NOT NULL DEFAULT 2.5,
    interval INT NOT NULL DEFAULT 0,
    repetitions INT NOT NULL DEFAULT 0,
    next_review_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (user_id, surah_number, ayah_number),
    CONSTRAINT valid_ease_factor CHECK (ease_factor >= 1.3),
    CONSTRAINT valid_interval CHECK (interval >= 0),
    CONSTRAINT valid_repetitions CHECK (repetitions >= 0)
  )
  TABLESPACE pg_default;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ayah_progress_user_id ON public.ayah_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_ayah_progress_user_due ON public.ayah_progress (user_id, next_review_date);

-- Enable RLS (Row Level Security)
ALTER TABLE public.ayah_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can only see/modify their own progress
CREATE POLICY "Users can view their own ayah progress" ON public.ayah_progress AS PERMISSIVE FOR
SELECT
  USING (auth.uid () = user_id);

CREATE POLICY "Users can insert/update their own ayah progress" ON public.ayah_progress AS PERMISSIVE FOR
INSERT
  WITH CHECK (auth.uid () = user_id);

CREATE POLICY "Users can update their own ayah progress" ON public.ayah_progress AS PERMISSIVE FOR
UPDATE
  USING (auth.uid () = user_id);

CREATE POLICY "Users can delete their own ayah progress" ON public.ayah_progress AS PERMISSIVE FOR DELETE USING (auth.uid () = user_id);

-- Grant default permissions (adjust as needed for your service role)
GRANT ALL ON public.ayah_progress TO authenticated;

GRANT SELECT, UPDATE ON public.ayah_progress TO authenticated;
