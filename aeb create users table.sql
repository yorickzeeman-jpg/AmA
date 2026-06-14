-- ============================================================
-- AEB PORTAL — CUSTOM AUTH (no email required)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Create a simple users table with name + password
create table if not exists portal_users (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  password   text not null,
  role       text not null default 'administrator',
  avatar     text,
  status     text default 'active',
  created_at timestamptz default now()
);

-- Disable RLS so the app can query it directly
alter table portal_users disable row level security;

-- Insert all staff
insert into portal_users (name, password, role, avatar) values
  ('Yorick',    'Yorick2017', 'general_manager', 'YZ'),
  ('Leandre',   'Yorick2017', 'general_manager', 'LV'),
  ('Nokulunga', 'Yorick2017', 'administrator',   'NN'),
  ('Tevin',     'Yorick2017', 'administrator',   'TN'),
  ('Sesi',      'Yorick2017', 'administrator',   'SP'),
  ('Daleen',    'Yorick2017', 'billing_admin',   'DT'),
  ('Mahlatse',  'Yorick2017', 'administrator',   'MM'),
  ('Ithasia',   'Yorick2017', 'billing_admin',   'IT')
on conflict (name) do nothing;

-- ============================================================
-- DONE — staff log in with first name + Yorick2017
-- No email. No email address. Ever.
-- ============================================================
