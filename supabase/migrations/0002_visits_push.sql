-- Friendly Restaurant: visit reminders + push notifications.
-- Run after 0001_init.sql in Supabase → SQL Editor.

-- ───────────────────────── visits ─────────────────────────
-- A place the user was detected at and asked to be reminded about.
-- Only the place is stored, never the user's raw location.
create table public.visits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  place_id    uuid not null references public.places (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  remind_at   timestamptz,
  notified_at timestamptz,
  created_at  timestamptz not null default now()
);
create index visits_user_idx on public.visits (user_id, status, created_at desc);
create index visits_due_idx on public.visits (remind_at) where status = 'pending' and notified_at is null;

alter table public.visits enable row level security;

create policy "read own visits" on public.visits
  for select to authenticated using (user_id = auth.uid());
create policy "insert own visits" on public.visits
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own visits" on public.visits
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own visits" on public.visits
  for delete to authenticated using (user_id = auth.uid());

-- Reviewing a place closes any pending visit to it.
create or replace function public.close_visits_on_review()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.visits set status = 'reviewed'
  where user_id = new.user_id and place_id = new.place_id and status = 'pending';
  return new;
end;
$$;

create trigger reviews_close_visits after insert on public.reviews
  for each row execute function public.close_visits_on_review();

-- ───────────────────────── push_subscriptions ─────────────────────────
-- One row per browser/device that allowed notifications.
-- Written only by the server (secret key); users can see their own.
create table public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "read own push subscriptions" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
