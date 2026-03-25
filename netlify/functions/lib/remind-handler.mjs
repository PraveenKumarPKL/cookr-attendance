/**
 * Shared reminder logic — used by remind.mjs, remind-afternoon.mjs, remind-evening.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { sendEmail, buildReminderHtml, sendTeamsPendingReminder } from './notify.mjs'
import { EMPLOYEES, REMINDER_CC, getNextWorkingDay } from './employees.mjs'

export async function runReminder() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  )

  const targetDate = getNextWorkingDay()

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

  const pending = EMPLOYEES.filter(e => !submittedEmails.has(e.email.toLowerCase()))

  if (pending.length === 0) {
    console.log('✅ Everyone submitted! No reminders needed.')
    return new Response('All submitted', { status: 200 })
  }

  const appUrl = process.env.APP_URL || 'https://cookr-attendance.netlify.app'
  const dateLabel = new Date(targetDate + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  await Promise.allSettled([
    ...pending.map(emp =>
      sendEmail({
        to: emp.email,
        subject: `⏰ Attendance reminder – ${dateLabel}`,
        html: buildReminderHtml(emp.name, dateLabel, appUrl),
      })
    ),
    ...REMINDER_CC.map(email =>
      sendEmail({
        to: email,
        subject: `⏰ Attendance reminder – ${dateLabel}`,
        html: buildReminderHtml('Archana', dateLabel, appUrl),
      })
    ),
  ])

  await sendTeamsPendingReminder(pending.map(e => e.name), dateLabel, appUrl)

  console.log(`📧 Sent reminders to ${pending.length} employees:`, pending.map(e => e.name))
  return new Response(
    JSON.stringify({ sent: pending.length, to: pending.map(e => e.name) }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}
