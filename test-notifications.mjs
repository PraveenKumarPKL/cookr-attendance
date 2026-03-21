/**
 * Quick test script — run with: node test-notifications.mjs
 * Tests both email (Brevo SMTP) and Teams (Power Automate webhook)
 */
import nodemailer from 'nodemailer'

// ── Load from environment (set these in your .env file) ─────────────────────
import 'dotenv/config'
const BREVO_LOGIN   = process.env.BREVO_SMTP_LOGIN
const BREVO_KEY     = process.env.BREVO_SMTP_KEY
const TEAMS_WEBHOOK = process.env.TEAMS_WEBHOOK_URL

const TEST_EMAIL_TO = 'praveenkumar@cookr.in'

// ── Test 1: Email via Brevo ───────────────────────────────────────────────────
async function testEmail() {
  console.log('\n📧 Testing email via Brevo...')
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: { user: BREVO_LOGIN, pass: BREVO_KEY },
  })

  await transporter.sendMail({
    from: `"Cookr Attendance" <praveenkumar@cookr.in>`,
    to: TEST_EMAIL_TO,
    subject: '✅ Test — Cookr Attendance App',
    html: `
      <div style="font-family:sans-serif;padding:20px;">
        <h2 style="color:#f97316;">🍱 Cookr Attendance — Test Email</h2>
        <p>This is a test email. If you see this, email notifications are working! ✅</p>
        <p style="color:#999;font-size:12px;">Bangalore Team – Office Availability</p>
      </div>
    `,
  })
  console.log('✅ Email sent successfully to', TEST_EMAIL_TO)
}

// ── Test 2: Teams via Power Automate ─────────────────────────────────────────
async function testTeams() {
  console.log('\n💬 Testing Teams message...')
  const testReport = `🧪 *Test Message — Cookr Attendance App*

📅 Monday, March 23 – Tech Team Availability

🏢 *In Office (2):*
1. Tapas Biswas
2. Praveenkumar L

🏠 *WFH (3):*
1. Raja R
2. Santhosh Sivan
3. Yuvaraj S

🍽️ *Lunch Count: 2*

✅ If you see this in Teams, the webhook is working!`

  const res = await fetch(TEAMS_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: testReport }),
  })

  if (res.ok) {
    console.log('✅ Teams message sent successfully!')
  } else {
    const err = await res.text()
    console.error('❌ Teams error:', res.status, err)
  }
}

// ── Run both tests ────────────────────────────────────────────────────────────
console.log('🚀 Running notification tests...')
try {
  await testEmail()
} catch (err) {
  console.error('❌ Email failed:', err.message)
}

try {
  await testTeams()
} catch (err) {
  console.error('❌ Teams failed:', err.message)
}

console.log('\n✅ Done! Check your inbox and Teams chat.')
