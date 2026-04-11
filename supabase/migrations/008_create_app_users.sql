CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qf_user_id TEXT NOT NULL UNIQUE REFERENCES public.qf_user_identities(qf_user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_users_qf_user_id
  ON public.app_users (qf_user_id);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.app_users FROM PUBLIC;
REVOKE ALL ON TABLE public.app_users FROM anon;
REVOKE ALL ON TABLE public.app_users FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_users TO service_role;
