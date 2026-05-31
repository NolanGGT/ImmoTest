'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Ban } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'

interface UserDetail {
  user: {
    id: string
    email: string
    role: string
    createdAt: string
    freeAnalysisUsed: boolean
  }
  subscription: { status: string; currentPeriodEnd: string } | null
  analyses: Array<{
    id: string
    ville: string
    prix: number
    scoreImmoSafe: number | null
    createdAt: string
    typeBien: string
  }>
  auditLogs: Array<{
    id: string
    action: string
    ip: string | null
    createdAt: string
  }>
  stats: {
    totalAnalyses: number
    analysesThisMonth: number
    estimatedTokenCost: number
    avgScore: number
  }
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
    </div>
  )
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: currentUser } = useAuthStore()
  const [data, setData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [blocking, setBlocking] = useState(false)

  useEffect(() => {
    api.get<UserDetail>(`/api/admin/users/${id}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false))
  }, [id])

  const handleBlock = async () => {
    if (id === currentUser?.id) {
      alert('Vous ne pouvez pas vous bloquer vous-même.')
      return
    }
    if (!confirm(`Bloquer l'utilisateur ${data?.user.email} ?`)) return
    setBlocking(true)
    try {
      await api.patch(`/api/admin/users/${id}`, { blocked: true })
      router.push('/admin/users')
    } finally {
      setBlocking(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Chargement…</div>
  }
  if (!data) {
    return <div className="text-center py-12 text-muted-foreground">Utilisateur introuvable</div>
  }

  const { user, subscription, analyses, auditLogs, stats } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/users" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft size={14} /> Retour
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{user.email}</h1>
            <span className="px-1.5 py-0.5 rounded-full border text-xs font-medium">{user.role}</span>
            {subscription?.status === 'ACTIVE' ? (
              <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">Abonné</span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">Sans abonnement</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Inscrit le {new Date(user.createdAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
        {id !== currentUser?.id && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBlock}
            disabled={blocking}
            className="shrink-0"
          >
            <Ban size={14} className="mr-1.5" />
            Bloquer
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total analyses" value={stats.totalAnalyses} />
        <StatCard label="Ce mois" value={stats.analysesThisMonth} />
        <StatCard label="Coût estimé" value={`${stats.estimatedTokenCost} €`} />
        <StatCard label="Score moyen" value={stats.avgScore || '–'} />
      </div>

      {/* Last analyses */}
      <div className="rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h2 className="text-sm font-medium">Dernières analyses</h2>
        </div>
        {analyses.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-4">Aucune analyse</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Ville</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">Prix</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Score</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden md:table-cell">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {analyses.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 text-muted-foreground">{new Date(a.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2">{a.ville}</td>
                  <td className="px-4 py-2 hidden sm:table-cell">{a.prix.toLocaleString('fr-FR')} €</td>
                  <td className="px-4 py-2">
                    {a.scoreImmoSafe !== null ? (
                      <span className={`font-medium ${a.scoreImmoSafe >= 70 ? 'text-green-600' : a.scoreImmoSafe >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {a.scoreImmoSafe}
                      </span>
                    ) : '–'}
                  </td>
                  <td className="px-4 py-2 hidden md:table-cell text-muted-foreground">{a.typeBien}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Audit logs */}
      <div className="rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h2 className="text-sm font-medium">Audit logs (20 derniers)</h2>
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-4">Aucun log</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {auditLogs.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 text-muted-foreground">{new Date(l.createdAt).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-2 font-mono text-xs">{l.action}</td>
                  <td className="px-4 py-2 text-muted-foreground hidden sm:table-cell">{l.ip || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
