/**
 * Notification helpers
 * - sendEmail()  → Brevo SMTP (free 300 emails/day, sends FROM praveenkumar@cookr.in)
 * - Teams webhook removed — report goes to all employees via email instead
 */
import nodemailer from 'nodemailer'
import { EMPLOYEES } from './employees.mjs'

const EMAIL_TO_TEAM = {}
const NAME_TO_TEAM  = {}
EMPLOYEES.forEach(e => {
  EMAIL_TO_TEAM[e.email.toLowerCase()] = e.team
  NAME_TO_TEAM[e.name] = e.team
})

const TEAM_ORDER = [
  { key: 'tech', label: '💻 Tech' },
  { key: 'ops',  label: '⚙️ Operations' },
]

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
      <p>Hey <strong>${name}</strong> 👋</p>
      <p>Just a friendly nudge — could you fill in your attendance for <strong>${dateLabel}</strong>?</p>
      <p>Takes less than a minute, just one tap! 😊</p>
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

  let text = `📅 *${dayName} – Bangalore Team Availability*\n\n`

  if (inOffice.length > 0) {
    const guestRows = inOffice.filter(r => r.employee_email?.includes('@cookr.internal'))
    const teamRows  = inOffice.filter(r => !r.employee_email?.includes('@cookr.internal'))
    const grouped   = {}
    teamRows.forEach(r => {
      const t = EMAIL_TO_TEAM[r.employee_email?.toLowerCase()] || 'other'
      if (!grouped[t]) grouped[t] = []
      grouped[t].push(r)
    })
    text += `🏢 *In Office (${inOffice.length}):*\n`
    let n = 1
    TEAM_ORDER.forEach(({ key, label }) => {
      const group = grouped[key] || []
      if (!group.length) return
      text += `${label}\n`
      group.forEach(r => {
        const ownLunch = r.status === 'office_own' ? ' _(bringing own lunch)_' : ''
        text += `${n++}. ${r.employee_name}${ownLunch}\n`
      })
    })
    if (guestRows.length > 0) {
      text += `${n}. Guest User${guestRows.length > 1 ? ` (×${guestRows.length})` : ''}\n`
    }
    text += '\n'
  }

  if (wfh.length > 0) {
    const grouped = {}
    wfh.forEach(r => {
      const t = EMAIL_TO_TEAM[r.employee_email?.toLowerCase()] || 'other'
      if (!grouped[t]) grouped[t] = []
      grouped[t].push(r)
    })
    text += `🏠 *WFH (${wfh.length}):*\n`
    let n = 1
    TEAM_ORDER.forEach(({ key, label }) => {
      const group = grouped[key] || []
      if (!group.length) return
      text += `${label}\n`
      group.forEach(r => { text += `${n++}. ${r.employee_name}\n` })
    })
    text += '\n'
  }

  if (onLeave.length > 0) {
    const grouped = {}
    onLeave.forEach(r => {
      const t = EMAIL_TO_TEAM[r.employee_email?.toLowerCase()] || 'other'
      if (!grouped[t]) grouped[t] = []
      grouped[t].push(r)
    })
    text += `🌴 *On Leave (${onLeave.length}):*\n`
    let n = 1
    TEAM_ORDER.forEach(({ key, label }) => {
      const group = grouped[key] || []
      if (!group.length) return
      text += `${label}\n`
      group.forEach(r => { text += `${n++}. ${r.employee_name}\n` })
    })
    text += '\n'
  }

  if (pending.length > 0) {
    const grouped = {}
    pending.forEach(name => {
      const t = NAME_TO_TEAM[name] || 'other'
      if (!grouped[t]) grouped[t] = []
      grouped[t].push(name)
    })
    text += `⏳ *No response (${pending.length}):*\n`
    let n = 1
    TEAM_ORDER.forEach(({ key, label }) => {
      const group = grouped[key] || []
      if (!group.length) return
      text += `${label}\n`
      group.forEach(name => { text += `${n++}. ${name}\n` })
    })
    text += '\n'
  }

  text += `🍽️ *Lunch Count: ${lunchCount}*`
  return text
}

// ─── Teams Notification (Adaptive Card) ──────────────────────────────────────
export async function sendTeamsReport(reportText) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL
  if (!webhookUrl) {
    console.warn('TEAMS_WEBHOOK_URL not set — skipping Teams notification')
    return
  }

  // Convert plain report text to Adaptive Card body blocks
  const lines = reportText.split('\n').filter(l => l.trim() !== '')
  const bodyBlocks = lines.map(line => {
    const clean = line.replace(/\*(.*?)\*/g, '$1').replace(/_(.*?)_/g, '$1')
    const isHeader = line.startsWith('📅') || line.endsWith(':*') || /^\*.*\*$/.test(line.trim())
    return {
      type: 'TextBlock',
      text: clean,
      wrap: true,
      spacing: 'Small',
      ...(isHeader ? { weight: 'Bolder', size: 'Medium' } : { size: 'Small' }),
    }
  })

  const card = {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.2',
    body: bodyBlocks,
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('Teams webhook error:', res.status, text)
    } else {
      console.log('✅ Teams notification sent')
    }
  } catch (err) {
    console.error('Teams webhook fetch error:', err.message)
  }
}

// ─── Teams Pending Reminder (Adaptive Card) ──────────────────────────────────
export async function sendTeamsPendingReminder(pendingNames, dateLabel, appUrl) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL
  if (!webhookUrl || pendingNames.length === 0) return

  // Group by team
  const grouped = {}
  pendingNames.forEach(name => {
    const t = NAME_TO_TEAM[name] || 'other'
    if (!grouped[t]) grouped[t] = []
    grouped[t].push(name)
  })

  const bodyBlocks = [
    { type: 'TextBlock', text: `⏰ Attendance Reminder – ${dateLabel}`, weight: 'Bolder', size: 'Medium', wrap: true },
    { type: 'TextBlock', text: `Hey team! 👋 Just a friendly reminder to fill in your attendance for tomorrow.`, wrap: true, spacing: 'Small' },
    { type: 'TextBlock', text: `⏳ Still waiting on (${pendingNames.length}):`, weight: 'Bolder', spacing: 'Medium', wrap: true },
  ]
  let n = 1
  TEAM_ORDER.forEach(({ key, label }) => {
    const group = grouped[key] || []
    if (!group.length) return
    bodyBlocks.push({ type: 'TextBlock', text: label, weight: 'Bolder', spacing: 'Small', wrap: true })
    group.forEach(name => {
      bodyBlocks.push({ type: 'TextBlock', text: `${n++}. ${name}`, spacing: 'None', wrap: true })
    })
  })
  bodyBlocks.push({ type: 'TextBlock', text: `Takes less than a minute — [tap here to submit 😊](${appUrl})`, spacing: 'Medium', wrap: true })

  const card = {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.2',
    body: bodyBlocks,
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    })
    if (!res.ok) console.error('Teams pending reminder error:', res.status, await res.text())
    else console.log('✅ Teams pending reminder sent')
  } catch (err) {
    console.error('Teams pending reminder fetch error:', err.message)
  }
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
