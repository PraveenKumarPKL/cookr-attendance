// ─── Employee List ────────────────────────────────────────────────────────────
export const EMPLOYEES = [
  // ── Tech Team ──────────────────────────────────────────────────────────────
  { id: 2,  name: 'Adnan Ahmad Ansari',    email: 'AdnanahmadA@cookr.in',   team: 'tech' },
  { id: 3,  name: 'Darshan K G',           email: 'darshan@cookr.in',        team: 'tech' },
  { id: 5,  name: 'Leslie Savio Lawrence', email: 'LesliesavioL@cookr.in',  team: 'tech' },
  { id: 8,  name: 'Praveenkumar L',        email: 'praveenkumar@cookr.in',   team: 'tech' },
  { id: 9,  name: 'Raja R',                email: 'raja@cookr.in',           team: 'tech' },
  { id: 12, name: 'Santhosh Sivan',        email: 'SanthoshS@cookr.in',      team: 'tech' },
  { id: 14, name: 'Swetharani V',          email: 'SwetharaniV@cookr.in',    team: 'tech' },
  { id: 15, name: 'Tapas Biswas',          email: 'TapasB@cookr.in',         team: 'tech' },
  { id: 16, name: 'Vasanth K',             email: 'vasanth@cookr.in',        team: 'tech' },
  { id: 17, name: 'Yuvaraj S',             email: 'yuvaraj@cookr.in',        team: 'tech' },

  // ── Operations Team ────────────────────────────────────────────────────────
  { id: 1,  name: 'Abhishek P',            email: 'AbhishekP@cookr.in',      team: 'ops'  },
  { id: 4,  name: 'Leena D',               email: 'DLeena@cookr.in',         team: 'ops'  },
  { id: 6,  name: 'Mahadeva C',            email: 'MahadevaC@Nourisho.com',  team: 'ops'  },
  { id: 7,  name: 'Mohammad S',            email: 'MohammadS@cookr.in',      team: 'ops'  },
  { id: 10, name: 'Rajatulhas S',          email: 'RajatulhasS@cookr.in',    team: 'ops'  },
  { id: 11, name: 'Sanjana N',             email: 'SanjanaN@Nourisho.com',   team: 'ops'  },
  { id: 13, name: 'Sneha M',               email: 'SnehaM@cookr.in',         team: 'ops'  },

]

export const TECH_TEAM = EMPLOYEES.filter(e => e.team === 'tech')
export const OPS_TEAM  = EMPLOYEES.filter(e => e.team === 'ops')

// ─── Admin Emails ─────────────────────────────────────────────────────────────
export const ADMIN_EMAILS = [
  'praveenkumar@cookr.in',
  'ArchanaS@cookr.in',
  'AbhishekP@cookr.in',
]

// ─── Status Options ───────────────────────────────────────────────────────────
export const STATUSES = [
  {
    key: 'office_lunch',
    label: '🏢 Office',
    sublabel: '(I\'ll have lunch)',
    color: 'bg-green-500 hover:bg-green-600',
    selectedColor: 'bg-green-600 ring-4 ring-green-300',
    textColor: 'text-white',
  },
  {
    key: 'office_own',
    label: '🏢 Office',
    sublabel: '(bringing own lunch)',
    color: 'bg-teal-500 hover:bg-teal-600',
    selectedColor: 'bg-teal-600 ring-4 ring-teal-300',
    textColor: 'text-white',
  },
  {
    key: 'wfh',
    label: '🏠 Work From Home',
    sublabel: '',
    color: 'bg-blue-500 hover:bg-blue-600',
    selectedColor: 'bg-blue-600 ring-4 ring-blue-300',
    textColor: 'text-white',
  },
  {
    key: 'leave',
    label: '🌴 Leave',
    sublabel: '',
    color: 'bg-orange-500 hover:bg-orange-600',
    selectedColor: 'bg-orange-600 ring-4 ring-orange-300',
    textColor: 'text-white',
  },
]

// ─── UI Shared Constants ──────────────────────────────────────────────────────
export const AVATAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-cookr-500',
  'bg-rose-500', 'bg-amber-500', 'bg-teal-500', 'bg-indigo-500',
  'bg-pink-500', 'bg-lime-600', 'bg-cyan-500', 'bg-fuchsia-500',
  'bg-orange-500', 'bg-green-600', 'bg-blue-600', 'bg-red-500',
  'bg-yellow-600', 'bg-purple-500',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Returns next working day's date (skip weekends) */
export function getNextWorkingDay(fromDate = new Date()) {
  const date = new Date(fromDate)
  // Get current date/time in IST
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  istDate.setDate(istDate.getDate() + 1)
  // Skip Saturday (6) and Sunday (0)
  while (istDate.getDay() === 0 || istDate.getDay() === 6) {
    istDate.setDate(istDate.getDate() + 1)
  }
  // ✅ Use local date parts directly — toISOString() would convert to UTC
  //    and roll the date back by 5h30m for IST users (e.g. 23 Mar → 22 Mar)
  const y = istDate.getFullYear()
  const m = String(istDate.getMonth() + 1).padStart(2, '0')
  const d = String(istDate.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}` // YYYY-MM-DD in IST
}

/** Format date as "Monday, March 23" */
export function formatDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })
}

/** Format date as short "Mon 23" */
export function formatDateShort(dateStr) {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
}

/** Returns the 5 working days (Mon–Fri) for a given Monday date */
function getWeekDays(monday) {
  const days = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const y  = d.getFullYear()
    const m  = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${dd}`)
  }
  return days
}

/** Returns this week's Monday (IST) */
function getMondayIST(istNow) {
  const day = istNow.getDay() // 0=Sun … 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(istNow)
  monday.setDate(istNow.getDate() + diffToMonday)
  return monday
}

/** Returns { thisWeek: string[], nextWeek: string[] } — both Mon–Fri only. */
export function getTwoWeeksWorkingDays() {
  const now    = new Date()
  const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))

  const thisMonday = getMondayIST(istNow)
  const nextMonday = new Date(thisMonday)
  nextMonday.setDate(thisMonday.getDate() + 7)

  return {
    thisWeek: getWeekDays(thisMonday),
    nextWeek: getWeekDays(nextMonday),
  }
}

/** Kept for backward-compat — returns this week + today-on-weekend */
export function getCurrentWeekWorkingDays() {
  return getTwoWeeksWorkingDays().thisWeek
}

/** Short label for a week given its first day, e.g. "Mar 24 – 28" */
export function getWeekRangeLabel(days) {
  if (!days.length) return ''
  const first = new Date(days[0] + 'T12:00:00')
  const last  = new Date(days[days.length - 1] + 'T12:00:00')
  const opts  = { month: 'short', day: 'numeric' }
  return `${first.toLocaleDateString('en-IN', opts)} – ${last.toLocaleDateString('en-IN', { day: 'numeric' })}`
}

/** Returns today's date in YYYY-MM-DD (IST) */
export function getTodayIST() {
  const now = new Date()
  const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const y = istNow.getFullYear()
  const m = String(istNow.getMonth() + 1).padStart(2, '0')
  const d = String(istNow.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
