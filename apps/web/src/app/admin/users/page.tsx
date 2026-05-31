'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, Eye, Ban } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AdminUser {
  id: string
  email: string
  role: string
  createdAt: string
  freeAnalysisUsed: boolean
  subscription: { status: string; currentPeriodEnd: string } | null
  analysesCount: number
  lastAnalysisAt: string | null
  isSuspicious: boolean
}

interface UsersResponse {
  users: AdminUser[]
  total: number
  page: number
  totalPages: number
}

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'subscribed', label: 'Abonnés' },
  { key: 'active', label: 'Actifs' },
  { key: 'suspicious', label: 'Suspects' },
]

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [blockingId, setBlockingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        filter,
        ...(search ? { search } : {}),
      })
      const res = await api.get<UsersResponse>(`/api/admin/users?${params}`)
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [page, filter, search])

  useEffect(() => { load() }, [load])

  const handleBlock = async (userId: string, email: string) => {
    if (!confirm(`Bloquer l'utilisateur ${email} ? Cette action supprime sa session active.`)) return
    setBlockingId(userId)
    try {
      await api.patch(`/api/admin/users/${userId}`, { blocked: true })
      load()
    } finally {
      setBlockingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Utilisateurs</h1>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par email…"
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setPage(1) }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-indigo-600 text-white'
                  : 'border text-muted-foreground hover:bg-accent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Inscrit le</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Abonnement</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Analyses</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Coût est.</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">Chargement…</td>
              </tr>
            ) : data?.users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">Aucun utilisateur</td>
              </tr>
            ) : (
              data?.users.map((u) => (
                <tr key={u.id} className={`hover:bg-muted/30 transition-colors ${u.isSuspicious ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate max-w-[160px]">{u.email}</span>
                      {u.isSuspicious && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-medium shrink-0">
                          Suspect
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">
                    {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-2.5">
                    {u.subscription?.status === 'ACTIVE' ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-medium">
                        Actif
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">–</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">{u.analysesCount}</td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground">
                    {(u.analysesCount * 0.011).toFixed(2)} €
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/users/${u.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Eye size={14} />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        onClick={() => handleBlock(u.id, u.email)}
                        disabled={blockingId === u.id}
                      >
                        <Ban size={14} />
                      </Button>
                    </div>
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
          <span className="text-muted-foreground">{data.total} utilisateurs</span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ←
            </Button>
            <span className="px-2 py-1 text-muted-foreground">
              {page} / {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
