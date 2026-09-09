-- Lista de compras compartilhada (uso doméstico).
-- Projeto sem autenticação: a policy abaixo libera leitura e escrita para a
-- chave anon. Qualquer pessoa com a URL do app consegue ler e alterar a lista.
-- Tabela isolada das demais deste projeto Supabase (ex: wishlist).

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  completed boolean not null default false,
  position double precision not null default extract(epoch from now()),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists shopping_items_pending_idx
  on public.shopping_items (position)
  where not completed;

create index if not exists shopping_items_completed_idx
  on public.shopping_items (completed_at desc)
  where completed;

alter table public.shopping_items enable row level security;

drop policy if exists "acesso publico a shopping_items" on public.shopping_items;
create policy "acesso publico a shopping_items"
  on public.shopping_items
  for all
  to anon, authenticated
  using (true)
  with check (true);

alter publication supabase_realtime add table public.shopping_items;
