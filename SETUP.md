# Cookr Attendance App – Setup Guide

## What this app does
- Employees select their name + status (Office/WFH/Leave) for the next working day
- Reminders sent at **8 AM, 1 PM, 5 PM** via email to whoever hasn't submitted
- At **11:45 PM**, a final report is sent to the Teams group chat + admin emails
- Admins (Praveenkumar, Archana, Abhishek) can manually update anyone's status

---

## Step 1 — Supabase (Free Database)

1. Go to [supabase.com](https://supabase.com) → **New project** // Prvn@123Office
2. Name it: `cookr-attendance` → Choose a strong DB password → Create
3. Wait ~2 min for it to boot
4. Go to **SQL Editor** → paste the full contents of `supabase-schema.sql` → click **Run**
5. Go to **Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY` ⚠️ keep this secret!

---

## Step 2 — Resend (Free Email)

1. Go to [resend.com](https://resend.com) → Sign up free
2. Go to **Domains** → Add your domain `cookr.in` → add the DNS records shown
3. Once verified, go to **API Keys** → Create key → copy it → `RESEND_API_KEY`
4. Set `FROM_EMAIL` to `attendance@cookr.in`

> **Note:** Resend free tier = 100 emails/day. Your team sends ~30-40/day worst case. Plenty!

---

## Step 3 — Power Automate (Teams notification)

1. Open [make.powerautomate.com](https://make.powerautomate.com) with your work account
2. **New flow → Instant cloud flow → When an HTTP request is received**
3. Add next step: **Post message in a chat or channel** → choose **Group chat**
4. Select the **"Bangalore Team – Office Availability"** group chat
5. In the **Message** field, use dynamic content: `body/text`
6. Save the flow → copy the **HTTP POST URL** → `TEAMS_WEBHOOK_URL`

---

## Step 4 — Local Development

```bash
# Clone / open the project folder
cd attendance-app

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
# → Fill in your actual values from steps 1-3

# Run locally
npm run dev
# Opens at http://localhost:5173
```

---

## Step 5 — Deploy to Netlify (Free)

1. Go to [netlify.com](https://netlify.com) → Sign up → **Add new site → Import from Git**
2. Connect your GitHub/GitLab repo (push this folder first)
3. Build settings auto-detected from `netlify.toml`
4. Go to **Site configuration → Environment variables** → add ALL variables from `.env.example`
5. Trigger a deploy → your site goes live!

> **Tip:** After deploy, update `APP_URL` in Netlify env vars to your actual Netlify URL.

---

## Pages

| URL | Description |
|-----|-------------|
| `/` | Employee submit page (main page) |
| `/admin` | Admin manual update (password protected) |
| `/dashboard` | Live headcount view |

---

## Cron Schedule (IST)

| Time | Action |
|------|--------|
| 8:00 AM | Email reminder to non-submitters |
| 1:00 PM | Email reminder (2nd round) |
| 5:00 PM | Email reminder (3rd round) |
| 11:45 PM | Final report → Teams + admin emails |

---

## Admin Password

Set `VITE_ADMIN_PASSWORD` in Netlify env vars. Default in code: `cookr@admin2024`
Share this with: Praveenkumar, Archana, Abhishek

---

## Report Format (Teams + Email)

```
📅 Monday, March 23 – Tech Team Availability

🏢 In Office (4):
1. Tapas Biswas
2. Leslie Savio Lawrence (bringing own lunch)
3. Swetharani V
4. Praveenkumar L

🏠 WFH (6):
1. Raja R
2. Santhosh Sivan
...

🍽️ Lunch Count: 3
```
