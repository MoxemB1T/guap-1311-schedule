-- Выполните целиком в Supabase: SQL Editor → New query.

create table if not exists public.app_data (
  id text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;

create policy "schedule is visible to everyone"
on public.app_data for select using (true);

-- Изменения выполняет только Edge Function после проверки Telegram ID.
-- Не добавляйте политику INSERT / UPDATE / DELETE для anon или authenticated.

insert into public.app_data (id, value)
values ('schedule', '{"lessons": []}'::jsonb)
on conflict (id) do nothing;
