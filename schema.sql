-- Velaris in Winter: database schema.
-- Run this once in Supabase → SQL Editor → New query → Run. It is safe to run again.
--
-- One table holds every synced thing (task ticks, edits, custom tasks, reward history, settings).
-- Each row is one "item" keyed by (user_id, key). Row Level Security makes every row private to its owner.

create table if not exists public.vw_items (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  key        text        not null,
  data       jsonb       not null default '{}'::jsonb,
  client_ts  bigint      not null,                      -- device timestamp (ms) used to pick the newest edit
  deleted    boolean     not null default false,        -- soft delete, so a delete also syncs
  updated_at timestamptz not null default now(),        -- server time, used for incremental pulls
  primary key (user_id, key)
);

create index if not exists vw_items_user_updated on public.vw_items (user_id, updated_at);

-- ---- Row Level Security: each user can only touch their own rows --------------------------
alter table public.vw_items enable row level security;

drop policy if exists "vw select own" on public.vw_items;
drop policy if exists "vw insert own" on public.vw_items;
drop policy if exists "vw update own" on public.vw_items;
drop policy if exists "vw delete own" on public.vw_items;

create policy "vw select own" on public.vw_items for select to authenticated using (auth.uid() = user_id);
create policy "vw insert own" on public.vw_items for insert to authenticated with check (auth.uid() = user_id);
create policy "vw update own" on public.vw_items for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vw delete own" on public.vw_items for delete to authenticated using (auth.uid() = user_id);

revoke all on public.vw_items from anon;
grant select, insert, update, delete on public.vw_items to authenticated;

-- ---- Conflict handling: an older edit never overwrites a newer one ------------------------
create or replace function public.vw_keep_newest() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.client_ts < old.client_ts then
    return null;            -- stale write from a device that was offline: ignore it
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists vw_keep_newest on public.vw_items;
create trigger vw_keep_newest before insert or update on public.vw_items
  for each row execute function public.vw_keep_newest();

-- ---- Realtime: push changes to your other open devices ------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vw_items') then
    alter publication supabase_realtime add table public.vw_items;
  end if;
end $$;
