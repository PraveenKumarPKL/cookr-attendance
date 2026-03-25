// 8:00 AM IST (02:30 UTC) Mon–Fri
import { runReminder } from './lib/remind-handler.mjs'
export default async function handler(_req, _context) { return runReminder() }
