// 1:00 PM IST (07:30 UTC) Mon–Fri
import { runReminder } from './lib/remind-handler.mjs'
export default async function handler(_req, _context) { return runReminder() }
