import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { EMPLOYEES, STATUSES, getNextWorkingDay, formatDate } from '../lib/employees'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'cookr@admin2024'

export default function AdminPage() {
  const targetDate = getNextWorkingDay()
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
      setError('Please select an employee and status.')
      return
    }
    setLoading(true)
    setError('')
    setMessage('')

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
      setError('Update failed. Please try again.')
    } else {
      setMessage(`✅ Updated ${employee.name} → ${STATUSES.find(s => s.key === selectedStatus)?.label}`)
      setSelectedEmployee('')
      setSelectedStatus('')
    }
  }

  // ─── Password Gate ──────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔐</div>
            <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
            <p className="text-sm text-gray-500 mt-1">Enter admin password to continue</p>
          </div>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          {passwordError && (
            <p className="text-red-600 text-sm mb-3 text-center">{passwordError}</p>
          )}
          <button
            onClick={handleLogin}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Login
          </button>
          <div className="mt-4 text-center">
            <a href="/" className="text-xs text-gray-400 hover:text-gray-600 underline">
              ← Back to submit
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ─── Admin Panel ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⚙️</div>
          <h1 className="text-xl font-bold text-gray-800">Admin – Manual Update</h1>
          <div className="mt-2 inline-block bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
            📅 {formatDate(targetDate)}
          </div>
        </div>

        {/* Employee Select */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select employee
          </label>
          <select
            value={selectedEmployee}
            onChange={e => { setSelectedEmployee(e.target.value); setSelectedStatus(''); setMessage('') }}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
          >
            <option value="">-- Choose employee --</option>
            {EMPLOYEES.map(emp => (
              <option key={emp.email} value={emp.email}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Buttons */}
        {selectedEmployee && (
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Status</label>
            <div className="grid grid-cols-1 gap-3">
              {STATUSES.map(status => (
                <button
                  key={status.key}
                  onClick={() => setSelectedStatus(status.key)}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-150 ${
                    selectedStatus === status.key ? status.selectedColor : status.color
                  }`}
                >
                  {status.label}
                  {status.sublabel && (
                    <span className="block text-xs font-normal opacity-90 mt-0.5">
                      {status.sublabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-red-600 text-sm mb-3 text-center">{error}</p>}
        {message && <p className="text-green-600 text-sm mb-3 text-center font-medium">{message}</p>}

        {selectedEmployee && (
          <button
            onClick={handleUpdate}
            disabled={loading || !selectedStatus}
            className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Updating…' : 'Update Status'}
          </button>
        )}

        <div className="mt-6 flex justify-center gap-4 text-xs text-gray-400">
          <a href="/" className="hover:text-gray-600 underline">Submit page</a>
          <a href="/dashboard" className="hover:text-gray-600 underline">Dashboard</a>
        </div>
      </div>
    </div>
  )
}
