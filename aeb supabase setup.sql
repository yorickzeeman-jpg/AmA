-- ============================================================
-- AEB PORTAL — SUPABASE DATABASE SETUP
-- Run this entire script in Supabase SQL Editor once
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── EMPLOYERS ───────────────────────────────────────────────
create table if not exists employers (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  number      text unique not null,
  industry    text,
  status      text default 'active',
  members     integer default 0,
  contact     text,
  phone       text,
  email       text,
  portal      boolean default false,
  created_at  timestamptz default now()
);

-- ── STAFF USERS ─────────────────────────────────────────────
create table if not exists staff (
  id          uuid primary key default uuid_generate_v4(),
  auth_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  email       text unique not null,
  role        text not null default 'administrator',
  avatar      text,
  status      text default 'active',
  employer_id uuid references employers(id),
  created_at  timestamptz default now()
);

-- ── CASES ───────────────────────────────────────────────────
create table if not exists cases (
  id              uuid primary key default uuid_generate_v4(),
  ref             text unique not null,
  workspace       text not null default 'employer',
  case_type_id    text not null,
  employer_id     uuid references employers(id),
  status          text default 'Submitted',
  priority        text default 'Medium',
  assigned_to     uuid references staff(id),
  created_by      uuid references staff(id),
  member_name     text,
  member_id       text,
  current_stage   integer default 0,
  stage_history   jsonb default '[]',
  description     text,
  billing_task_id uuid,
  sla_date        date,
  escalated       boolean default false,
  source          text default 'manual',
  source_file     text,
  billing_required boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── CASE NOTES ──────────────────────────────────────────────
create table if not exists case_notes (
  id         uuid primary key default uuid_generate_v4(),
  case_id    uuid references cases(id) on delete cascade,
  user_id    uuid references staff(id),
  text       text not null,
  created_at timestamptz default now()
);

-- ── CASE DOCUMENTS ──────────────────────────────────────────
create table if not exists case_documents (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid references cases(id) on delete cascade,
  name        text not null,
  size        text,
  type        text,
  uploaded_by uuid references staff(id),
  source      text default 'manual',
  created_at  timestamptz default now()
);

-- ── AUDIT LOG ───────────────────────────────────────────────
create table if not exists audit_log (
  id         uuid primary key default uuid_generate_v4(),
  case_id    uuid references cases(id) on delete cascade,
  user_id    uuid references staff(id),
  action     text not null,
  type       text default 'action',
  created_at timestamptz default now()
);

-- ── BILLING TASKS ───────────────────────────────────────────
create table if not exists billing_tasks (
  id               uuid primary key default uuid_generate_v4(),
  ref              text unique not null,
  linked_case_id   uuid references cases(id),
  linked_case_ref  text,
  employer_id      uuid references employers(id),
  member_name      text,
  transaction_type text,
  effective_date   date,
  assigned_to      uuid references staff(id),
  status           text default 'Pending Billing',
  priority         text default 'Medium',
  created_by       uuid references staff(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── SEED EMPLOYERS ──────────────────────────────────────────
insert into employers (name, number, industry, status, members, contact, phone, email, portal) values
  ('Steelworks SA',        'EMP-001', 'Mining & Steel',  'active', 4200,  'Sandra Botha',          '011 555 0100', 'hr@steelworks.co.za',  true),
  ('MineTrust Group',      'EMP-002', 'Mining',           'active', 12500, 'Kevin Mokoena',         '011 555 0200', 'hr@minetrust.co.za',   true),
  ('PetroLogix',           'EMP-003', 'Petroleum',        'active', 3100,  'Nompumelelo Sithole',   '011 555 0300', 'hr@petrologix.co.za',  false),
  ('BuildRight Holdings',  'EMP-004', 'Construction',     'active', 8700,  'Pieter Swart',          '011 555 0400', 'hr@buildright.co.za',  true),
  ('TransAfrica Logistics','EMP-005', 'Transport',        'review', 5600,  'Zanele Khumalo',        '011 555 0500', 'hr@transafrica.co.za', false),
  ('AMCU',                 'EMP-006', 'Trade Union',      'active', 71000, 'HR Department',         '011 555 0600', 'hr@amcu.co.za',        true)
on conflict (number) do nothing;

-- ── SEED STAFF (create auth users separately via Supabase Auth) ──
-- Staff are linked to auth.users via auth_id after they log in the first time
insert into staff (name, email, role, avatar, status) values
  ('Leandre van der Merwe', 'leandre@amadwala.co.za',  'general_manager', 'LV', 'active'),
  ('Nokulunga Nyundu',      'nokulunga@amadwala.co.za', 'administrator',   'NN', 'active'),
  ('Tevin Nxumalo',         'tevin@amadwala.co.za',     'administrator',   'TN', 'active'),
  ('Sesi Phiri',            'sesi@amadwala.co.za',      'administrator',   'SP', 'active'),
  ('Daleen Taute',          'daleen@amadwala.co.za',    'billing_admin',   'DT', 'active'),
  ('Mahlatse Manyathi',     'mahlatse@amadwala.co.za',  'administrator',   'MM', 'active'),
  ('Ithasia',               'ithasia@amadwala.co.za',   'billing_admin',   'IT', 'active')
on conflict (email) do nothing;

-- ── ROW LEVEL SECURITY ──────────────────────────────────────
alter table employers      enable row level security;
alter table staff          enable row level security;
alter table cases          enable row level security;
alter table case_notes     enable row level security;
alter table case_documents enable row level security;
alter table audit_log      enable row level security;
alter table billing_tasks  enable row level security;

-- Allow authenticated users to read all data
-- (app-level role filtering handles what each user sees)
create policy "Authenticated users can read employers"
  on employers for select to authenticated using (true);

create policy "Authenticated users can read staff"
  on staff for select to authenticated using (true);

create policy "Authenticated users can read cases"
  on cases for select to authenticated using (true);

create policy "Authenticated users can insert cases"
  on cases for insert to authenticated with check (true);

create policy "Authenticated users can update cases"
  on cases for update to authenticated using (true);

create policy "Authenticated users can read notes"
  on case_notes for select to authenticated using (true);

create policy "Authenticated users can insert notes"
  on case_notes for insert to authenticated with check (true);

create policy "Authenticated users can read documents"
  on case_documents for select to authenticated using (true);

create policy "Authenticated users can insert documents"
  on case_documents for insert to authenticated with check (true);

create policy "Authenticated users can read audit"
  on audit_log for select to authenticated using (true);

create policy "Authenticated users can insert audit"
  on audit_log for insert to authenticated with check (true);

create policy "Authenticated users can read billing"
  on billing_tasks for select to authenticated using (true);

create policy "Authenticated users can insert billing"
  on billing_tasks for insert to authenticated with check (true);

create policy "Authenticated users can update billing"
  on billing_tasks for update to authenticated using (true);

-- ── UPDATED_AT TRIGGER ──────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger cases_updated_at
  before update on cases
  for each row execute function update_updated_at();

create trigger billing_updated_at
  before update on billing_tasks
  for each row execute function update_updated_at();

-- ============================================================
-- DONE — all tables created and seeded
-- ============================================================
