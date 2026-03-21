-- ═══════════════════════════════════════════════════════════
-- Cookr Attendance App – Supabase Schema
-- Run this in: supabase.com → your project → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Drop existing (only run if starting fresh)
-- drop table if exists daily_responses;

-- ─── Daily Responses Table ────────────────────────────────
create table if not exists daily_responses (
  id                 uuid        default gen_random_uuid() primary key,
  employee_email     text        not null,
  employee_name      text        not null,
  date               date        not null,
  status             text        not null check (
    status in ('office_lunch', 'office_own', 'wfh', 'leave')
  ),
  updated_by_admin   boolean     default false,
  submitted_at       timestamptz default now(),
  updated_at         timestamptz default now(),

  -- One record per employee per day
  unique (employee_email, date)
);

-- ─── Auto-update timestamp on edit ───────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on daily_responses
  for each row execute procedure update_updated_at();

-- ─── Index for fast date queries ─────────────────────────
create index if not exists idx_daily_responses_date
  on daily_responses (date);

-- ─── Row Level Security ───────────────────────────────────
-- Enable RLS
alter table daily_responses enable row level security;

-- Allow public (anon) to insert and select
-- (App has no user auth — trust-based internal tool)
create policy "Allow public read"
  on daily_responses for select
  using (true);

create policy "Allow public insert"
  on daily_responses for insert
  with check (true);

create policy "Allow public update"
  on daily_responses for update
  using (true);

-- ─── Sample data (optional — for testing) ─────────────────
-- insert into daily_responses (employee_email, employee_name, date, status) values
--   ('TapasB@cookr.in',       'Tapas Biswas',          current_date + 1, 'office_lunch'),
--   ('LesliesavioL@cookr.in', 'Leslie Savio Lawrence',  current_date + 1, 'office_own'),
--   ('raja@cookr.in',         'Raja R',                 current_date + 1, 'wfh');
