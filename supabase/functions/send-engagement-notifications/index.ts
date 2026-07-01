/**
 * Supabase Edge Function: send-engagement-notifications
 *
 * Dispara diariamente via pg_cron. Busca usuários inativos há mais de
 * `inactive_days` dias e envia push notification via Expo Push API.
 *
 * Para agendar com pg_cron (rodar no SQL Editor do Supabase):
 *
 *   SELECT cron.schedule(
 *     'engagement-notifications',
 *     '0 23 * * *',   -- todo dia às 23:00 UTC (20:00 BRT)
 *     $$
 *       SELECT net.http_post(
 *         url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-engagement-notifications',
 *         headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb,
 *         body := '{"inactive_days": 7}'::jsonb
 *       );
 *     $$
 *   );
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
};

async function sendExpoPushNotifications(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  // Expo Push API accepts batches of up to 100 messages
  const chunks: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(chunk),
    });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const body = await req.json().catch(() => ({}));
  const inactiveDays: number = body.inactive_days ?? 7;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - inactiveDays);

  const { data: devices, error } = await supabase
    .from('user_devices')
    .select('push_token')
    .lt('last_seen_at', cutoff.toISOString());

  if (error) {
    console.error('Error fetching inactive devices:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!devices || devices.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const messages: PushMessage[] = devices
    .filter((d) => d.push_token?.startsWith('ExponentPushToken'))
    .map((d) => ({
      to: d.push_token,
      title: 'Oi, sumiu! 👋',
      body: 'Seus dados financeiros estão esperando por você. Que tal uma atualização rápida?',
      sound: 'default',
      data: { type: 'engagement' },
    }));

  await sendExpoPushNotifications(messages);

  return new Response(JSON.stringify({ sent: messages.length }), { status: 200 });
});
