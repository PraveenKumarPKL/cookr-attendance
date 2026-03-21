import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { EMPLOYEES, getNextWorkingDay, formatDate } from '../lib/employees'

const STATUS_LABELS = {
  office_lunch: '🏢 Office (lunch)',
  office_own: '🏢 Office (own lunch)',
  wfh: '🏠 WFH',
  leave: '🌴 Leave',
}

const STATUS_COLORS = {
  office_lunch: 'bg-green-100 text-green-800',
  office_own: 'bg-teal-100 text-teal-800',
  wfh: 'bg-blue-100 text-blue-800',
  leave: 'bg-orange-100 text-orange-800',
}

export default function DashboardPage() {
  const targetDate = getNextWorkingDay()
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResponses()
  }, [])

  async function fetchResponses() {
    setLoading(true)
    const { data, error } = await supabase
      .from('daily_responses')
      .select('*')
      .eq('date', targetDate)
    if (!error) setResponses(data || [])
    setLoading(false)
  }

  // Build a map of email → response
  const responseMap = {}
  responses.forEach(r => { responseMap[r.employee_email.toLowerCase()] = r })

  const submitted = EMPLOYEES.filter(e => responseMap[e.email.toLowerCase()])
  const pending = EMPLOYEES.filter(e => !responseMap[e.email.toLowerCase()])

  const inOffice = responses.filter(r => r.status === 'office_lunch' || r.status === 'office_own')
  const lunchCount = responses.filter(r => r.status === 'office_lunch').length
  const wfhList = responses.filter(r => r.status === 'wfh')
  const leaveList = responses.filter(r => r.status === 'leave')

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-md p-5 mb-4 text-center">
          <div className="text-3xl mb-1">📊</div>
          <h1 className="text-xl font-bold text-gray-800">Attendance Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">📅 {formatDate(targetDate)}</p>
          <button
            onClick={fetchResponses}
            className="mt-2 text-xs text-orange-600 hover:underline"
          >
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading…</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{inOffice.length}</div>
                <div className="text-xs text-green-600 mt-0.5">In Office</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-blue-700">{wfhList.length}</div>
                <div className="text-xs text-blue-600 mt-0.5">WFH</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-yellow-700">{pending.length}</div>
                <div className="text-xs text-yellow-600 mt-0.5">Pending</div>
              </div>
            </div>

            {/* Lunch Count */}
            <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
              <h2 className="font-semibold text-gray-700 mb-1">🍽️ Lunch Order</h2>
              <p className="text-3xl font-bold text-orange-600">{lunchCount}</p>
              <p className="text-sm text-gray-500">meals to order</p>
            </div>

            {/* In Office */}
            {inOffice.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
                <h2 className="font-semibold text-gray-700 mb-3">🏢 In Office ({inOffice.length})</h2>
                <ul className="space-y-2">
                  {inOffice.map((r, i) => (
                    <li key={r.employee_email} className="flex items-center justify-between">
                      <span className="text-sm text-gray-800">
                        {i + 1}. {r.employee_name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status]}`}>
                        {r.status === 'office_own' ? 'own lunch' : 'lunch ✓'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* WFH */}
            {wfhList.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
                <h2 className="font-semibold text-gray-700 mb-3">🏠 WFH ({wfhList.length})</h2>
                <ul className="space-y-1">
                  {wfhList.map((r, i) => (
                    <li key={r.employee_email} className="text-sm text-gray-800">
                      {i + 1}. {r.employee_name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Leave */}
            {leaveList.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
                <h2 className="font-semibold text-gray-700 mb-3">🌴 On Leave ({leaveList.length})</h2>
                <ul className="space-y-1">
                  {leaveList.map((r, i) => (
                    <li key={r.employee_email} className="text-sm text-gray-800">
                      {i + 1}. {r.employee_name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pending */}
            {pending.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
                <h2 className="font-semibold text-yellow-700 mb-3">⏳ Not Submitted ({pending.length})</h2>
                <ul className="space-y-1">
                  {pending.map((emp, i) => (
                    <li key={emp.email} className="text-sm text-gray-600">
                      {i + 1}. {emp.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pending.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                <p className="text-green-700 font-semibold">🎉 Everyone has submitted!</p>
              </div>
            )}
          </>
        )}

        <div className="mt-4 text-center">
          <a href="/" className="text-xs text-gray-400 hover:text-gray-600 underline">
            ← Back to submit
          </a>
        </div>
      </div>
    </div>
  )
}
