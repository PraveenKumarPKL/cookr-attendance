// 5:00 PM IST (11:30 UTC) Mon–Fri
import { runReminder } from './lib/remind-handler.mjs'
export default async function handler(_req, _context) { return runReminder() }
