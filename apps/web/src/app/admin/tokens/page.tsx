'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface TokenUser {
  userId: string
  email: string
  analysesCount: number
  estimatedCostEuros: number
  isSubscribed: boolean
  isProfitable: boolean
}

interface TokenStats {
  users: TokenUser[]
  totals: {
    totalCostEuros: number
    totalRevenueEuros: number
    marginEuros: number
    marginPercent: number
  }
}

export default function AdminTokensPage() {
  const [data, setData] = useState<TokenStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<TokenStats>('/api/admin/token-stats')
      .then((r) => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Chargement…</div>
  }
  if (!data) return null

  const { totals } = data

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tokens & coûts</h1>

      {/* Global card */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="text-sm font-medium">Vue globale</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Coût total API', value: `${totals.totalCostEuros.toFixed(2)} €` },
            { label: 'Revenus totaux', value: `${totals.totalRevenueEuros.toFixed(2)} €` },
            {
              label: 'Marge',
              value: `${totals.marginEuros >= 0 ? '+' : ''}${totals.marginEuros.toFixed(2)} €`,
              highlight: totals.marginEuros >= 0 ? 'text-green-600' : 'text-red-600',
            },
            { label: 'Marge %', value: `${totals.marginPercent.toFixed(1)} %` },
          ].map(({ label, value, highlight }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-xl font-bold ${highlight ?? ''}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Analyses</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Coût estimé</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Abonné</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Rentable</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.users.map((u) => (
              <tr key={u.userId} className={`hover:bg-muted/30 ${!u.isProfitable ? 'bg-red-50/50' : ''}`}>
                <td className="px-4 py-2.5 truncate max-w-[180px]">{u.email}</td>
                <td className="px-4 py-2.5">{u.analysesCount}</td>
                <td className={`px-4 py-2.5 font-medium ${!u.isProfitable ? 'text-red-600' : ''}`}>
                  {u.estimatedCostEuros.toFixed(2)} €
                </td>
                <td className="px-4 py-2.5 hidden sm:table-cell">
                  {u.isSubscribed ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </td>
                <td className="px-4 py-2.5 hidden md:table-cell">
                  {u.isProfitable ? (
                    <span className="text-green-600 text-xs font-medium">Oui</span>
                  ) : (
                    <span className="text-red-600 text-xs font-medium">Non</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
