'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AuditLog {
  id: string
  action: string
  userId: string | null
  ip: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

interface LogsResponse {
  logs: AuditLog[]
  total: number
  page: number
  totalPages: number
}

const ACTIONS = [
  '', 'USER_REGISTER', 'USER_LOGIN', 'USER_LOGIN_FAILED', 'USER_LOGOUT',
  'ANALYSE_STARTED', 'ANALYSE_COMPLETED', 'ANALYSE_FAILED',
  'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_EXPIRED',
  'SUSPICIOUS_INPUT', 'RATE_LIMIT_HIT', 'PASSWORD_RESET',
  'ADMIN_ACCESS_DENIED', 'ADMIN_USER_BLOCKED', 'ADMIN_ROLE_CHANGED',
]

function downloadCsv(logs: AuditLog[]) {
  const header = 'Date,Action,UserId,IP,Metadata\n'
  const rows = logs.map((l) =>
    [
      new Date(l.createdAt).toISOString(),
      l.action,
      l.userId ?? '',
      l.ip ?? '',
      JSON.stringify(l.metadata).replace(/,/g, ';'),
    ].join(',')
  )
  const csv = header + rows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminLogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null)
  const [page, setPage] = useState(1)
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (userId) params.set('userId', userId)
      if (action) params.set('action', action)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const res = await api.get<LogsResponse>(`/api/admin/audit-logs?${params}`)
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [page, userId, action, startDate, endDate])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audit logs</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => data && downloadCsv(data.logs)}
          disabled={!data?.logs.length}
        >
          <Download size={14} className="mr-1.5" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="User ID…"
          className="h-8 text-sm w-48"
          value={userId}
          onChange={(e) => { setUserId(e.target.value); setPage(1) }}
        />
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{a || 'Toutes les actions'}</option>
          ))}
        </select>
        <Input
          type="date"
          className="h-8 text-sm w-36"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
        />
        <Input
          type="date"
          className="h-8 text-sm w-36"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Action</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">User ID</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">IP</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden xl:table-cell">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted-foreground">Chargement…</td>
              </tr>
            ) : data?.logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted-foreground">Aucun log</td>
              </tr>
            ) : (
              data?.logs.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{l.action}</td>
                  <td className="px-4 py-2 hidden md:table-cell text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                    {l.userId ?? '–'}
                  </td>
                  <td className="px-4 py-2 hidden lg:table-cell text-xs text-muted-foreground">{l.ip ?? '–'}</td>
                  <td className="px-4 py-2 hidden xl:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                    {JSON.stringify(l.metadata)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{data.total} logs</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</Button>
            <span className="px-2 py-1 text-muted-foreground">{page} / {data.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>→</Button>
          </div>
        </div>
      )}
    </div>
  )
}
