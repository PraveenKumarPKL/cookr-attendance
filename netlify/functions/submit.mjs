/**
 * POST /api/submit
 * Saves or updates an employee's attendance status.
 * (Also handled directly from the frontend via Supabase client — this is a backup)
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
)

export default async function handler(req, context) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { employee_email, employee_name, date, status, updated_by_admin } = await req.json()

  if (!employee_email || !date || !status) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const validStatuses = ['office_lunch', 'office_own', 'wfh', 'leave']
  if (!validStatuses.includes(status)) {
    return new Response(JSON.stringify({ error: 'Invalid status' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { error } = await supabase
    .from('daily_responses')
    .upsert({
      employee_email,
      employee_name,
      date,
      status,
      updated_by_admin: updated_by_admin || false,
    }, { onConflict: 'employee_email,date' })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
