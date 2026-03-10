alter table if exists public.obras
    add column if not exists notas_internas text;
