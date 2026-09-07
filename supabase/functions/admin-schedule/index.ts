import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ADMIN_TELEGRAM_ID = '559546940'

async function validTelegramUser(initData: string) {
  const parts = new URLSearchParams(initData)
  const hash = parts.get('hash')
  if (!hash) return false
  parts.delete('hash')
  const check = [...parts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n')
  const secret = await crypto.subtle.importKey('raw', new TextEncoder().encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const webAppKey = await crypto.subtle.sign('HMAC', secret, new TextEncoder().encode(Deno.env.get('TELEGRAM_BOT_TOKEN')!))
  const key = await crypto.subtle.importKey('raw', webAppKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(check)))].map(x => x.toString(16).padStart(2, '0')).join('')
  if (signature !== hash) return false
  const user = JSON.parse(parts.get('user') || '{}')
  return String(user.id) === ADMIN_TELEGRAM_ID
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } })
  try {
    const body = await request.json()
    if (!(await validTelegramUser(body.initData || ''))) return Response.json({ error: 'Доступ разрешён только администратору Telegram.' }, { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } })
    if (body.action === 'check') return Response.json({ ok: true }, { headers: { 'Access-Control-Allow-Origin': '*' } })
    if (body.action !== 'save' || !Array.isArray(body.schedule)) return Response.json({ error: 'Некорректные данные.' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } })
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { error } = await db.from('app_data').upsert({ id: 'schedule', value: { lessons: body.schedule, currentWeek: body.currentWeek }, updated_at: new Date().toISOString() })
    if (error) throw error
    return Response.json({ ok: true }, { headers: { 'Access-Control-Allow-Origin': '*' } })
  } catch (error) { return Response.json({ error: String(error.message || error) }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }) }
})
