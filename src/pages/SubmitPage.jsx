import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  EMPLOYEES, STATUSES,
  getCurrentWeekWorkingDays, formatDate, formatDateShort, getTodayIST,
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
    icon: '🏢', label: 'Office', sublabel: 'I\'ll have lunch',
    gradient: 'from-emerald-600 to-emerald-500',
    selectedGradient: 'from-emerald-700 to-emerald-600',
    ring: 'ring-emerald-400', glow: 'shadow-emerald-500/40',
    dot: 'bg-emerald-400',
  },
  office_own: {
    icon: '🥡', label: 'Office', sublabel: 'Own lunch',
    gradient: 'from-teal-600 to-teal-500',
    selectedGradient: 'from-teal-700 to-teal-600',
    ring: 'ring-teal-400', glow: 'shadow-teal-500/40',
    dot: 'bg-teal-400',
  },
  wfh: {
    icon: '🏠', label: 'WFH', sublabel: '',
    gradient: 'from-sky-600 to-sky-500',
    selectedGradient: 'from-sky-700 to-sky-600',
    ring: 'ring-sky-400', glow: 'shadow-sky-500/40',
    dot: 'bg-sky-400',
  },
  leave: {
    icon: '🌴', label: 'Leave', sublabel: '',
    gradient: 'from-amber-600 to-amber-500',
    selectedGradient: 'from-amber-700 to-amber-600',
    ring: 'ring-amber-400', glow: 'shadow-amber-500/40',
    dot: 'bg-amber-400',
  },
}

export default function SubmitPage() {
  const weekDays = getCurrentWeekWorkingDays()
  const today = getTodayIST()

  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedDates, setSelectedDates] = useState([])
  const [selectedStatus, setSelectedStatus] = useState('')
  const [existingMap, setExistingMap] = useState({}) // date → status
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const employee = EMPLOYEES.find(e => e.email === selectedEmployee)

  // When employee changes, fetch their existing responses for the whole week
  useEffect(() => {
    if (!selectedEmployee) {
      setExistingMap({})
      setSelectedDates([])
      setSelectedStatus('')
      return
    }
    async function fetchWeek() {
      const { data } = await supabase
        .from('daily_responses')
        .select('date, status')
        .eq('employee_email', selectedEmployee)
        .in('date', weekDays)
      const map = {}
      if (data) data.forEach(r => { map[r.date] = r.status })
      setExistingMap(map)
      setSelectedDates([])
      setSelectedStatus('')
      setSubmitted(false)
      setError('')
    }
    fetchWeek()
  }, [selectedEmployee])

  function handleEmployeeSelect(email) {
    setSelectedEmployee(email)
    setSubmitted(false)
    setError('')
  }

  function toggleDate(date) {
    // Can't select past days (before today)
    if (date < today) return
    setSelectedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    )
    setError('')
  }

  function selectAllFuture() {
    const futureDays = weekDays.filter(d => d >= today)
    setSelectedDates(futureDays)
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
      // Update local map
      const newMap = { ...existingMap }
      selectedDates.forEach(d => { newMap[d] = selectedStatus })
      setExistingMap(newMap)
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

  const futureDays = weekDays.filter(d => d >= today)
  const allFutureSelected = futureDays.length > 0 && futureDays.every(d => selectedDates.includes(d))

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden flex flex-col">
      {/* Background glows */}
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

          {/* Date Picker — show this week's working days */}
          {selectedEmployee && (
            <div className="glass rounded-2xl p-3 mb-2 animate-fade-up">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Select date(s) this week</p>
                {futureDays.length > 1 && (
                  <button
                    onClick={allFutureSelected ? () => setSelectedDates([]) : selectAllFuture}
                    className="text-xs text-cookr-400 hover:text-cookr-300 transition-colors font-medium"
                  >
                    {allFutureSelected ? 'Clear all' : 'Select all'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {weekDays.map(date => {
                  const isPast = date < today
                  const isToday = date === today
                  const isSelected = selectedDates.includes(date)
                  const existing = existingMap[date]
                  const cfg = existing ? STATUS_CONFIG[existing] : null

                  return (
                    <button
                      key={date}
                      onClick={() => toggleDate(date)}
                      disabled={isPast}
                      className={`flex flex-col items-center py-2 rounded-xl transition-all duration-200 relative border
                        ${isPast
                          ? 'opacity-30 cursor-not-allowed border-transparent bg-slate-800/30'
                          : isSelected
                            ? 'border-cookr-500 bg-cookr-500/20 shadow-lg shadow-cookr-500/20'
                            : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-700/60'
                        }`}
                    >
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? 'text-cookr-400' : 'text-slate-400'}`}>
                        {formatDateShort(date).split(' ')[0]}
                      </span>
                      <span className={`text-base font-bold leading-none mt-0.5 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {formatDateShort(date).split(' ')[1]}
                      </span>
                      {isToday && (
                        <span className="text-[8px] text-cookr-400 font-bold mt-0.5">TODAY</span>
                      )}
                      {cfg && !isToday && (
                        <span className="text-[10px] mt-0.5">{cfg.icon}</span>
                      )}
                      {isSelected && (
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

              {/* Week summary of already submitted */}
              {Object.keys(existingMap).length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-700/50">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Already submitted</p>
                  <div className="flex flex-wrap gap-1">
                    {weekDays.filter(d => existingMap[d]).map(d => {
                      const cfg = STATUS_CONFIG[existingMap[d]]
                      return (
                        <span key={d} className="flex items-center gap-1 bg-slate-800 rounded-lg px-1.5 py-0.5 text-[10px] text-slate-300">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg?.dot || 'bg-slate-500'}`} />
                          {formatDateShort(d)} · {cfg?.icon}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
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
                          {cfg.sublabel && (
                            <div className="text-xs font-normal opacity-80 truncate">{cfg.sublabel}</div>
                          )}
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
              ) : (
                selectedDates.length > 1
                  ? `Submit for ${selectedDates.length} days`
                  : selectedDates.length === 1 && existingMap[selectedDates[0]]
                    ? 'Update Status'
                    : 'Submit'
              )}
            </button>
          )}

          {/* Success */}
          {submitted && (
            <div className="glass border border-emerald-500/30 bg-emerald-500/10 rounded-2xl p-4 text-center animate-scale-in">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-base font-bold text-emerald-400">Submitted successfully!</p>
              <p className="text-slate-300 text-xs mt-1">
                <span className="font-semibold text-white">{employee?.name}</span>
                {' — '}
                <span className="text-emerald-300">{STATUS_CONFIG[selectedStatus]?.icon} {STATUS_CONFIG[selectedStatus]?.label}</span>
                {' for '}
                <span className="text-white">{selectedDates.length} day{selectedDates.length > 1 ? 's' : ''}</span>
              </p>
              <button
                onClick={resetForm}
                className="mt-3 text-xs text-slate-400 hover:text-white underline transition-colors"
              >
                Submit for another person
              </button>
            </div>
          )}

          {/* Bottom Nav */}
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500">
            <a href="/dashboard" className="hover:text-cookr-400 transition-colors flex items-center gap-1">
              📊 Dashboard
            </a>
            <span className="text-slate-700">·</span>
            <a href="/admin" className="hover:text-slate-300 transition-colors flex items-center gap-1">
              ⚙️ Admin
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
