alter table if exists public.personas
  add column if not exists correo text;
