// ─── Employee List ────────────────────────────────────────────────────────────
// All 10 employees who need to submit attendance daily
export const EMPLOYEES = [
  { id: 1, name: 'Adnan Ahmad Ansari',     email: 'AdnanahmadA@cookr.in' },
  { id: 2, name: 'Darshan K G',            email: 'darshan@cookr.in' },
  { id: 3, name: 'Leslie Savio Lawrence',  email: 'LesliesavioL@cookr.in' },
  { id: 4, name: 'Praveenkumar L',         email: 'praveenkumar@cookr.in' },
  { id: 5, name: 'Raja R',                 email: 'raja@cookr.in' },
  { id: 6, name: 'Santhosh Sivan',         email: 'SanthoshS@cookr.in' },
  { id: 7, name: 'Swetharani V',           email: 'SwetharaniV@cookr.in' },
  { id: 8, name: 'Tapas Biswas',           email: 'TapasB@cookr.in' },
  { id: 9, name: 'Vasanth K',              email: 'vasanth@cookr.in' },
  { id: 10, name: 'Yuvaraj S',             email: 'yuvaraj@cookr.in' },
]

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
