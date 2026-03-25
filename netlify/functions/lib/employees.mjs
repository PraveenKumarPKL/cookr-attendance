// Single source of truth for employee list and shared helpers.
// Import this in all backend functions instead of hardcoding.

export const EMPLOYEES = [
  // ── Tech Team ────────────────────────────────────────────────────────────
  { id: 2,  name: 'Adnan Ahmad Ansari',    email: 'AdnanahmadA@cookr.in',    team: 'tech' },
  { id: 3,  name: 'Darshan K G',           email: 'darshan@cookr.in',         team: 'tech' },
  { id: 5,  name: 'Leslie Savio Lawrence', email: 'LesliesavioL@cookr.in',   team: 'tech' },
  { id: 8,  name: 'Praveenkumar L',        email: 'praveenkumar@cookr.in',    team: 'tech' },
  { id: 9,  name: 'Raja R',                email: 'raja@cookr.in',            team: 'tech' },
  { id: 12, name: 'Santhosh Sivan',        email: 'SanthoshS@cookr.in',       team: 'tech' },
  { id: 14, name: 'Swetharani V',          email: 'SwetharaniV@cookr.in',     team: 'tech' },
  { id: 15, name: 'Tapas Biswas',          email: 'TapasB@cookr.in',          team: 'tech' },
  { id: 16, name: 'Vasanth K',             email: 'vasanth@cookr.in',         team: 'tech' },
  { id: 17, name: 'Yuvaraj S',             email: 'yuvaraj@cookr.in',         team: 'tech' },

  // ── Operations Team ───────────────────────────────────────────────────────
  { id: 1,  name: 'Abhishek P',            email: 'AbhishekP@cookr.in',       team: 'ops'  },
  { id: 4,  name: 'Leena D',               email: 'DLeena@cookr.in',          team: 'ops'  },
  { id: 6,  name: 'Mahadeva C',            email: 'MahadevaC@Nourisho.com',   team: 'ops'  },
  { id: 7,  name: 'Mohammad S',            email: 'MohammadS@cookr.in',       team: 'ops'  },
  { id: 10, name: 'Rajatulhas S',          email: 'RajatulhasS@cookr.in',     team: 'ops'  },
  { id: 11, name: 'Sanjana N',             email: 'SanjanaN@Nourisho.com',    team: 'ops'  },
  { id: 13, name: 'Sneha M',               email: 'SnehaM@cookr.in',          team: 'ops'  },

]

export const TECH_TEAM = EMPLOYEES.filter(e => e.team === 'tech')
export const OPS_TEAM  = EMPLOYEES.filter(e => e.team === 'ops')

// Receives reports but doesn't submit attendance
export const EXTRA_ADMINS = [
  'ArchanaS@cookr.in',
]

// Receives reminder emails (stays in the loop) but doesn't submit attendance
export const REMINDER_CC = [
  'ArchanaS@cookr.in',
]

export function getNextWorkingDay() {
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  ist.setDate(ist.getDate() + 1)
  while (ist.getDay() === 0 || ist.getDay() === 6) ist.setDate(ist.getDate() + 1)
  // Use local date parts — toISOString() would convert to UTC and roll the date back for IST
  const y = ist.getFullYear()
  const m = String(ist.getMonth() + 1).padStart(2, '0')
  const d = String(ist.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getTodayIST() {
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const y = ist.getFullYear()
  const m = String(ist.getMonth() + 1).padStart(2, '0')
  const d = String(ist.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
