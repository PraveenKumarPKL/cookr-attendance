/**
 * Test-only endpoint — sends the nightly report ONLY to praveenkumar@cookr.in
 * Triggered manually from the Admin panel "Send Test Report" button.
 */
import { createClient } from '@supabase/supabase-js'
import { sendEmail, buildReport, buildReportHtml, sendTeamsReport } from './lib/notify.mjs'
import { EMPLOYEES as ALL_EMPLOYEES, getTodayIST } from './lib/employees.mjs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
)

export default async function handler(req, context) {
  // Allow both GET (manual curl) and POST (from admin button)
  const targetDate = getTodayIST()

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
  const inOffice = submissions.filter(r => r.status === 'office_lunch' || r.status === 'office_own')
  const wfh = submissions.filter(r => r.status === 'wfh')
  const onLeave = submissions.filter(r => r.status === 'leave')
  const lunchCount = submissions.filter(r => r.status === 'office_lunch').length
  const pending = ALL_EMPLOYEES
    .filter(e => !submittedEmails.has(e.email.toLowerCase()))
    .map(e => e.name)

  const reportText = buildReport({ date: targetDate, inOffice, wfh, onLeave, lunchCount, pending })
  const reportHtml = buildReportHtml(reportText)

  const dateLabel = new Date(targetDate + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  // ⚠️ TEST MODE — send to Praveen, Abhishek & Archana only
  const testRecipients = [
    'praveenkumar@cookr.in',
    'AbhishekP@cookr.in',
    'ArchanaS@cookr.in',
  ]

  const results = await Promise.allSettled(
    testRecipients.map(email =>
      sendEmail({
        to: email,
        subject: `Attendance Report – ${dateLabel}`,
        html: reportHtml,
      })
    )
  )
  const sent = results.some(r => r.status === 'fulfilled' && r.value)

  const teamsResult = await sendTeamsReport(reportText)

  console.log(`🧪 Test report sent | date: ${targetDate} | teams: ${JSON.stringify(teamsResult)}`)

  return new Response(
    JSON.stringify({ success: !!sent, date: targetDate, lunchCount, submissions: submissions.length, teams: teamsResult }),
    { headers: { 'Content-Type': 'application/json' } },
  )
}
