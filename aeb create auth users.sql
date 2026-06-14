-- ============================================================
-- AEB PORTAL — CREATE AUTH USERS
-- Run this in Supabase SQL Editor AFTER the setup script
-- This creates login accounts for all staff
-- ============================================================

-- Create auth users with temporary passwords
-- Staff must change their password on first login

select auth.create_user(
  uid        := gen_random_uuid(),
  email      := 'leandre@amadwala.co.za',
  password   := 'AEB@Leandre2024',
  email_confirm := true
);

select auth.create_user(
  uid        := gen_random_uuid(),
  email      := 'nokulunga@amadwala.co.za',
  password   := 'AEB@Nokulunga2024',
  email_confirm := true
);

select auth.create_user(
  uid        := gen_random_uuid(),
  email      := 'tevin@amadwala.co.za',
  password   := 'AEB@Tevin2024',
  email_confirm := true
);

select auth.create_user(
  uid        := gen_random_uuid(),
  email      := 'sesi@amadwala.co.za',
  password   := 'AEB@Sesi2024',
  email_confirm := true
);

select auth.create_user(
  uid        := gen_random_uuid(),
  email      := 'daleen@amadwala.co.za',
  password   := 'AEB@Daleen2024',
  email_confirm := true
);

select auth.create_user(
  uid        := gen_random_uuid(),
  email      := 'mahlatse@amadwala.co.za',
  password   := 'AEB@Mahlatse2024',
  email_confirm := true
);

select auth.create_user(
  uid        := gen_random_uuid(),
  email      := 'ithasia@amadwala.co.za',
  password   := 'AEB@Ithasia2024',
  email_confirm := true
);

-- ============================================================
-- STAFF LOGIN CREDENTIALS (share privately with each person)
-- leandre@amadwala.co.za    / AEB@Leandre2024
-- nokulunga@amadwala.co.za  / AEB@Nokulunga2024
-- tevin@amadwala.co.za      / AEB@Tevin2024
-- sesi@amadwala.co.za       / AEB@Sesi2024
-- daleen@amadwala.co.za     / AEB@Daleen2024
-- mahlatse@amadwala.co.za   / AEB@Mahlatse2024
-- ithasia@amadwala.co.za    / AEB@Ithasia2024
-- ============================================================
