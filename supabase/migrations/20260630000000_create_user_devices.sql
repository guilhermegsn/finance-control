-- Armazena o push token e last_seen_at de cada dispositivo do usuário.
-- Usado para re-engagement notifications via Edge Function + pg_cron.

CREATE TABLE IF NOT EXISTS public.user_devices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token      text NOT NULL,
  platform        text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Um registro por usuário (simplificado; expandir para multi-device se necessário)
  CONSTRAINT user_devices_user_id_unique UNIQUE (user_id)
);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_devices_updated_at
  BEFORE UPDATE ON public.user_devices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: cada usuário só acessa seu próprio registro
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own device" ON public.user_devices
  FOR ALL USING (auth.uid() = user_id);

-- Edge Functions usam service_role, então não precisam de policy extra
