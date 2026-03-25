# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Does

Daily office attendance tracker for Cookr's Bangalore team (17 employees). Employees submit their next-working-day status (Office+Lunch, Office Own Lunch, WFH, or Leave) via a web form. Scheduled Netlify functions send reminders at 8 AM, 1 PM, and 5 PM IST, and a final report at 11:45 PM IST to all team members.

## Commands

```bash
npm run dev       # Start Vite dev server at http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

No test or lint commands are configured.

## Architecture

### Frontend (React + Vite)
Three pages under `src/pages/`:
- **SubmitPage** (`/`) — employee selector + status form; writes directly to Supabase via client SDK
- **AdminPage** (`/admin`) — password-gated manual overrides; sets `updated_by_admin: true`
- **DashboardPage** (`/dashboard`) — live headcount summary fetched from Supabase

Shared helpers in `src/lib/`:
- `employees.js` — hardcoded list of 17 employees, status type definitions, `getNextWorkingDay()` (IST-aware), `formatDate()`
- `supabase.js` — Supabase client initialised from `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

### Backend (Netlify Scheduled Functions)
All functions are ES modules (`.mjs`) under `netlify/functions/`:

| Function | Cron (UTC) | IST Time | Purpose |
|---|---|---|---|
| `remind.mjs` | `30 2 * * 1-5` | 8:00 AM | 1st reminder |
| `remind-afternoon.mjs` | `30 7 * * 1-5` | 1:00 PM | 2nd reminder |
| `remind-evening.mjs` | `30 11 * * 1-5` | 5:00 PM | 3rd reminder |
| `report-evening.mjs` | `15 12 * * 1-5` | 5:45 PM | Interim report |
| `report.mjs` | `15 18 * * 1-5` | 11:45 PM | Final daily report |

Reminder functions fetch all employees, compare against today's `daily_responses` rows, and email pending employees via Brevo SMTP. The report aggregates all responses and emails 18 recipients (17 team + Archana).

Employee list and `getNextWorkingDay()` are shared via `netlify/functions/lib/employees.mjs` — edit only that file to add/remove employees.

Shared email utilities live in `netlify/functions/lib/notify.mjs`: `sendEmail()`, `buildReminderHtml()`, `buildReport()`, `buildReportHtml()`.

### Database (Supabase)
Single table `daily_responses` with a unique constraint on `(employee_email, date)` — one row per person per day. Frontend does upserts directly using the publishable key. RLS is enabled but allows public read/insert/update (trust-based internal tool). Schema in `supabase-schema.sql`.

### Timezone Handling
All IST dates are derived manually with `toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })`. Cron schedules are UTC; IST = UTC+5:30 (subtract 5h30m from desired IST time). Dates stored as `YYYY-MM-DD` strings in IST.

## Environment Variables

**Frontend** (set in Netlify site env, prefixed `VITE_`):
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
VITE_ADMIN_PASSWORD
```

**Backend** (Netlify Functions, no prefix):
```
SUPABASE_URL
SUPABASE_SERVICE_KEY    # Server-side only — never expose to frontend
BREVO_SMTP_LOGIN
BREVO_SMTP_KEY
APP_URL                 # https://cookr-attendance.netlify.app
```

See `.env.example` for a template (note: example uses Resend; actual deployment uses Brevo SMTP).

## Key Implementation Notes

- **No auth system.** Admin panel is protected by a single hardcoded password (`VITE_ADMIN_PASSWORD`).
- **Email sending** uses `Promise.allSettled()` so one failed delivery doesn't block others.
- **Employee list** is centralised in `netlify/functions/lib/employees.mjs` — all backend functions import from there. To add/remove an employee, edit only that one file.
- **Adding a new scheduled function** requires both a new `.mjs` file in `netlify/functions/` and a `[functions."name"] schedule = "..."` entry in `netlify.toml`.
