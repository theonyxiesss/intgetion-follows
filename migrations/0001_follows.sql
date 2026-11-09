-- follows: table company_follows (final state of platform migration 0026). Idempotent.

CREATE TABLE IF NOT EXISTS public.company_follows (
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    last_alert_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.company_follows FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_follows_pkey') THEN
    ALTER TABLE public.company_follows ADD CONSTRAINT company_follows_pkey PRIMARY KEY (user_id, company_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS company_follows_company_idx ON public.company_follows USING btree (company_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_follows_company_id_fkey') THEN
    ALTER TABLE public.company_follows ADD CONSTRAINT company_follows_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_follows_user_id_fkey') THEN
    ALTER TABLE public.company_follows ADD CONSTRAINT company_follows_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END
$$;

ALTER TABLE public.company_follows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_follows' AND policyname = 'company_follows_anon_deny') THEN
    CREATE POLICY company_follows_anon_deny ON public.company_follows TO anon USING (false) WITH CHECK (false);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_follows' AND policyname = 'company_follows_app_rw_all') THEN
    CREATE POLICY company_follows_app_rw_all ON public.company_follows TO app_rw USING (true) WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_follows' AND policyname = 'company_follows_authenticated_deny') THEN
    CREATE POLICY company_follows_authenticated_deny ON public.company_follows TO authenticated USING (false) WITH CHECK (false);
  END IF;
END
$$;

-- Table rights for the app role, as on the platform.
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.company_follows TO app_rw;
