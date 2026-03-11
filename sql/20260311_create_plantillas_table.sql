create extension if not exists pgcrypto;

create table if not exists public.plantillas (
  id uuid primary key default gen_random_uuid(),
  category_id text not null,
  name text not null,
  size bigint not null default 0,
  type text not null default 'application/octet-stream',
  data_url text not null,
  date_added timestamptz not null default now()
);

create index if not exists idx_plantillas_category_id
  on public.plantillas (category_id);
