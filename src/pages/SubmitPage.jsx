import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  EMPLOYEES, STATUSES,
  getTwoWeeksWorkingDays, getWeekRangeLabel,
  formatDate, formatDateShort, getTodayIST,
} from '../lib/employees'

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-cookr-500',
  'bg-rose-500', 'bg-amber-500', 'bg-teal-500', 'bg-indigo-500',
  'bg-pink-500', 'bg-lime-600',
]

const STATUS_CONFIG = {
  office_lunch: {
    icon: '🏢', label: 'Office', sublabel: "I'll have lunch",
    gradient: 'from-emerald-600 to-emerald-500', selectedGradient: 'from-emerald-700 to-emerald-600',
    ring: 'ring-emerald-400', glow: 'shadow-emerald-500/40', dot: 'bg-emerald-400',
  },
  office_own: {
    icon: '🥡', label: 'Office', sublabel: 'Own lunch',
    gradient: 'from-teal-600 to-teal-500', selectedGradient: 'from-teal-700 to-teal-600',
    ring: 'ring-teal-400', glow: 'shadow-teal-500/40', dot: 'bg-teal-400',
  },
  wfh: {
    icon: '🏠', label: 'WFH', sublabel: '',
    gradient: 'from-sky-600 to-sky-500', selectedGradient: 'from-sky-700 to-sky-600',
    ring: 'ring-sky-400', glow: 'shadow-sky-500/40', dot: 'bg-sky-400',
  },
  leave: {
    icon: '🌴', label: 'Leave', sublabel: '',
    gradient: 'from-amber-600 to-amber-500', selectedGradient: 'from-amber-700 to-amber-600',
    ring: 'ring-amber-400', glow: 'shadow-amber-500/40', dot: 'bg-amber-400',
  },
}

export default function SubmitPage() {
  const { thisWeek, nextWeek } = getTwoWeeksWorkingDays()
  const allDays = [...thisWeek, ...nextWeek]
  const today = getTodayIST()

  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedDates, setSelectedDates]       = useState([])
  const [selectedStatus, setSelectedStatus]     = useState('')
  const [existingMap, setExistingMap]           = useState({}) // date → status
  const [loading, setLoading]                   = useState(false)
  const [submitted, setSubmitted]               = useState(false)
  const [submitResult, setSubmitResult]         = useState({ newCount: 0, updatedCount: 0 })
  const [error, setError]                       = useState('')

  const employee = EMPLOYEES.find(e => e.email === selectedEmployee)

  // Fetch existing responses for both weeks when employee changes
  useEffect(() => {
    if (!selectedEmployee) {
      setExistingMap({})
      setSelectedDates([])
      setSelectedStatus('')
      return
    }
    async function fetchWeeks() {
      const { data } = await supabase
        .from('daily_responses')
        .select('date, status')
        .eq('employee_email', selectedEmployee)
        .in('date', allDays)
      const map = {}
      if (data) data.forEach(r => { map[r.date] = r.status })
      setExistingMap(map)
      setSelectedDates([])
      setSelectedStatus('')
      setSubmitted(false)
      setError('')
    }
    fetchWeeks()
  }, [selectedEmployee])

  function handleEmployeeSelect(email) {
    setSelectedEmployee(email)
    setSubmitted(false)
    setError('')
  }

  function toggleDate(date) {
    if (date < today) return
    setSelectedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    )
    setError('')
  }

  function selectWeek(days) {
    // "Select all" only picks UNSUBMITTED future dates
    const unsubmittedFuture = days.filter(d => d >= today && !existingMap[d])
    const allSelected = unsubmittedFuture.length > 0 && unsubmittedFuture.every(d => selectedDates.includes(d))
    if (allSelected) {
      setSelectedDates(prev => prev.filter(d => !unsubmittedFuture.includes(d)))
    } else {
      setSelectedDates(prev => [...new Set([...prev, ...unsubmittedFuture])])
    }
  }

  async function handleSubmit() {
    if (!selectedEmployee || selectedDates.length === 0 || !selectedStatus) {
      setError('Please select your name, at least one date, and a status.')
      return
    }
    setLoading(true)
    setError('')

    const upserts = selectedDates.map(date => ({
      employee_email: selectedEmployee,
      employee_name: employee.name,
      date,
      status: selectedStatus,
      updated_by_admin: false,
    }))

    const { error: upsertError } = await supabase
      .from('daily_responses')
      .upsert(upserts, { onConflict: 'employee_email,date' })

    setLoading(false)
    if (upsertError) {
      setError('Something went wrong. Please try again.')
    } else {
      const newCount     = selectedDates.filter(d => !existingMap[d]).length
      const updatedCount = selectedDates.filter(d =>  existingMap[d]).length
      const newMap = { ...existingMap }
      selectedDates.forEach(d => { newMap[d] = selectedStatus })
      setExistingMap(newMap)
      setSubmitResult({ newCount, updatedCount })
      setSubmitted(true)
    }
  }

  function resetForm() {
    setSelectedEmployee('')
    setSelectedDates([])
    setSelectedStatus('')
    setExistingMap({})
    setSubmitted(false)
    setError('')
  }

  // Week-level helpers — "All" only counts unsubmitted future days
  function weekAllUnsubmittedSelected(days) {
    const unsubFuture = days.filter(d => d >= today && !existingMap[d])
    return unsubFuture.length > 0 && unsubFuture.every(d => selectedDates.includes(d))
  }

  // Date pill row for one week
  function DateRow({ days, weekLabel }) {
    const unsubFuture = days.filter(d => d >= today && !existingMap[d])
    const allSel = weekAllUnsubmittedSelected(days)

    return (
      <div className="mb-2 last:mb-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{weekLabel}</span>
          {unsubFuture.length > 0 && (
            <button
              onClick={() => selectWeek(days)}
              className="text-[10px] text-cookr-400 hover:text-cookr-300 transition-colors font-medium"
            >
              {allSel ? 'Clear' : 'Select pending'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {days.map(date => {
            const isPast     = date < today
            const isToday    = date === today
            const isSelected = selectedDates.includes(date)
            const existing   = existingMap[date]  // already submitted status
            const cfg        = existing ? STATUS_CONFIG[existing] : null
            const isDone     = !!existing && !isSelected // submitted but not actively selected for update

            return (
              <button
                key={date}
                onClick={() => toggleDate(date)}
                disabled={isPast}
                title={isDone ? `Already submitted: ${cfg?.label}. Tap to update.` : ''}
                className={`flex flex-col items-center py-2 rounded-xl transition-all duration-200 relative border
                  ${isPast
                    ? 'opacity-25 cursor-not-allowed border-transparent bg-slate-800/30'
                    : isDone
                      // already done — green/teal tint, NOT orange
                      ? `border-emerald-600/50 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500`
                      : isSelected
                        ? 'border-cookr-500 bg-cookr-500/20 shadow-lg shadow-cookr-500/20'
                        : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-700/60'
                  }`}
              >
                <span className={`text-[10px] font-semibold uppercase tracking-wide
                  ${isToday ? 'text-cookr-400' : isDone ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {formatDateShort(date).split(' ')[0]}
                </span>
                <span className={`text-base font-bold leading-none mt-0.5
                  ${isDone ? 'text-emerald-300' : isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {formatDateShort(date).split(' ')[1]}
                </span>

                {/* Bottom label */}
                {isDone
                  ? <span className="text-[9px] text-emerald-500 mt-0.5">{cfg?.icon}</span>
                  : isToday
                    ? <span className="text-[8px] text-cookr-400 font-bold mt-0.5">TODAY</span>
                    : null
                }

                {/* Top-right badge */}
                {isDone && (
                  // Green tick = already submitted
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                {isSelected && existing && (
                  // Orange arrow = will be updated
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-cookr-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold">↺</span>
                )}
                {isSelected && !existing && (
                  // Orange tick = new selection
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-cookr-500 rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden flex flex-col">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-cookr-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center py-4 px-4">
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="text-center mb-3 animate-fade-up">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cookr-500 to-cookr-400 shadow-lg shadow-cookr-500/40 mb-2 text-xl">
              🍱
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Cookr Attendance</h1>
            <p className="text-slate-400 text-xs">Bangalore Team – Office Availability</p>
          </div>

          {/* Employee Picker */}
          <div className="glass rounded-2xl p-3 mb-2 animate-fade-up">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Select your name</p>
            <div className="grid grid-cols-2 gap-1.5">
              {EMPLOYEES.map((emp, idx) => {
                const isSelected = selectedEmployee === emp.email
                return (
                  <button
                    key={emp.email}
                    onClick={() => handleEmployeeSelect(emp.email)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all duration-200 border
                      ${isSelected
                        ? 'border-cookr-500 bg-cookr-500/15 shadow-lg shadow-cookr-500/20'
                        : 'border-transparent bg-slate-800/60 hover:bg-slate-700/60 hover:border-slate-600'
                      }`}
                  >
                    <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                      {getInitials(emp.name)}
                    </span>
                    <span className={`text-xs font-medium leading-tight truncate ${isSelected ? 'text-cookr-300' : 'text-slate-300'}`}>
                      {emp.name}
                    </span>
                    {isSelected && <span className="ml-auto text-cookr-400 text-xs flex-shrink-0">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date Picker — this week + next week */}
          {selectedEmployee && (
            <div className="glass rounded-2xl p-3 mb-2 animate-fade-up">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Select date(s)</p>
                {selectedDates.length > 0 && (
                  <button
                    onClick={() => setSelectedDates([])}
                    className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <DateRow days={thisWeek} weekLabel={`This week · ${getWeekRangeLabel(thisWeek)}`} />

              <div className="border-t border-slate-700/40 my-2" />

              <DateRow days={nextWeek} weekLabel={`Next week · ${getWeekRangeLabel(nextWeek)}`} />

              {/* Legend */}
              <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Done</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cookr-500 inline-block" /> Selected</span>
                <span className="flex items-center gap-1 ml-auto italic">Tap ✅ date to update it</span>
              </div>
            </div>
          )}

          {/* Status Cards */}
          {selectedEmployee && selectedDates.length > 0 && (
            <div className="glass rounded-2xl p-3 mb-2 animate-fade-up">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Status for {selectedDates.length === 1 ? formatDateShort(selectedDates[0]) : `${selectedDates.length} days`}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map(status => {
                  const cfg = STATUS_CONFIG[status.key]
                  const isSelected = selectedStatus === status.key
                  return (
                    <button
                      key={status.key}
                      onClick={() => setSelectedStatus(status.key)}
                      className={`status-card bg-gradient-to-r
                        ${isSelected
                          ? `${cfg.selectedGradient} ring-2 ${cfg.ring} shadow-xl ${cfg.glow} scale-[1.01]`
                          : `${cfg.gradient} opacity-75 hover:opacity-100`
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cfg.icon}</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs leading-tight">{cfg.label}</div>
                          {cfg.sublabel && <div className="text-xs font-normal opacity-80 truncate">{cfg.sublabel}</div>}
                        </div>
                        {isSelected && <span className="ml-auto text-sm">✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 text-red-300 text-xs rounded-xl px-3 py-2 mb-2 animate-fade-up">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Submit Button */}
          {selectedEmployee && !submitted && (
            <button
              onClick={handleSubmit}
              disabled={loading || selectedDates.length === 0 || !selectedStatus}
              className="btn-primary animate-fade-up"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Submitting…
                </span>
              ) : selectedDates.length > 1
                ? `Submit for ${selectedDates.length} days`
                : selectedDates.length === 1 && existingMap[selectedDates[0]]
                  ? 'Update Status'
                  : 'Submit'
              }
            </button>
          )}

          {/* Success */}
          {submitted && (
            <div className="glass border border-emerald-500/30 bg-emerald-500/10 rounded-2xl p-4 text-center animate-scale-in">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-base font-bold text-emerald-400">Done!</p>
              <p className="text-slate-300 text-xs mt-1">
                <span className="font-semibold text-white">{employee?.name}</span>
                {' — '}
                <span className="text-emerald-300">{STATUS_CONFIG[selectedStatus]?.icon} {STATUS_CONFIG[selectedStatus]?.label}</span>
              </p>
              <div className="flex items-center justify-center gap-3 mt-2">
                {submitResult.newCount > 0 && (
                  <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] rounded-lg px-2 py-0.5">
                    ✓ {submitResult.newCount} new day{submitResult.newCount > 1 ? 's' : ''}
                  </span>
                )}
                {submitResult.updatedCount > 0 && (
                  <span className="bg-cookr-500/20 border border-cookr-500/30 text-cookr-300 text-[11px] rounded-lg px-2 py-0.5">
                    ↺ {submitResult.updatedCount} updated
                  </span>
                )}
              </div>
              <button onClick={resetForm} className="mt-3 text-xs text-slate-400 hover:text-white underline transition-colors">
                Submit for another person
              </button>
            </div>
          )}

          {/* Bottom Nav */}
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500">
            <a href="/dashboard" className="hover:text-cookr-400 transition-colors">📊 Dashboard</a>
            <span className="text-slate-700">·</span>
            <a href="/admin" className="hover:text-slate-300 transition-colors">⚙️ Admin</a>
          </div>
        </div>
      </div>
    </div>
  )
}
