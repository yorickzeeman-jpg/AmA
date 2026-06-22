-- ============================================================
-- AEB PORTAL — EMPLOYER PERSISTENCE
-- Run this in Supabase SQL Editor
-- ============================================================

create table if not exists employers (
  id          text primary key,
  name        text not null,
  number      text,
  industry    text,
  status      text default 'active',
  members     integer default 0,
  contact     text,
  phone       text,
  email       text,
  portal      boolean default false,
  consultant  text,
  created_at  timestamptz default now()
);

create table if not exists benefit_profiles (
  employer_id   text primary key references employers(id) on delete cascade,
  profile_data  jsonb not null,
  updated_at    timestamptz default now()
);

alter table employers disable row level security;
alter table benefit_profiles disable row level security;

grant usage on schema public to anon;
grant all on employers to anon;
grant all on benefit_profiles to anon;

-- ============================================================
