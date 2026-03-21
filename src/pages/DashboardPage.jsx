import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { EMPLOYEES, getNextWorkingDay, formatDate } from '../lib/employees'

const STATUS_META = {
  office_lunch: { label: 'Office (Lunch)', badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30', dot: 'bg-emerald-400' },
  office_own: { label: 'Office (Own)', badge: 'bg-teal-500/20 text-teal-300 border border-teal-500/30', dot: 'bg-teal-400' },
  wfh: { label: 'WFH', badge: 'bg-sky-500/20 text-sky-300 border border-sky-500/30', dot: 'bg-sky-400' },
  leave: { label: 'On Leave', badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30', dot: 'bg-amber-400' },
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-cookr-500',
  'bg-rose-500', 'bg-amber-500', 'bg-teal-500', 'bg-indigo-500',
  'bg-pink-500', 'bg-lime-600',
]

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function EmployeeAvatar({ name, idx }) {
  return (
    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
      {getInitials(name)}
    </span>
  )
}

function SectionCard({ title, count, children }) {
  return (
    <div className="glass rounded-3xl p-5 mb-4 animate-fade-up">
      <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center justify-between">
        {title}
        <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">{count}</span>
      </h2>
      <ul className="space-y-2">{children}</ul>
    </div>
  )
}

export default function DashboardPage() {
  const targetDate = getNextWorkingDay()
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState(null)

  const fetchResponses = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('daily_responses')
      .select('*')
      .eq('date', targetDate)
    if (!error) setResponses(data || [])
    setLoading(false)
    setLastRefreshed(new Date())
  }, [targetDate])

  useEffect(() => { fetchResponses() }, [fetchResponses])

  const responseMap = {}
  responses.forEach(r => { responseMap[r.employee_email.toLowerCase()] = r })

  const submitted = EMPLOYEES.filter(e => responseMap[e.email.toLowerCase()])
  const pending = EMPLOYEES.filter(e => !responseMap[e.email.toLowerCase()])

  const inOffice = responses.filter(r => r.status === 'office_lunch' || r.status === 'office_own')
  const lunchCount = responses.filter(r => r.status === 'office_lunch').length
  const wfhList = responses.filter(r => r.status === 'wfh')
  const leaveList = responses.filter(r => r.status === 'leave')

  const total = EMPLOYEES.length
  const submitPct = total > 0 ? Math.round((submitted.length / total) * 100) : 0

  const timeStr = lastRefreshed
    ? lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden pb-10">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-cookr-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-8">

        {/* Header */}
        <div className="glass rounded-3xl p-5 mb-4 animate-fade-up">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">📊</span>
                <h1 className="text-xl font-bold text-white tracking-tight">Attendance Dashboard</h1>
              </div>
              <p className="text-xs text-slate-400">📅 {formatDate(targetDate)}</p>
            </div>
            <button
              onClick={fetchResponses}
              className="flex items-center gap-1.5 bg-slate-700/80 hover:bg-slate-600/80 text-slate-300 hover:text-white text-xs px-3 py-1.5 rounded-xl transition-all"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>{submitted.length} of {total} submitted</span>
              <span className="font-semibold text-white">{submitPct}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cookr-500 to-cookr-400 transition-all duration-700"
                style={{ width: `${submitPct}%` }}
              />
            </div>
          </div>
          {timeStr && <p className="text-xs text-slate-600 mt-2">Last updated at {timeStr}</p>}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 animate-fade-up">
            <svg className="animate-spin h-8 w-8 mb-3 text-cookr-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Loading responses…
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4 animate-fade-up">
              <div className="glass rounded-2xl p-4 text-center border border-emerald-500/20">
                <div className="text-2xl font-bold text-emerald-400">{inOffice.length}</div>
                <div className="text-xs text-slate-400 mt-0.5">🏢 In Office</div>
              </div>
              <div className="glass rounded-2xl p-4 text-center border border-sky-500/20">
                <div className="text-2xl font-bold text-sky-400">{wfhList.length}</div>
                <div className="text-xs text-slate-400 mt-0.5">🏠 WFH</div>
              </div>
              <div className="glass rounded-2xl p-4 text-center border border-amber-500/20">
                <div className="text-2xl font-bold text-amber-400">{pending.length}</div>
                <div className="text-xs text-slate-400 mt-0.5">⏳ Pending</div>
              </div>
            </div>

            {/* Lunch Featured Card */}
            <div className="bg-gradient-to-r from-cookr-600 to-cookr-500 rounded-3xl p-5 mb-4 shadow-xl shadow-cookr-500/30 animate-fade-up">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cookr-100 text-xs font-semibold uppercase tracking-widest">🍽️ Lunch Order</p>
                  <p className="text-5xl font-black text-white mt-1">{lunchCount}</p>
                  <p className="text-cookr-200 text-sm">meals to order</p>
                </div>
                <div className="text-6xl opacity-30">🍱</div>
              </div>
            </div>

            {/* In Office */}
            {inOffice.length > 0 && (
              <SectionCard title="🏢 In Office" count={inOffice.length}>
                {inOffice.map((r, i) => (
                  <li key={r.employee_email} className="flex items-center gap-3">
                    <EmployeeAvatar name={r.employee_name} idx={EMPLOYEES.findIndex(e => e.email.toLowerCase() === r.employee_email.toLowerCase())} />
                    <span className="text-sm text-slate-200 flex-1">{r.employee_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_META[r.status]?.badge}`}>
                      {r.status === 'office_own' ? 'Own lunch' : 'Lunch ✓'}
                    </span>
                  </li>
                ))}
              </SectionCard>
            )}

            {/* WFH */}
            {wfhList.length > 0 && (
              <SectionCard title="🏠 Working From Home" count={wfhList.length}>
                {wfhList.map((r, i) => (
                  <li key={r.employee_email} className="flex items-center gap-3">
                    <EmployeeAvatar name={r.employee_name} idx={EMPLOYEES.findIndex(e => e.email.toLowerCase() === r.employee_email.toLowerCase())} />
                    <span className="text-sm text-slate-200">{r.employee_name}</span>
                    <span className="ml-auto text-xs text-sky-400">🏠</span>
                  </li>
                ))}
              </SectionCard>
            )}

            {/* On Leave */}
            {leaveList.length > 0 && (
              <SectionCard title="🌴 On Leave" count={leaveList.length}>
                {leaveList.map((r, i) => (
                  <li key={r.employee_email} className="flex items-center gap-3">
                    <EmployeeAvatar name={r.employee_name} idx={EMPLOYEES.findIndex(e => e.email.toLowerCase() === r.employee_email.toLowerCase())} />
                    <span className="text-sm text-slate-200">{r.employee_name}</span>
                    <span className="ml-auto text-xs text-amber-400">🌴</span>
                  </li>
                ))}
              </SectionCard>
            )}

            {/* Pending */}
            {pending.length > 0 && (
              <SectionCard title="⏳ Not Yet Submitted" count={pending.length}>
                {pending.map((emp, i) => (
                  <li key={emp.email} className="flex items-center gap-3">
                    <EmployeeAvatar name={emp.name} idx={EMPLOYEES.findIndex(e => e.email === emp.email)} />
                    <span className="text-sm text-slate-400">{emp.name}</span>
                  </li>
                ))}
              </SectionCard>
            )}

            {/* All Submitted */}
            {pending.length === 0 && (
              <div className="glass border border-emerald-500/30 bg-emerald-500/10 rounded-3xl p-5 text-center animate-scale-in">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-emerald-400 font-bold">Everyone has submitted!</p>
                <p className="text-slate-400 text-sm mt-1">All {total} team members have responded.</p>
              </div>
            )}
          </>
        )}

        {/* Bottom link */}
        <div className="mt-6 text-center text-xs text-slate-600">
          <a href="/" className="hover:text-cookr-400 transition-colors">← Back to Submit</a>
        </div>
      </div>
    </div>
  )
}
