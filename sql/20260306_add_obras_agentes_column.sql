alter table if exists public.obras
  add column if not exists agentes jsonb not null default '[]'::jsonb;
