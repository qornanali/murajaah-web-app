CREATE TABLE IF NOT EXISTS public.qf_user_identities (
  qf_user_id TEXT PRIMARY KEY,
  qf_sub TEXT UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  granted_scopes TEXT NOT NULL DEFAULT '',
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qf_user_identities_qf_sub
  ON public.qf_user_identities (qf_sub);

ALTER TABLE public.qf_user_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qf_user_identities FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.qf_user_identities FROM PUBLIC;
REVOKE ALL ON TABLE public.qf_user_identities FROM anon;
REVOKE ALL ON TABLE public.qf_user_identities FROM authenticated;
