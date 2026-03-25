import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  EMPLOYEES, TECH_TEAM, OPS_TEAM, AVATAR_COLORS,
  getTwoWeeksWorkingDays, getWeekRangeLabel,
  formatDate, formatDateShort, getTodayIST,
} from '../lib/employees'

const TEAM_GROUPS = [
  { label: '💻 Tech Team', employees: TECH_TEAM },
  { label: '⚙️ Operations', employees: OPS_TEAM },
]

const STATUS_META = {
  office_lunch: { label: 'Office (Lunch)', emoji: '🏢', dot: 'bg-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30', cell: 'bg-emerald-500/20 text-emerald-300' },
  office_own: { label: 'Office (Own)', emoji: '🥡', dot: 'bg-teal-400', badge: 'bg-teal-500/20 text-teal-300 border border-teal-500/30', cell: 'bg-teal-500/20 text-teal-300' },
  wfh: { label: 'WFH', emoji: '🏠', dot: 'bg-sky-400', badge: 'bg-sky-500/20 text-sky-300 border border-sky-500/30', cell: 'bg-sky-500/20 text-sky-300' },
  leave: { label: 'On Leave', emoji: '🌴', dot: 'bg-amber-400', badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30', cell: 'bg-amber-500/20 text-amber-300' },
}

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function DashboardPage() {
  const { thisWeek, nextWeek } = getTwoWeeksWorkingDays()
  const allDays = [...thisWeek, ...nextWeek]
  const today = getTodayIST()

  const [activeDay, setActiveDay] = useState(today)
  const [view, setView] = useState('day')   // 'day' | 'week'
  const [weekTab, setWeekTab] = useState('this')  // 'this' | 'next'
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState(null)

  const fetchResponses = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('daily_responses')
      .select('*')
      .in('date', allDays)
    if (!error) setResponses(data || [])
    setLoading(false)
    setLastRefreshed(new Date())
  }, [])

  useEffect(() => { fetchResponses() }, [fetchResponses])

  // Lookup: email+date → response
  const lookup = {}
  responses.forEach(r => {
    lookup[`${r.employee_email.toLowerCase()}::${r.date}`] = r
  })
  function getResponse(email, date) {
    return lookup[`${email.toLowerCase()}::${date}`] || null
  }

  // Active week days (for day-view tabs and week-view table)
  const activeDays = weekTab === 'this' ? thisWeek : nextWeek

  // ── Day view stats ────────────────────────────────────────────────────────
  const dayResponses = responses.filter(r => r.date === activeDay)
  const dayMap = {}
  dayResponses.forEach(r => { dayMap[r.employee_email.toLowerCase()] = r })
  const submitted = EMPLOYEES.filter(e => dayMap[e.email.toLowerCase()])
  const pending = EMPLOYEES.filter(e => !dayMap[e.email.toLowerCase()])
  const inOffice = dayResponses.filter(r => r.status === 'office_lunch' || r.status === 'office_own')
  const lunchCount = dayResponses.filter(r => r.status === 'office_lunch').length
  const wfhList = dayResponses.filter(r => r.status === 'wfh')
  const leaveList = dayResponses.filter(r => r.status === 'leave')
  const guestLunches = dayResponses.filter(r => r.employee_email?.includes('@cookr.internal')).length
  const total = EMPLOYEES.length
  const submitPct = total > 0 ? Math.round((submitted.length / total) * 100) : 0
  const timeStr = lastRefreshed ? lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null

  // When switching week tabs in day view, jump active day to first day of that week
  function handleWeekTab(tab) {
    setWeekTab(tab)
    const days = tab === 'this' ? thisWeek : nextWeek
    // pick today if in this tab, else first future day
    const preferred = days.find(d => d >= today) || days[0]
    setActiveDay(preferred)
  }

  return (
    <div className="bg-slate-900 relative overflow-hidden flex flex-col">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-cookr-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 pt-4 pb-4 flex flex-col gap-2">

        {/* Header */}
        <div className="glass rounded-2xl px-4 py-3 animate-fade-up flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <div>
                <h1 className="text-base font-bold text-white leading-tight">Attendance Dashboard</h1>
                <p className="text-xs text-slate-400">Bangalore Team</p>
              </div>
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
        </div>

        {/* View Toggle (Day / Week) */}
        <div className="glass rounded-2xl p-1 animate-fade-up flex-shrink-0 flex">
          <button onClick={() => setView('day')} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${view === 'day' ? 'bg-cookr-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>📅 Day View</button>
          <button onClick={() => setView('week')} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${view === 'week' ? 'bg-cookr-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>🗓️ Week View</button>
        </div>

        {/* Week Tab (This Week / Next Week) — shared by both views */}
        <div className="glass rounded-2xl p-1 animate-fade-up flex-shrink-0 flex gap-1">
          <button
            onClick={() => handleWeekTab('this')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${weekTab === 'this' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            This Week · <span className="font-normal opacity-75">{getWeekRangeLabel(thisWeek)}</span>
          </button>
          <button
            onClick={() => handleWeekTab('next')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${weekTab === 'next' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Next Week · <span className="font-normal opacity-75">{getWeekRangeLabel(nextWeek)}</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center text-slate-500 py-16 animate-fade-up">
            <svg className="animate-spin h-8 w-8 mb-3 text-cookr-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Loading…
          </div>
        ) : view === 'day' ? (
          // ── DAY VIEW ──────────────────────────────────────────────────────
          <>
            {/* Day tabs */}
            <div className="glass rounded-2xl p-1 animate-fade-up flex-shrink-0 flex flex-wrap gap-1">
              {activeDays.map(d => {
                const isActive = d === activeDay
                const isToday = d === today
                const cnt = EMPLOYEES.filter(e =>
                  responses.some(r => r.date === d && r.employee_email.toLowerCase() === e.email.toLowerCase())
                ).length
                return (
                  <button
                    key={d}
                    onClick={() => setActiveDay(d)}
                    className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all text-center min-w-[52px]
                      ${isActive ? 'bg-cookr-500 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${isToday && !isActive ? 'text-cookr-400' : ''}`}>
                      {formatDateShort(d).split(' ')[0]}
                    </span>
                    <span className="text-sm font-bold leading-none mt-0.5">{formatDateShort(d).split(' ')[1]}</span>
                    <span className={`text-[9px] mt-0.5 ${isActive ? 'text-cookr-100' : 'text-slate-600'}`}>{cnt}/{total}</span>
                  </button>
                )
              })}
            </div>

            {/* Progress */}
            <div className="glass rounded-2xl px-4 py-3 animate-fade-up flex-shrink-0">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span>
                  {formatDate(activeDay)}
                  {activeDay === today && <span className="ml-1.5 text-cookr-400 font-semibold">· Today</span>}
                </span>
                <span className="font-semibold text-white">{submitPct}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-cookr-500 to-cookr-400 transition-all duration-700" style={{ width: `${submitPct}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {submitted.length} of {total} submitted
                {timeStr && <span className="ml-1">· refreshed {timeStr}</span>}
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 flex-shrink-0 animate-fade-up">
              <div className="glass rounded-2xl py-3 text-center border border-emerald-500/20">
                <div className="text-xl font-bold text-emerald-400">{inOffice.length}</div>
                <div className="text-xs text-slate-400 mt-0.5">🏢 Office</div>
              </div>
              <div className="glass rounded-2xl py-3 text-center border border-sky-500/20">
                <div className="text-xl font-bold text-sky-400">{wfhList.length}</div>
                <div className="text-xs text-slate-400 mt-0.5">🏠 WFH</div>
              </div>
              <div className="glass rounded-2xl py-3 text-center border border-amber-500/20">
                <div className="text-xl font-bold text-amber-400">{leaveList.length}</div>
                <div className="text-xs text-slate-400 mt-0.5">🌴 Leave</div>
              </div>
              <div className="glass rounded-2xl py-3 text-center border border-slate-500/20">
                <div className="text-xl font-bold text-slate-400">{pending.length}</div>
                <div className="text-xs text-slate-500 mt-0.5">⏳ Pending</div>
              </div>
            </div>

            {/* Lunch card */}
            <div className="bg-gradient-to-r from-cookr-600 to-cookr-500 rounded-2xl px-4 py-3 shadow-xl shadow-cookr-500/30 animate-fade-up flex-shrink-0 flex items-center justify-between">
              <div>
                <p className="text-cookr-100 text-xs font-semibold uppercase tracking-widest">🍽️ Lunch Order</p>
                <p className="text-4xl font-black text-white leading-none mt-0.5">{lunchCount}</p>
                <p className="text-cookr-200 text-xs">meals to order</p>
              </div>
              <div className="text-5xl opacity-25">🍱</div>
            </div>

            {/* Team grid */}
            <div className="glass rounded-2xl p-3 animate-fade-up">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Team Status</p>
              {pending.length === 0 && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 mb-2">
                  <span>🎉</span>
                  <span className="text-emerald-400 text-xs font-semibold">Everyone has submitted!</span>
                </div>
              )}
              {TEAM_GROUPS.map(group => (
                <div key={group.label} className="mb-3 last:mb-0">
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5 px-0.5">{group.label}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.employees.map(emp => {
                      const r = dayMap[emp.email.toLowerCase()]
                      const meta = r ? STATUS_META[r.status] : null
                      return (
                        <div key={emp.email} className="flex items-center gap-2 bg-slate-800/50 rounded-xl px-2.5 py-2">
                          <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${AVATAR_COLORS[emp.id % AVATAR_COLORS.length]}`}>
                            {getInitials(emp.name)}
                          </span>
                          <span className="text-xs text-slate-200 flex-1 truncate leading-tight">{emp.name}</span>
                          {meta
                            ? <span className="text-base leading-none flex-shrink-0">{meta.emoji}</span>
                            : <span className="text-xs text-slate-600 flex-shrink-0">⏳</span>
                          }
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              {guestLunches > 0 && (
                <div className="flex items-center gap-2 bg-slate-700/40 border border-slate-600/40 rounded-xl px-2.5 py-2 mt-1.5">
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm bg-slate-600">
                    🧑‍💼
                  </span>
                  <span className="text-xs text-slate-300 flex-1 leading-tight">
                    Guest User{guestLunches > 1 ? ` (×${guestLunches})` : ''}
                  </span>
                  <span className="text-base leading-none flex-shrink-0">🏢</span>
                </div>
              )}
            </div>
          </>
        ) : (
          // ── WEEK VIEW ──────────────────────────────────────────────────────
          <div className="glass rounded-2xl p-3 animate-fade-up">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {weekTab === 'this' ? 'This Week' : 'Next Week'} at a Glance
              </p>
              <div className="flex gap-2 text-[10px] text-slate-500">
                {Object.entries(STATUS_META).map(([, m]) => (
                  <span key={m.label} className="flex items-center gap-0.5">
                    <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                    {m.emoji}
                  </span>
                ))}
                <span className="flex items-center gap-0.5">
                  <span className="w-2 h-2 rounded-full bg-slate-700" />⏳
                </span>
              </div>
            </div>

            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-xs border-collapse min-w-[360px]">
                <thead>
                  <tr>
                    <th className="text-left text-slate-500 font-semibold py-1.5 pr-2 w-24">Employee</th>
                    {activeDays.map(d => (
                      <th key={d} className={`text-center font-semibold py-1.5 px-1 ${d === today ? 'text-cookr-400' : 'text-slate-400'}`}>
                        <div>{formatDateShort(d).split(' ')[0]}</div>
                        <div className={`text-base leading-none ${d === today ? 'text-cookr-300' : 'text-slate-300'}`}>
                          {formatDateShort(d).split(' ')[1]}
                        </div>
                        {d === today && <div className="text-[8px] text-cookr-500 font-bold">TODAY</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TEAM_GROUPS.map((group, gi) => (
                    <>
                      <tr key={`header-${group.label}`} className={gi > 0 ? 'border-t-2 border-slate-700' : ''}>
                        <td colSpan={activeDays.length + 1} className="pt-2 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                          {group.label}
                        </td>
                      </tr>
                      {group.employees.map(emp => (
                        <tr key={emp.email} className="border-t border-slate-700/50">
                          <td className="py-1.5 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white ${AVATAR_COLORS[emp.id % AVATAR_COLORS.length]}`}>
                                {getInitials(emp.name)}
                              </span>
                              <span className="text-slate-300 text-[11px] leading-tight truncate max-w-[60px]">
                                {emp.name.split(' ')[0]}
                              </span>
                            </div>
                          </td>
                          {activeDays.map(d => {
                            const r = getResponse(emp.email, d)
                            const meta = r ? STATUS_META[r.status] : null
                            return (
                              <td key={d} className="py-1.5 px-1 text-center">
                                <span
                                  title={meta ? meta.label : 'Not submitted'}
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-base
                                    ${meta ? meta.cell : 'bg-slate-800/50 text-slate-700'}
                                    ${d === today ? 'ring-1 ring-cookr-500/40' : ''}`}
                                >
                                  {meta ? meta.emoji : '⏳'}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-700">
                    <td className="py-2 pr-2 text-[10px] text-slate-500 font-semibold">🍽️ Lunch</td>
                    {activeDays.map(d => {
                      const count = responses.filter(r => r.date === d && r.status === 'office_lunch').length
                      return (
                        <td key={d} className="py-2 px-1 text-center">
                          <span className={`inline-block min-w-[28px] text-xs font-bold rounded-lg px-1.5 py-0.5 ${count > 0 ? 'bg-cookr-500/20 text-cookr-300' : 'text-slate-700'}`}>
                            {count > 0 ? count : '—'}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-2 gap-1">
              {Object.entries(STATUS_META).map(([, m]) => (
                <div key={m.label} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="text-sm">{m.emoji}</span>
                  <span>{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-xs text-slate-600 flex-shrink-0">
          <a href="/" className="hover:text-cookr-400 transition-colors">← Back to Submit</a>
        </div>
      </div>
    </div>
  )
}
