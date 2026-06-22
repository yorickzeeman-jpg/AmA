-- ============================================================
-- AEB PORTAL — MEMBERSHIP REGISTER
-- Run this in Supabase SQL Editor
-- ============================================================

create table if not exists membership_register (
  id              text primary key default gen_random_uuid()::text,
  employer_id     text references employers(id) on delete cascade,
  member_name     text not null,
  surname         text,
  id_number       text,
  payroll_number  text,
  benefit_category text,
  provident_fund  boolean default true,
  gla             boolean default true,
  phi             boolean default true,
  medical         boolean default true,
  monthly_premium numeric(10,2),
  status          text default 'Active',
  effective_date  date,
  source_file     text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table membership_register disable row level security;
grant all on membership_register to anon;

-- ============================================================
