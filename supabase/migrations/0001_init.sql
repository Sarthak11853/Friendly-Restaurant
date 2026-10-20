-- Friendly Restaurant: initial schema.
-- Run in Supabase → SQL Editor (or `supabase db push`).

-- ───────────────────────── profiles ─────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) <= 50),
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Create a profile automatically on sign-up, deriving a unique username.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  base      text;
  candidate text;
begin
  base := left(regexp_replace(lower(split_part(coalesce(new.email, 'user'), '@', 1)), '[^a-z0-9_]', '', 'g'), 15);
  if char_length(base) < 3 then
    base := 'user' || base;
  end if;
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    candidate := base || floor(random() * 10000)::int;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', base), 50),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── friendships ─────────────────────────
create table public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- Only one row per pair, whichever direction it was sent in.
create unique index friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id);

-- Is `other` an accepted friend of the current user?
create or replace function public.is_my_friend(other uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = auth.uid() and addressee_id = other)
        or (requester_id = other and addressee_id = auth.uid()))
  );
$$;

-- Sends a request, or accepts it if the other person already asked us.
-- Returns the resulting status.
create or replace function public.send_friend_request(target uuid)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  me       uuid := auth.uid();
  existing public.friendships;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if target = me then raise exception 'cannot friend yourself'; end if;

  select * into existing from public.friendships
  where (requester_id = me and addressee_id = target) or (requester_id = target and addressee_id = me);

  if not found then
    insert into public.friendships (requester_id, addressee_id) values (me, target);
    return 'pending';
  end if;

  if existing.status = 'pending' and existing.addressee_id = me then
    update public.friendships set status = 'accepted', responded_at = now()
    where requester_id = target and addressee_id = me;
    return 'accepted';
  end if;

  return existing.status;
end;
$$;

create or replace function public.accept_friend_request(requester uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.friendships set status = 'accepted', responded_at = now()
  where requester_id = requester and addressee_id = auth.uid() and status = 'pending';
  if not found then raise exception 'no pending request'; end if;
end;
$$;

revoke execute on function public.is_my_friend(uuid), public.send_friend_request(uuid), public.accept_friend_request(uuid) from public, anon;
grant execute on function public.is_my_friend(uuid), public.send_friend_request(uuid), public.accept_friend_request(uuid) to authenticated;

-- ───────────────────────── places ─────────────────────────
create table public.places (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null check (provider in ('osm', 'google')),
  provider_id text not null,
  name        text not null,
  address     text,
  lat         double precision not null,
  lng         double precision not null,
  category    text,
  created_at  timestamptz not null default now(),
  unique (provider, provider_id)
);

-- ───────────────────────── reviews ─────────────────────────
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  place_id     uuid not null references public.places (id) on delete cascade,
  rating       smallint not null check (rating between 1 and 5),
  body         text check (char_length(body) <= 2000),
  must_try     text check (char_length(must_try) <= 120),
  price_level  smallint check (price_level between 1 and 4),
  would_return boolean,
  visited_on   date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, place_id)
);
create index reviews_place_idx on public.reviews (place_id);
create index reviews_created_idx on public.reviews (created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger reviews_touch before update on public.reviews
  for each row execute function public.touch_updated_at();

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profiles    enable row level security;
alter table public.friendships enable row level security;
alter table public.places      enable row level security;
alter table public.reviews     enable row level security;

create policy "profiles readable by signed-in users" on public.profiles
  for select to authenticated using (true);
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Inserts and accepts go through the functions above; either side may delete
-- (cancel, decline, or unfriend).
create policy "see own friendships" on public.friendships
  for select to authenticated using (auth.uid() in (requester_id, addressee_id));
create policy "delete own friendships" on public.friendships
  for delete to authenticated using (auth.uid() in (requester_id, addressee_id));

-- Places are created only by the server (secret key) from signed search results.
create policy "places readable by signed-in users" on public.places
  for select to authenticated using (true);

-- The core rule: you can only ever see your own and your friends' reviews.
create policy "read own and friends' reviews" on public.reviews
  for select to authenticated
  using (user_id = auth.uid() or public.is_my_friend(user_id));
create policy "insert own reviews" on public.reviews
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own reviews" on public.reviews
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own reviews" on public.reviews
  for delete to authenticated using (user_id = auth.uid());
