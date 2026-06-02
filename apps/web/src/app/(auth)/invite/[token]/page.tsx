'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(`/register?invite=${token}`)
      return
    }

    api.get(`/api/shared-access/accept/${token}`)
      .then(() => {
        setStatus('success')
        toast.success('Invitation acceptée ! Vous pouvez maintenant voir les biens.')
        setTimeout(() => router.push('/biens'), 1500)
      })
      .catch((err) => {
        const code = err?.response?.data?.error?.code
        const msg =
          code === 'EXPIRED' ? 'Cette invitation a expiré.' :
          code === 'REVOKED' ? 'Cette invitation a été révoquée.' :
          code === 'NOT_FOUND' ? 'Invitation introuvable.' :
          'Invitation invalide.'
        setStatus('error')
        setErrorMsg(msg)
      })
  }, [isAuthenticated, token, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-3 max-w-sm">
        {status === 'loading' && (
          <>
            <Loader2 size={40} className="animate-spin mx-auto text-indigo-500" />
            <h1 className="text-xl font-bold">Validation de l'invitation…</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 size={40} className="mx-auto text-green-500" />
            <h1 className="text-xl font-bold">Invitation acceptée !</h1>
            <p className="text-muted-foreground text-sm">Redirection vers les biens…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={40} className="mx-auto text-red-500" />
            <h1 className="text-xl font-bold">Invitation invalide</h1>
            <p className="text-muted-foreground text-sm">{errorMsg}</p>
            <button
              onClick={() => router.push('/')}
              className="text-indigo-600 hover:underline text-sm"
            >
              Retour à l'accueil
            </button>
          </>
        )}
      </div>
    </div>
  )
}
