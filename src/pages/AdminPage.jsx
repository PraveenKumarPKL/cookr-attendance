import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { EMPLOYEES, STATUSES, getNextWorkingDay, formatDate } from '../lib/employees'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'cookr@admin2024'

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

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function AdminPage() {
  const targetDate = getNextWorkingDay()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null) // { type: 'success'|'error', msg }

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  function handleLogin() {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true)
      setPasswordError('')
    } else {
      setPasswordError('Wrong password. Please try again.')
    }
  }

  async function handleUpdate() {
    if (!selectedEmployee || !selectedStatus) {
      showToast('error', 'Please select an employee and a status.')
      return
    }
    setLoading(true)

    const employee = EMPLOYEES.find(e => e.email === selectedEmployee)
    const { error: upsertError } = await supabase
      .from('daily_responses')
      .upsert({
        employee_email: selectedEmployee,
        employee_name: employee.name,
        date: targetDate,
        status: selectedStatus,
        updated_by_admin: true,
      }, { onConflict: 'employee_email,date' })

    setLoading(false)
    if (upsertError) {
      showToast('error', 'Update failed. Please try again.')
    } else {
      const statusLabel = STATUSES.find(s => s.key === selectedStatus)?.label
      showToast('success', `Updated ${employee.name} → ${statusLabel}`)
      setSelectedEmployee('')
      setSelectedStatus('')
    }
  }

  // ─── Password Gate ───────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-900 relative overflow-hidden flex items-center justify-center p-4">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-sm animate-fade-up">
          <div className="glass rounded-3xl p-8">
            {/* Lock icon */}
            <div className="flex flex-col items-center mb-7">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-500 flex items-center justify-center text-3xl shadow-lg shadow-violet-500/40 mb-4">
                🔐
              </div>
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-sm text-slate-400 mt-1">Enter password to continue</p>
            </div>

            {/* Password input */}
            <div className="relative mb-3">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Admin password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="input-field pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors text-lg"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {passwordError && (
              <p className="text-red-400 text-sm mb-3 flex items-center gap-1.5">
                <span>⚠️</span> {passwordError}
              </p>
            )}

            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white font-bold py-3.5 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-violet-500/30 active:scale-[0.98]"
            >
              Login
            </button>

            <div className="mt-5 text-center">
              <a href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                ← Back to submit
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Admin Panel ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden pb-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-cookr-500/10 blur-3xl" />
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl animate-fade-up
          ${toast.type === 'success'
            ? 'bg-emerald-500 text-white shadow-emerald-500/40'
            : 'bg-red-500 text-white shadow-red-500/40'
          }`}
        >
          {toast.type === 'success' ? '✅' : '⚠️'} {toast.msg}
        </div>
      )}

      <div className="relative z-10 max-w-md mx-auto px-4 pt-8">

        {/* Header */}
        <div className="glass rounded-3xl p-5 mb-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-500 flex items-center justify-center text-2xl shadow-lg shadow-violet-500/30">
              ⚙️
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Admin – Manual Update</h1>
              <p className="text-xs text-slate-400 mt-0.5">📅 {formatDate(targetDate)}</p>
            </div>
          </div>
        </div>

        {/* Employee Picker */}
        <div className="glass rounded-3xl p-5 mb-4 animate-fade-up">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Select employee</p>
          <div className="grid grid-cols-2 gap-2">
            {EMPLOYEES.map((emp, idx) => {
              const isSelected = selectedEmployee === emp.email
              return (
                <button
                  key={emp.email}
                  onClick={() => { setSelectedEmployee(emp.email); setSelectedStatus('') }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 border
                    ${isSelected
                      ? 'border-violet-500 bg-violet-500/15 shadow-lg shadow-violet-500/20'
                      : 'border-transparent bg-slate-800/60 hover:bg-slate-700/60 hover:border-slate-600'
                    }`}
                >
                  <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                    {getInitials(emp.name)}
                  </span>
                  <span className={`text-xs font-medium leading-tight ${isSelected ? 'text-violet-300' : 'text-slate-300'}`}>
                    {emp.name}
                  </span>
                  {isSelected && <span className="ml-auto text-violet-400">✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Status Cards */}
        {selectedEmployee && (
          <div className="glass rounded-3xl p-5 mb-4 animate-fade-up">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Set status</p>
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
                      {isSelected && <span className="ml-auto text-lg">✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Update Button */}
        {selectedEmployee && (
          <button
            onClick={handleUpdate}
            disabled={loading || !selectedStatus}
            className="btn-primary animate-fade-up"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Updating…
              </span>
            ) : 'Update Status'}
          </button>
        )}

        {/* Nav links */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-600">
          <a href="/" className="hover:text-cookr-400 transition-colors">📝 Submit</a>
          <span className="text-slate-700">·</span>
          <a href="/dashboard" className="hover:text-cookr-400 transition-colors">📊 Dashboard</a>
        </div>
      </div>
    </div>
  )
}
