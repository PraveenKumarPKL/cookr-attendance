/**
 * Test-only endpoint — sends the nightly report ONLY to praveenkumar@cookr.in
 * Triggered manually from the Admin panel "Send Test Report" button.
 */
import { createClient } from '@supabase/supabase-js'
import { sendEmail, buildReport, buildReportHtml } from './lib/notify.mjs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
)

const ALL_EMPLOYEES = [
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
  while (ist.getDay() === 0 || ist.getDay() === 6) ist.setDate(ist.getDate() + 1)
  const y  = ist.getFullYear()
  const m  = String(ist.getMonth() + 1).padStart(2, '0')
  const d  = String(ist.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default async function handler(req, context) {
  // Allow both GET (manual curl) and POST (from admin button)
  const targetDate = getNextWorkingDay()

  const { data: submissions, error } = await supabase
    .from('daily_responses')
    .select('*')
    .eq('date', targetDate)

  if (error) {
    console.error('Supabase error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const submittedEmails = new Set(submissions.map(s => s.employee_email.toLowerCase()))
  const inOffice   = submissions.filter(r => r.status === 'office_lunch' || r.status === 'office_own')
  const wfh        = submissions.filter(r => r.status === 'wfh')
  const onLeave    = submissions.filter(r => r.status === 'leave')
  const lunchCount = submissions.filter(r => r.status === 'office_lunch').length
  const pending    = ALL_EMPLOYEES
    .filter(e => !submittedEmails.has(e.email.toLowerCase()))
    .map(e => e.name)

  const reportText = buildReport({ date: targetDate, inOffice, wfh, onLeave, lunchCount, pending })
  const reportHtml = buildReportHtml(reportText)

  const dateLabel = new Date(targetDate + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  // ⚠️ TEST MODE — send only to Praveen
  const sent = await sendEmail({
    to: 'praveenkumar@cookr.in',
    subject: `🧪 [TEST] Attendance Report – ${dateLabel}`,
    html: reportHtml,
  })

  console.log(`🧪 Test report sent to praveenkumar@cookr.in | date: ${targetDate}`)

  return new Response(
    JSON.stringify({ success: !!sent, date: targetDate, lunchCount, submissions: submissions.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
}
