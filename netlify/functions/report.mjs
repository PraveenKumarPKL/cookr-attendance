/**
 * Scheduled report function — runs at 11:45 PM IST (Mon–Fri)
 * IST 11:45 PM = UTC 18:15
 *
 * 1. Fetches all submissions for tomorrow (next working day)
 * 2. Calculates lunch count
 * 3. Sends report email to ALL 10 team members + 3 admins (Archana, Abhishek)
 *    (No Teams webhook needed — everyone gets it in their inbox)
 */
import { createClient } from '@supabase/supabase-js'
import { sendEmail, buildReport, buildReportHtml, sendTeamsReport } from './lib/notify.mjs'
import { EMPLOYEES as ALL_EMPLOYEES, EXTRA_ADMINS, getNextWorkingDay } from './lib/employees.mjs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
)

export default async function handler(req, context) {
  const targetDate = getNextWorkingDay()

  const { data: submissions, error } = await supabase
    .from('daily_responses')
    .select('*')
    .eq('date', targetDate)

  if (error) {
    console.error('Supabase error:', error)
    return new Response('Error fetching data', { status: 500 })
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

  // Send report to ALL employees + extra admins
  const allRecipients = [...new Set([
    ...ALL_EMPLOYEES.map(e => e.email),
    ...EXTRA_ADMINS,
  ])]

  await Promise.allSettled(
    allRecipients.map(email =>
      sendEmail({
        to: email,
        subject: `📊 Attendance Report – ${dateLabel}`,
        html: reportHtml,
      })
    )
  )

  await sendTeamsReport(reportText)

  console.log(`📊 Report sent to ${allRecipients.length} recipients`)
  console.log(reportText)

  return new Response(JSON.stringify({ success: true, date: targetDate, lunchCount }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
