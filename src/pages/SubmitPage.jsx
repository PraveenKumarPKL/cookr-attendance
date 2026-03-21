import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { EMPLOYEES, STATUSES, getNextWorkingDay, formatDate } from '../lib/employees'

// Initials avatar helper
function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// Pastel avatar colors per index
const AVATAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-cookr-500',
  'bg-rose-500', 'bg-amber-500', 'bg-teal-500', 'bg-indigo-500',
  'bg-pink-500', 'bg-lime-600',
]

const STATUS_CONFIG = {
  office_lunch: {
    icon: '🏢',
    gradient: 'from-emerald-600 to-emerald-500',
    selectedGradient: 'from-emerald-700 to-emerald-600',
    ring: 'ring-emerald-400',
    glow: 'shadow-emerald-500/40',
  },
  office_own: {
    icon: '🥡',
    gradient: 'from-teal-600 to-teal-500',
    selectedGradient: 'from-teal-700 to-teal-600',
    ring: 'ring-teal-400',
    glow: 'shadow-teal-500/40',
  },
  wfh: {
    icon: '🏠',
    gradient: 'from-sky-600 to-sky-500',
    selectedGradient: 'from-sky-700 to-sky-600',
    ring: 'ring-sky-400',
    glow: 'shadow-sky-500/40',
  },
  leave: {
    icon: '🌴',
    gradient: 'from-amber-600 to-amber-500',
    selectedGradient: 'from-amber-700 to-amber-600',
    ring: 'ring-amber-400',
    glow: 'shadow-amber-500/40',
  },
}

export default function SubmitPage() {
  const targetDate = getNextWorkingDay()
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [existingEntry, setExistingEntry] = useState(null)

  const employee = EMPLOYEES.find(e => e.email === selectedEmployee)

  async function checkExisting(email) {
    const { data } = await supabase
      .from('daily_responses')
      .select('status')
      .eq('employee_email', email)
      .eq('date', targetDate)
      .maybeSingle()
    if (data) {
      setExistingEntry(data.status)
      setSelectedStatus(data.status)
    } else {
      setExistingEntry(null)
      setSelectedStatus('')
    }
  }

  function handleEmployeeSelect(email) {
    setSelectedEmployee(email)
    setError('')
    setSubmitted(false)
    if (email) checkExisting(email)
  }

  async function handleSubmit() {
    if (!selectedEmployee || !selectedStatus) {
      setError('Please select your name and a status.')
      return
    }
    setLoading(true)
    setError('')

    const { error: upsertError } = await supabase
      .from('daily_responses')
      .upsert({
        employee_email: selectedEmployee,
        employee_name: employee.name,
        date: targetDate,
        status: selectedStatus,
        updated_by_admin: false,
      }, { onConflict: 'employee_email,date' })

    setLoading(false)
    if (upsertError) {
      setError('Something went wrong. Please try again.')
    } else {
      setSubmitted(true)
      setExistingEntry(selectedStatus)
    }
  }

  const statusLabel = STATUSES.find(s => s.key === existingEntry)?.label

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden flex flex-col">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-cookr-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-start py-8 px-4">
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="text-center mb-8 animate-fade-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cookr-500 to-cookr-400 shadow-lg shadow-cookr-500/40 mb-4 text-3xl">
              🍱
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Cookr Attendance</h1>
            <p className="text-slate-400 mt-1 text-sm">Bangalore Team – Office Availability</p>
            <div className="inline-flex items-center gap-1.5 mt-3 bg-cookr-500/15 border border-cookr-500/30 text-cookr-300 text-xs font-medium px-3 py-1.5 rounded-full">
              📅 {formatDate(targetDate)}
            </div>
          </div>

          {/* Employee Picker */}
          <div className="glass rounded-3xl p-5 mb-4 animate-fade-up">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Select your name</p>
            <div className="grid grid-cols-2 gap-2">
              {EMPLOYEES.map((emp, idx) => {
                const isSelected = selectedEmployee === emp.email
                return (
                  <button
                    key={emp.email}
                    onClick={() => handleEmployeeSelect(emp.email)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 border
                      ${isSelected
                        ? 'border-cookr-500 bg-cookr-500/15 shadow-lg shadow-cookr-500/20'
                        : 'border-transparent bg-slate-800/60 hover:bg-slate-700/60 hover:border-slate-600'
                      }`}
                  >
                    <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                      {getInitials(emp.name)}
                    </span>
                    <span className={`text-xs font-medium leading-tight ${isSelected ? 'text-cookr-300' : 'text-slate-300'}`}>
                      {emp.name}
                    </span>
                    {isSelected && (
                      <span className="ml-auto text-cookr-400">✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Already submitted notice */}
          {existingEntry && !submitted && (
            <div className="glass border border-sky-500/30 bg-sky-500/10 text-sky-300 text-sm rounded-2xl p-3.5 mb-4 flex items-center gap-2 animate-fade-up">
              <span className="text-lg">ℹ️</span>
              <span>Already submitted: <strong className="text-sky-200">{statusLabel}</strong> — you can change it below.</span>
            </div>
          )}

          {/* Status Cards */}
          {selectedEmployee && (
            <div className="glass rounded-3xl p-5 mb-4 animate-fade-up">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Your status for {formatDate(targetDate)}</p>
              <div className="grid grid-cols-1 gap-3">
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
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cfg.icon}</span>
                        <div>
                          <div className="font-semibold text-sm">{status.label}</div>
                          {status.sublabel && (
                            <div className="text-xs font-normal opacity-80 mt-0.5">{status.sublabel}</div>
                          )}
                        </div>
                        {isSelected && (
                          <span className="ml-auto text-lg">✓</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 text-red-300 text-sm rounded-2xl px-4 py-3 mb-4 animate-fade-up">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Submit Button */}
          {selectedEmployee && !submitted && (
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedStatus}
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
              ) : existingEntry ? 'Update Status' : 'Submit'}
            </button>
          )}

          {/* Success */}
          {submitted && (
            <div className="glass border border-emerald-500/30 bg-emerald-500/10 rounded-3xl p-6 text-center animate-scale-in">
              <div className="text-5xl mb-3">🎉</div>
              <p className="text-lg font-bold text-emerald-400">Submitted successfully!</p>
              <p className="text-slate-300 text-sm mt-2">
                <span className="font-semibold text-white">{employee?.name}</span>
                {' — '}
                <span className="text-emerald-300">{STATUSES.find(s => s.key === selectedStatus)?.label}</span>
              </p>
              <button
                onClick={() => { setSubmitted(false); setSelectedEmployee(''); setSelectedStatus(''); setExistingEntry(null) }}
                className="mt-4 text-xs text-slate-400 hover:text-white underline transition-colors"
              >
                Submit for another person
              </button>
            </div>
          )}

          {/* Bottom Nav */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500">
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
