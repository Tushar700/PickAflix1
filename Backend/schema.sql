-- ================================================
-- PICKAFLIX — Supabase SQL Schema
-- Run this ONCE in Supabase → SQL Editor
-- ================================================

-- Drop existing if re-running
drop table if exists comments cascade;
drop table if exists profile_likes cascade;
drop table if exists follows cascade;
drop table if exists recommendations cascade;
drop table if exists profiles cascade;
drop function if exists handle_new_user cascade;
drop function if exists increment_likes cascade;
drop function if exists decrement_likes cascade;

-- 1. PROFILES
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  total_likes_received integer default 0 not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. RECOMMENDATIONS
create table recommendations (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  movie_id integer not null,
  title text not null,
  poster_path text,
  release_year text,
  vote_average numeric,
  created_at timestamptz default now(),
  unique(user_id, movie_id)
);

-- 3. FOLLOWS
create table follows (
  follower_id uuid references profiles(id) on delete cascade not null,
  following_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key(follower_id, following_id),
  check(follower_id <> following_id)
);

-- 4. PROFILE LIKES
create table profile_likes (
  liker_id uuid references profiles(id) on delete cascade not null,
  liked_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key(liker_id, liked_id),
  check(liker_id <> liked_id)
);

-- 5. COMMENTS
create table comments (
  id bigint generated always as identity primary key,
  rec_id bigint references recommendations(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  username text not null,
  content text not null,
  created_at timestamptz default now()
);

-- ================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ================================================
-- LIKE COUNT RPC FUNCTIONS
-- ================================================
create or replace function increment_likes(target_id uuid)
returns void as $$
begin
  update profiles set total_likes_received = total_likes_received + 1 where id = target_id;
end;
$$ language plpgsql security definer;

create or replace function decrement_likes(target_id uuid)
returns void as $$
begin
  update profiles set total_likes_received = greatest(0, total_likes_received - 1) where id = target_id;
end;
$$ language plpgsql security definer;

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================
alter table profiles enable row level security;
alter table recommendations enable row level security;
alter table follows enable row level security;
alter table profile_likes enable row level security;
alter table comments enable row level security;

-- PROFILES
create policy "Public read profiles" on profiles for select using (true);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);

-- RECOMMENDATIONS
create policy "Public read recs" on recommendations for select using (true);
create policy "Users insert own recs" on recommendations for insert with check (auth.uid() = user_id);
create policy "Users delete own recs" on recommendations for delete using (auth.uid() = user_id);

-- FOLLOWS
create policy "Public read follows" on follows for select using (true);
create policy "Users can follow" on follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on follows for delete using (auth.uid() = follower_id);

-- PROFILE LIKES
create policy "Public read likes" on profile_likes for select using (true);
create policy "Users can like" on profile_likes for insert with check (auth.uid() = liker_id);
create policy "Users can unlike" on profile_likes for delete using (auth.uid() = liker_id);

-- COMMENTS
create policy "Public read comments" on comments for select using (true);
create policy "Users can comment" on comments for insert with check (auth.uid() = user_id);
create policy "Users delete own comments" on comments for delete using (auth.uid() = user_id);