import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { EMPLOYEES, STATUSES, getNextWorkingDay, formatDate } from '../lib/employees'

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
      .single()
    if (data) {
      setExistingEntry(data.status)
      setSelectedStatus(data.status)
    } else {
      setExistingEntry(null)
      setSelectedStatus('')
    }
  }

  async function handleEmployeeChange(e) {
    const email = e.target.value
    setSelectedEmployee(email)
    setError('')
    setSubmitted(false)
    if (email) await checkExisting(email)
  }

  async function handleSubmit() {
    if (!selectedEmployee || !selectedStatus) {
      setError('Please select your name and status.')
      return
    }
    setLoading(true)
    setError('')

    const payload = {
      employee_email: selectedEmployee,
      employee_name: employee.name,
      date: targetDate,
      status: selectedStatus,
      updated_by_admin: false,
    }

    const { error: upsertError } = await supabase
      .from('daily_responses')
      .upsert(payload, { onConflict: 'employee_email,date' })

    setLoading(false)
    if (upsertError) {
      setError('Something went wrong. Please try again.')
      console.error(upsertError)
    } else {
      setSubmitted(true)
      setExistingEntry(selectedStatus)
    }
  }

  const statusLabel = STATUSES.find(s => s.key === existingEntry)?.label

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🍱</div>
          <h1 className="text-2xl font-bold text-gray-800">Cookr Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bangalore Team – Office Availability
          </p>
          <div className="mt-3 inline-block bg-orange-100 text-orange-700 text-sm font-medium px-3 py-1 rounded-full">
            📅 {formatDate(targetDate)}
          </div>
        </div>

        {/* Employee Select */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select your name
          </label>
          <select
            value={selectedEmployee}
            onChange={handleEmployeeChange}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          >
            <option value="">-- Choose your name --</option>
            {EMPLOYEES.map(emp => (
              <option key={emp.email} value={emp.email}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Already submitted notice */}
        {existingEntry && !submitted && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-xl p-3">
            ✅ You already submitted: <strong>{statusLabel}</strong>. You can change it below.
          </div>
        )}

        {/* Status Buttons */}
        {selectedEmployee && (
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Your status for {formatDate(targetDate)}
            </label>
            <div className="grid grid-cols-1 gap-3">
              {STATUSES.map(status => (
                <button
                  key={status.key}
                  onClick={() => setSelectedStatus(status.key)}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-150 ${
                    selectedStatus === status.key
                      ? status.selectedColor
                      : status.color
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

        {/* Error */}
        {error && (
          <p className="text-red-600 text-sm mb-4 text-center">{error}</p>
        )}

        {/* Submit */}
        {selectedEmployee && !submitted && (
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedStatus}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Submitting…' : existingEntry ? 'Update Status' : 'Submit'}
          </button>
        )}

        {/* Success */}
        {submitted && (
          <div className="mt-2 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">✅</div>
            <p className="font-semibold">Submitted successfully!</p>
            <p className="text-sm mt-1">
              {employee?.name} — {STATUSES.find(s => s.key === selectedStatus)?.label}
            </p>
          </div>
        )}

        {/* Admin link */}
        <div className="mt-6 text-center">
          <a
            href="/admin"
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Admin panel
          </a>
          {' · '}
          <a
            href="/dashboard"
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            View dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
