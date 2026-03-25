import { useState, useEffect } from 'react'
import ExcelJS from 'exceljs'
import { supabase } from '../lib/supabase'
import {
  EMPLOYEES, STATUSES, TECH_TEAM, OPS_TEAM, AVATAR_COLORS,
  getNextWorkingDay, formatDate, getTodayIST, getTwoWeeksWorkingDays,
} from '../lib/employees'

const TEAM_GROUPS = [
  { label: '💻 Tech Team', employees: TECH_TEAM },
  { label: '⚙️ Operations', employees: OPS_TEAM },
]

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'cookr@admin2024'

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

const STATUS_LABELS = {
  office_lunch: 'Office – Lunch',
  office_own: 'Office – Own Lunch',
  wfh: 'Work From Home',
  leave: 'On Leave',
}

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ── Excel (XLSX) download helper ────────────────────────────────────────────
async function downloadXLSX(rows, pendingEmps, reportDate) {
  const ExcelJSLib = ExcelJS
  const wb = new ExcelJSLib.Workbook()
  wb.creator = 'Cookr Attendance'
  wb.created = new Date()

  const ws = wb.addWorksheet('Attendance Report')

  // Column widths
  ws.columns = [
    { key: 'name', width: 28 },
    { key: 'status', width: 24 },
    { key: 'submittedAt', width: 22 },
    { key: 'admin', width: 18 },
  ]

  // ── Title row ────────────────────────────────────────────────────────────
  ws.mergeCells('A1:D1')
  const titleCell = ws.getCell('A1')
  titleCell.value = '🍱 Cookr Attendance Report'
  titleCell.font = { name: 'Arial', bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE87722' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 36

  // ── Date subtitle ─────────────────────────────────────────────────────────
  ws.mergeCells('A2:D2')
  const dateCell = ws.getCell('A2')
  const dateObj = new Date(reportDate + 'T12:00:00')
  dateCell.value = dateObj.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  dateCell.font = { name: 'Arial', size: 11, color: { argb: 'FF7C3AED' }, italic: true }
  dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } }
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(2).height = 22

  // ── Header row ────────────────────────────────────────────────────────────
  const headerRow = ws.addRow(['Employee Name', 'Status', 'Submitted At', 'Updated by Admin'])
  headerRow.eachCell(cell => {
    cell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FFE87722' } },
    }
  })
  headerRow.height = 22

  // ── Status colour map ────────────────────────────────────────────────────
  const STATUS_FILL = {
    office_lunch: { bg: 'FFD1FAE5', fg: 'FF065F46' }, // emerald
    office_own: { bg: 'FFCCFBF1', fg: 'FF134E4A' }, // teal
    wfh: { bg: 'FFE0F2FE', fg: 'FF0C4A6E' }, // sky
    leave: { bg: 'FFFEF3C7', fg: 'FF78350F' }, // amber
  }

  // ── Submitted rows ────────────────────────────────────────────────────────
  rows.forEach(r => {
    const colors = STATUS_FILL[r.status] || { bg: 'FFF1F5F9', fg: 'FF334155' }
    const rowData = ws.addRow([
      r.employee_name,
      STATUS_LABELS[r.status] || r.status,
      r.submitted_at ? new Date(r.submitted_at).toLocaleString('en-IN') : '—',
      r.updated_by_admin ? 'Yes (Admin)' : 'Employee',
    ])
    rowData.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 10, color: { argb: colors.fg } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bg } }
      cell.alignment = { horizontal: colNum === 1 ? 'left' : 'center', vertical: 'middle' }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }
    })
    rowData.height = 20
  })

  // ── Pending rows ──────────────────────────────────────────────────────────
  pendingEmps.forEach(e => {
    const row = ws.addRow([e.name, 'Not Submitted', '—', '—'])
    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF94A3B8' }, italic: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
      cell.alignment = { horizontal: colNum === 1 ? 'left' : 'center', vertical: 'middle' }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }
    })
    row.height = 20
  })

  // ── Summary section ───────────────────────────────────────────────────────
  ws.addRow([])

  const summaryTitle = ws.addRow(['📊 Summary'])
  summaryTitle.getCell(1).font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF1E293B' } }
  summaryTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } }
  ws.mergeCells(`A${summaryTitle.number}:D${summaryTitle.number}`)

  const inOffice = rows.filter(r => r.status === 'office_lunch' || r.status === 'office_own').length
  const lunchOnly = rows.filter(r => r.status === 'office_lunch').length
  const wfh = rows.filter(r => r.status === 'wfh').length
  const leave = rows.filter(r => r.status === 'leave').length
  const pending = pendingEmps.length
  const total = rows.length + pending

  const summaryData = [
    ['🏢 In Office', inOffice],
    ['🍽️ Lunch Orders', lunchOnly],
    ['🏠 Work From Home', wfh],
    ['🌴 On Leave', leave],
    ['⏳ Not Submitted', pending],
    ['👥 Total Team', total],
  ]

  summaryData.forEach(([label, val]) => {
    const row = ws.addRow([label, val])
    row.getCell(1).font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } }
    row.getCell(2).font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FFE87722' } }
    row.getCell(2).alignment = { horizontal: 'center' }
    row.height = 18
  })

  // ── Footer ────────────────────────────────────────────────────────────────
  ws.addRow([])
  const footer = ws.addRow([`Generated by Cookr Attendance · ${new Date().toLocaleString('en-IN')}`])
  ws.mergeCells(`A${footer.number}:D${footer.number}`)
  footer.getCell(1).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF94A3B8' } }

  // ── Trigger browser download ───────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `attendance_${reportDate.replace(/-/g, '')}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ── CSV download helper ─────────────────────────────────────────────────────
function downloadCSV(rows, filename) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = ['Name', 'Email', 'Status', 'Updated by Admin', 'Submitted At']
  const lines = [header.join(',')]
  rows.forEach(r => {
    lines.push([
      escape(r.employee_name),
      escape(r.employee_email),
      escape(STATUS_LABELS[r.status] || r.status),
      escape(r.updated_by_admin ? 'Yes' : 'No'),
      escape(r.submitted_at ? new Date(r.submitted_at).toLocaleString('en-IN') : '—'),
    ].join(','))
  })
  // Add pending employees (no response)
  const submittedEmails = new Set(rows.map(r => r.employee_email.toLowerCase()))
  EMPLOYEES.filter(e => !submittedEmails.has(e.email.toLowerCase())).forEach(e => {
    lines.push([escape(e.name), escape(e.email), escape('Not Submitted'), escape(''), escape('')].join(','))
  })

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminPage() {
  const targetDate = getNextWorkingDay()
  const today = getTodayIST()
  const { thisWeek, nextWeek } = getTwoWeeksWorkingDays()

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const [updateDate, setUpdateDate] = useState(targetDate)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  // Report section
  const [reportDate, setReportDate] = useState(today)
  const [reportData, setReportData] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)

  // Test report
  const [testReportLoading, setTestReportLoading] = useState(false)

  // Guest users
  const [guestDate, setGuestDate] = useState(targetDate)
  const [guestCount, setGuestCount] = useState(0)
  const [savedGuestCount, setSavedGuestCount] = useState(0)
  const [guestSaving, setGuestSaving] = useState(false)

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

  async function fetchEmployeeStatus(email, date) {
    if (!email || !date) return
    const { data } = await supabase
      .from('daily_responses')
      .select('status')
      .eq('employee_email', email)
      .eq('date', date)
      .single()
    setSelectedStatus(data?.status || '')
  }

  async function handleUpdate() {
    if (!selectedEmployee || !selectedStatus) {
      showToast('error', 'Please select an employee and a status.')
      return
    }
    setLoading(true)

    const employee = EMPLOYEES.find(e => e.email === selectedEmployee)
    if (!employee) {
      showToast('error', 'Employee not found.')
      setLoading(false)
      return
    }
    const { error: upsertError } = await supabase
      .from('daily_responses')
      .upsert({
        employee_email: selectedEmployee,
        employee_name: employee.name,
        date: updateDate,
        status: selectedStatus,
        updated_by_admin: true,
      }, { onConflict: 'employee_email,date' })

    setLoading(false)
    if (upsertError) {
      showToast('error', 'Update failed. Please try again.')
    } else {
      const statusLabel = STATUSES.find(s => s.key === selectedStatus)?.label
      showToast('success', `Updated ${employee.name} → ${STATUS_LABELS[selectedStatus] || statusLabel}`)
      setSelectedEmployee('')
      setSelectedStatus('')
    }
  }

  async function fetchGuestCount(date) {
    const d = date || guestDate
    const { data } = await supabase
      .from('daily_responses')
      .select('employee_email')
      .eq('date', d)
      .like('employee_email', 'guest_%@cookr.internal')
    const count = data?.length || 0
    setSavedGuestCount(count)
    setGuestCount(count)
  }

  async function handleSaveGuests() {
    setGuestSaving(true)
    // Remove all existing guest rows for this date
    await supabase
      .from('daily_responses')
      .delete()
      .eq('date', guestDate)
      .like('employee_email', 'guest_%@cookr.internal')

    // Insert N new guest rows
    if (guestCount > 0) {
      const rows = Array.from({ length: guestCount }, (_, i) => ({
        employee_email: `guest_${i + 1}@cookr.internal`,
        employee_name: 'Guest User',
        date: guestDate,
        status: 'office_lunch',
        updated_by_admin: true,
      }))
      await supabase.from('daily_responses').insert(rows)
    }

    setSavedGuestCount(guestCount)
    setGuestSaving(false)
    showToast('success', guestCount === 0
      ? 'Guest lunches removed.'
      : `${guestCount} guest lunch${guestCount > 1 ? 'es' : ''} saved for ${formatDate(guestDate)}.`
    )
  }

  async function fetchReport() {
    if (!reportDate) return
    setReportLoading(true)
    const { data, error } = await supabase
      .from('daily_responses')
      .select('*')
      .eq('date', reportDate)
      .order('employee_name')
    setReportLoading(false)
    if (error) {
      showToast('error', 'Failed to load report.')
      return
    }
    setReportData(data || [])
  }

  useEffect(() => {
    if (authenticated) {
      fetchReport()
    }
  }, [authenticated, reportDate])

  useEffect(() => {
    if (authenticated) {
      fetchGuestCount(guestDate)
    }
  }, [authenticated, guestDate])

  useEffect(() => {
    if (authenticated && selectedEmployee) {
      fetchEmployeeStatus(selectedEmployee, updateDate)
    }
  }, [updateDate])

  function handleDownloadCSV() {
    if (!reportData) return
    const dateLabel = reportDate.replace(/-/g, '')
    downloadCSV(reportData, `attendance_${dateLabel}.csv`)
  }

  async function handleDownloadXLSX() {
    if (!reportData) return
    await downloadXLSX(reportData, pendingEmployees, reportDate)
  }

  async function handleSendTestReport() {
    setTestReportLoading(true)
    try {
      const res = await fetch('/.netlify/functions/test-report', { method: 'POST' })
      const json = await res.json()
      const teamsStatus = json.teams?.ok ? '✅ Teams OK' : `❌ Teams: ${json.teams?.status || json.teams?.error || 'no response'}`
      if (json.success) {
        showToast('success', `Email sent ✓ | ${teamsStatus}`)
      } else {
        showToast('error', `Email failed | ${teamsStatus}`)
      }
    } catch (e) {
      showToast('error', 'Network error — is the function deployed?')
    }
    setTestReportLoading(false)
  }

  const submittedEmails = new Set((reportData || []).map(r => r.employee_email.toLowerCase()))
  const pendingEmployees = EMPLOYEES.filter(e => !submittedEmails.has(e.email.toLowerCase()))

  // ─── Password Gate ────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="h-screen bg-slate-900 relative overflow-hidden flex items-center justify-center p-4">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-sm animate-fade-up">
          <div className="glass rounded-3xl p-8">
            <div className="flex flex-col items-center mb-7">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-500 flex items-center justify-center text-3xl shadow-lg shadow-violet-500/40 mb-4">
                🔐
              </div>
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-sm text-slate-400 mt-1">Enter password to continue</p>
            </div>

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

  // ─── Admin Panel ───────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-slate-900 relative overflow-hidden flex flex-col">
      <div className="pointer-events-none absolute inset-0">
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

      <div className="relative z-10 flex-1 flex flex-col items-center py-4 px-4 overflow-y-auto">
        <div className="w-full max-w-md flex flex-col gap-2">

          {/* Header */}
          <div className="glass rounded-2xl px-4 py-3 animate-fade-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-violet-500 flex items-center justify-center text-xl shadow-lg shadow-violet-500/30">
                ⚙️
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Admin Panel</h1>
                <p className="text-xs text-slate-400">📅 {formatDate(targetDate)} (next working day)</p>
              </div>
            </div>
          </div>

          {/* ── MANUAL UPDATE SECTION ───────────────────────────────────── */}
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1">Manual Status Update</p>

          {/* Date Picker */}
          <div className="glass rounded-2xl p-3 animate-fade-up">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 block">Date</label>
            <input
              type="date"
              value={updateDate}
              min={thisWeek[0]}
              max={nextWeek[4]}
              onChange={e => setUpdateDate(e.target.value)}
              className="w-full glass rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition-all [color-scheme:dark]"
            />
          </div>

          {/* Employee Picker */}
          <div className="glass rounded-2xl p-3 animate-fade-up">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Select employee</p>
            {TEAM_GROUPS.map(group => (
              <div key={group.label} className="mb-3 last:mb-0">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 px-0.5">{group.label}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {group.employees.map(emp => {
                    const isSelected = selectedEmployee === emp.email
                    return (
                      <button
                        key={emp.email}
                        onClick={() => { setSelectedEmployee(emp.email); fetchEmployeeStatus(emp.email, updateDate) }}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all duration-200 border
                          ${isSelected
                            ? 'border-violet-500 bg-violet-500/15 shadow-lg shadow-violet-500/20'
                            : 'border-transparent bg-slate-800/60 hover:bg-slate-700/60 hover:border-slate-600'
                          }`}
                      >
                        <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${AVATAR_COLORS[emp.id % AVATAR_COLORS.length]}`}>
                          {getInitials(emp.name)}
                        </span>
                        <span className={`text-xs font-medium leading-tight truncate ${isSelected ? 'text-violet-300' : 'text-slate-300'}`}>
                          {emp.name}
                        </span>
                        {isSelected && <span className="ml-auto text-violet-400 text-xs">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Status Cards */}
          {selectedEmployee && (
            <div className="glass rounded-2xl p-3 animate-fade-up">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Set status</p>
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
                          <div className="font-semibold text-xs leading-tight">{status.label}</div>
                          {status.sublabel && (
                            <div className="text-xs font-normal opacity-80 truncate">{status.sublabel}</div>
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

          {/* Update Button */}
          {selectedEmployee && (
            <button
              onClick={handleUpdate}
              disabled={loading || !selectedStatus}
              className="btn-primary animate-fade-up"
              style={{ background: 'linear-gradient(to right, #7c3aed, #8b5cf6)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Updating…
                </span>
              ) : 'Update Status'}
            </button>
          )}

          {/* ── GUEST USERS SECTION ─────────────────────────────────────── */}
          <div className="mt-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1 mb-2">Guest Users</p>
            <div className="glass rounded-2xl p-3 animate-fade-up">
              <p className="text-xs text-slate-400 mb-3">
                Add lunch orders for guests (CEO, WFH visitors or Others) coming to office.
              </p>
              {/* Date picker */}
              <div className="mb-3">
                <label className="text-xs text-slate-400 mb-1 block">Date</label>
                <input
                  type="date"
                  value={guestDate}
                  min={thisWeek[0]}
                  max={nextWeek[4]}
                  onChange={e => { setGuestDate(e.target.value) }}
                  className="w-full glass rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cookr-500/60 transition-all [color-scheme:dark]"
                />
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-300">🧑‍💼 Guest Lunches</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGuestCount(c => Math.max(0, c - 1))}
                    className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg transition-all flex items-center justify-center active:scale-95"
                  >−</button>
                  <span className="w-6 text-center text-lg font-bold text-white">{guestCount}</span>
                  <button
                    onClick={() => setGuestCount(c => Math.min(10, c + 1))}
                    className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg transition-all flex items-center justify-center active:scale-95"
                  >+</button>
                </div>
              </div>
              {savedGuestCount > 0 && (
                <p className="text-xs text-emerald-400 mb-2">
                  ✓ Currently saved: {savedGuestCount} guest lunch{savedGuestCount > 1 ? 'es' : ''}
                </p>
              )}
              <button
                onClick={handleSaveGuests}
                disabled={guestSaving}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cookr-600 to-cookr-500 hover:from-cookr-700 hover:to-cookr-600 text-white font-bold py-2.5 rounded-xl transition-all duration-200 text-sm disabled:opacity-60 shadow-lg hover:shadow-cookr-500/30 active:scale-[0.98]"
              >
                {guestSaving ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Saving…</>
                ) : guestCount === 0
                  ? 'Remove Guest Lunches'
                  : `Save ${guestCount} Guest Lunch${guestCount > 1 ? 'es' : ''}`
                }
              </button>
            </div>
          </div>

          {/* ── REPORT SECTION ──────────────────────────────────────────── */}
          <div className="mt-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1 mb-2">Download Report</p>

            <div className="glass rounded-2xl p-3 animate-fade-up">
              {/* Date picker */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Report Date</label>
                  <input
                    type="date"
                    value={reportDate}
                    min={thisWeek[0]}
                    max={nextWeek[4]}
                    onChange={e => setReportDate(e.target.value)}
                    className="w-full glass rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition-all [color-scheme:dark]"
                  />
                </div>
                <button
                  onClick={fetchReport}
                  disabled={reportLoading}
                  className="self-end flex items-center gap-1.5 bg-slate-700/80 hover:bg-slate-600/80 text-slate-300 hover:text-white text-xs px-3 py-2 rounded-xl transition-all"
                >
                  <svg className={`w-3.5 h-3.5 ${reportLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
                  </svg>
                  Load
                </button>
              </div>

              {/* Report preview */}
              {reportData && (
                <>
                  <div className="mb-3 space-y-1 max-h-48 overflow-y-auto pr-1">
                    {reportData.map(r => {
                      const cfg = STATUS_CONFIG[r.status]
                      return (
                        <div key={r.employee_email} className="flex items-center gap-2 bg-slate-800/50 rounded-xl px-2.5 py-1.5">
                          <span className="text-base flex-shrink-0">{cfg?.icon || '❓'}</span>
                          <span className="text-xs text-slate-200 flex-1 truncate">{r.employee_name}</span>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">{STATUS_LABELS[r.status] || r.status}</span>
                          {r.updated_by_admin && (
                            <span className="text-[9px] bg-violet-500/20 text-violet-300 rounded px-1">admin</span>
                          )}
                        </div>
                      )
                    })}
                    {pendingEmployees.map(e => (
                      <div key={e.email} className="flex items-center gap-2 bg-slate-800/30 rounded-xl px-2.5 py-1.5 opacity-60">
                        <span className="text-base flex-shrink-0">⏳</span>
                        <span className="text-xs text-slate-400 flex-1 truncate">{e.name}</span>
                        <span className="text-[10px] text-slate-600">Not submitted</span>
                      </div>
                    ))}
                  </div>

                  {/* Stats line */}
                  <div className="flex gap-2 text-[10px] text-slate-500 mb-3">
                    <span className="text-emerald-400 font-semibold">
                      {reportData.filter(r => r.status === 'office_lunch' || r.status === 'office_own').length} office
                    </span>
                    <span>·</span>
                    <span className="text-sky-400 font-semibold">
                      {reportData.filter(r => r.status === 'wfh').length} WFH
                    </span>
                    <span>·</span>
                    <span className="text-amber-400 font-semibold">
                      {reportData.filter(r => r.status === 'leave').length} leave
                    </span>
                    <span>·</span>
                    <span className="text-slate-500 font-semibold">
                      {pendingEmployees.length} pending
                    </span>
                    {reportData.filter(r => r.employee_name === 'Guest User').length > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-violet-400 font-semibold">
                          🧑‍💼 {reportData.filter(r => r.employee_name === 'Guest User').length} guest
                        </span>
                      </>
                    )}
                    <span className="ml-auto text-cookr-400 font-semibold">
                      🍽️ {reportData.filter(r => r.status === 'office_lunch').length} lunches
                    </span>
                  </div>

                  {/* Download buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownloadXLSX}
                      className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold py-2.5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-emerald-500/30 active:scale-[0.98] text-xs"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      📊 Download Excel
                    </button>
                    <button
                      onClick={handleDownloadCSV}
                      className="flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-semibold py-2.5 rounded-xl transition-all duration-200 active:scale-[0.98] text-xs border border-slate-600"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      📄 Download CSV
                    </button>
                  </div>
                </>
              )}

              {reportLoading && (
                <div className="flex items-center justify-center py-6 text-slate-500 text-xs">
                  <svg className="animate-spin h-5 w-5 mr-2 text-cookr-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Loading report…
                </div>
              )}

              {!reportData && !reportLoading && (
                <p className="text-xs text-slate-600 text-center py-2">Select a date and click Load</p>
              )}
            </div>
          </div>

          {/* Test Report */}
          <div className="mt-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1 mb-2">Report</p>
            <div className="glass rounded-2xl p-3">
              {/* <p className="text-xs text-slate-400 mb-2">
                Triggers the nightly report function and sends it <span className="text-white font-semibold">only to you</span>.
              </p> */}
              <button
                onClick={handleSendTestReport}
                disabled={testReportLoading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white font-bold py-2.5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-violet-500/30 active:scale-[0.98] text-sm disabled:opacity-60"
              >
                {testReportLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Sending…
                  </>
                ) : (
                  <>📧 Send Report to Me</>
                )}
              </button>
            </div>
          </div>

          {/* Nav links */}
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-slate-600">
            <a href="/" className="hover:text-cookr-400 transition-colors">📝 Submit</a>
            <span className="text-slate-700">·</span>
            <a href="/dashboard" className="hover:text-cookr-400 transition-colors">📊 Dashboard</a>
          </div>
        </div>
      </div>
    </div>
  )
}
