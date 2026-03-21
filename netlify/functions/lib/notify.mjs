/**
 * Notification helpers
 * - sendEmail()  → Brevo SMTP (free 300 emails/day, sends FROM praveenkumar@cookr.in)
 * - Teams webhook removed — report goes to all employees via email instead
 */
import nodemailer from 'nodemailer'

const BREVO_LOGIN = process.env.BREVO_SMTP_LOGIN  // a5a2d4001@smtp-brevo.com
const BREVO_KEY   = process.env.BREVO_SMTP_KEY    // xsmtpsib-xxxx...
const FROM_EMAIL  = 'praveenkumar@cookr.in'

// ─── Brevo SMTP Transporter ───────────────────────────────────────────────────
function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: BREVO_LOGIN,
      pass: BREVO_KEY,
    },
  })
}

// ─── Send Email ───────────────────────────────────────────────────────────────
export async function sendEmail({ to, subject, html }) {
  if (!BREVO_LOGIN || !BREVO_KEY) {
    console.warn('Brevo credentials not set — skipping email')
    return
  }
  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: `"Cookr Attendance" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    })
    console.log(`✉️  Email sent to ${to}`)
    return true
  } catch (err) {
    console.error('Email send error:', err.message)
    return false
  }
}

// ─── Reminder Email HTML ──────────────────────────────────────────────────────
export function buildReminderHtml(name, dateLabel, appUrl) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:20px;">
      <h2 style="color:#f97316;">🍱 Cookr Attendance Reminder</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Please submit your attendance status for <strong>${dateLabel}</strong>.</p>
      <p>It only takes 5 seconds!</p>
      <a href="${appUrl}" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
        Submit Attendance →
      </a>
      <p style="color:#999;font-size:12px;margin-top:20px;">
        Bangalore Team – Office Availability | Cookr
      </p>
    </div>
  `
}

// ─── Day-End Report (plain text) ─────────────────────────────────────────────
export function buildReport({ date, inOffice, wfh, onLeave, lunchCount, pending }) {
  const dayName = new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  let text = `📅 *${dayName} – Tech Team Availability*\n\n`

  if (inOffice.length > 0) {
    text += `🏢 *In Office (${inOffice.length}):*\n`
    inOffice.forEach((r, i) => {
      const ownLunch = r.status === 'office_own' ? ' _(bringing own lunch)_' : ''
      text += `${i + 1}. ${r.employee_name}${ownLunch}\n`
    })
    text += '\n'
  }

  if (wfh.length > 0) {
    text += `🏠 *WFH (${wfh.length}):*\n`
    wfh.forEach((r, i) => { text += `${i + 1}. ${r.employee_name}\n` })
    text += '\n'
  }

  if (onLeave.length > 0) {
    text += `🌴 *On Leave (${onLeave.length}):*\n`
    onLeave.forEach((r, i) => { text += `${i + 1}. ${r.employee_name}\n` })
    text += '\n'
  }

  if (pending.length > 0) {
    text += `⏳ *No response (${pending.length}):*\n`
    pending.forEach((name, i) => { text += `${i + 1}. ${name}\n` })
    text += '\n'
  }

  text += `🍽️ *Lunch Count: ${lunchCount}*`
  return text
}

// ─── Report HTML (for email) ──────────────────────────────────────────────────
export function buildReportHtml(reportText) {
  const html = reportText
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
  return `
    <div style="font-family:sans-serif;max-width:540px;margin:auto;padding:20px;line-height:1.8;">
      <h2 style="color:#f97316;">🍱 Daily Attendance Report</h2>
      <div style="background:#f9f9f9;border-radius:8px;padding:16px;">${html}</div>
      <p style="color:#999;font-size:12px;margin-top:20px;">
        Bangalore Team – Office Availability | Cookr
      </p>
    </div>
  `
}
