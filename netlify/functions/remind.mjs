/**
 * Scheduled reminder function
 * Runs at 8 AM, 1 PM, and 5 PM IST (Mon–Fri)
 * Sends email reminders to employees who haven't submitted yet
 *
 * IST = UTC+5:30, so:
 *   8:00 AM IST  = 02:30 UTC
 *   1:00 PM IST  = 07:30 UTC
 *   5:00 PM IST  = 11:30 UTC
 */
import { createClient } from '@supabase/supabase-js'
import { sendEmail, buildReminderHtml } from './lib/notify.mjs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
)

// All 10 employees (same list as frontend)
const EMPLOYEES = [
  { name: 'Adnan Ahmad Ansari',    email: 'AdnanahmadA@cookr.in' },
  { name: 'Darshan K G',           email: 'darshan@cookr.in' },
  { name: 'Leslie Savio Lawrence', email: 'LesliesavioL@cookr.in' },
  { name: 'Praveenkumar L',        email: 'praveenkumar@cookr.in' },
  { name: 'Raja R',                email: 'raja@cookr.in' },
  { name: 'Santhosh Sivan',        email: 'SanthoshS@cookr.in' },
  { name: 'Swetharani V',          email: 'SwetharaniV@cookr.in' },
  { name: 'Tapas Biswas',          email: 'TapasB@cookr.in' },
  { name: 'Vasanth K',             email: 'vasanth@cookr.in' },
  { name: 'Yuvaraj S',             email: 'yuvaraj@cookr.in' },
]

function getNextWorkingDay() {
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  ist.setDate(ist.getDate() + 1)
  while (ist.getDay() === 0 || ist.getDay() === 6) {
    ist.setDate(ist.getDate() + 1)
  }
  return ist.toISOString().split('T')[0]
}

export default async function handler(req, context) {
  const targetDate = getNextWorkingDay()

  // Get today's (next working day's) submissions
  const { data: submissions, error } = await supabase
    .from('daily_responses')
    .select('employee_email')
    .eq('date', targetDate)

  if (error) {
    console.error('Supabase error:', error)
    return new Response('Error fetching submissions', { status: 500 })
  }

  const submittedEmails = new Set(
    submissions.map(s => s.employee_email.toLowerCase())
  )

  // Find who hasn't submitted
  const pending = EMPLOYEES.filter(e => !submittedEmails.has(e.email.toLowerCase()))

  if (pending.length === 0) {
    console.log('✅ Everyone submitted! No reminders needed.')
    return new Response('All submitted', { status: 200 })
  }

  const appUrl = process.env.APP_URL || 'https://your-app.netlify.app'
  const dateLabel = new Date(targetDate + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  // Send reminders in parallel
  await Promise.allSettled(
    pending.map(emp =>
      sendEmail({
        to: emp.email,
        subject: `⏰ Attendance reminder – ${dateLabel}`,
        html: buildReminderHtml(emp.name, dateLabel, appUrl),
      })
    )
  )

  console.log(`📧 Sent reminders to ${pending.length} employees:`, pending.map(e => e.name))
  return new Response(
    JSON.stringify({ sent: pending.length, to: pending.map(e => e.name) }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}
