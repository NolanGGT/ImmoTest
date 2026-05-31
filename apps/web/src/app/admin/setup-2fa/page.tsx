'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, CheckCircle } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Step = 'checking' | 'validate' | 'setup-scan' | 'setup-verify' | 'done'

interface SetupData {
  qrCodeUrl: string
  secret: string
}

export default function SetupTwoFactorPage() {
  const router = useRouter()
  const { user, setAuth, accessToken } = useAuthStore()
  const [step, setStep] = useState<Step>('checking')
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const scannedRef = useRef(false)

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return

    api.get<{ enabled: boolean }>('/api/auth/2fa/status')
      .then((r) => {
        // If 2FA is already configured → validate mode (login step 2)
        // If not configured → setup mode (first time)
        setStep(r.data.enabled ? 'validate' : 'setup-scan')
      })
      .catch(() => setStep('setup-scan'))
  }, [user])

  const handleSetup = async () => {
    if (scannedRef.current) return
    scannedRef.current = true
    setLoading(true)
    try {
      const res = await api.post<SetupData>('/api/auth/2fa/setup')
      setSetupData(res.data)
    } catch {
      setError('Impossible de générer le QR code')
      scannedRef.current = false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (step === 'setup-scan') handleSetup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const handleVerify = async () => {
    if (code.length !== 6) return
    setLoading(true)
    setError(null)
    try {
      await api.post('/api/auth/2fa/verify', { token: code })
      // After verifying setup, also validate to get real token
      const res = await api.post<{ accessToken: string }>('/api/auth/2fa/validate', { token: code })
      if (user && accessToken) {
        setAuth({ ...user, twoFactorVerified: true }, res.data.accessToken)
      }
      setStep('done')
      setTimeout(() => router.replace('/admin'), 1500)
    } catch {
      setError('Code incorrect, réessayez')
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = async () => {
    if (code.length !== 6) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<{ accessToken: string }>('/api/auth/2fa/validate', { token: code })
      if (user && accessToken) {
        setAuth({ ...user, twoFactorVerified: true }, res.data.accessToken)
      }
      router.replace('/admin')
    } catch {
      setError('Code incorrect, réessayez')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <CheckCircle size={40} className="text-green-600" />
        <p className="text-lg font-semibold">2FA activé avec succès</p>
        <p className="text-sm text-muted-foreground">Redirection vers le dashboard…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-indigo-600" />
          <h1 className="text-lg font-bold">
            {step === 'validate' ? 'Vérification 2FA' : 'Configuration 2FA'}
          </h1>
        </div>

        {step === 'validate' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Entrez le code à 6 chiffres affiché dans votre application d&apos;authentification.
            </p>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="text-center text-lg tracking-widest font-mono"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              onClick={handleValidate}
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Vérification…' : 'Valider'}
            </Button>
          </div>
        )}

        {step === 'setup-scan' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scannez ce QR code avec <strong>Google Authenticator</strong> ou <strong>Authy</strong>.
            </p>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : setupData ? (
              <>
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={setupData.qrCodeUrl} alt="QR Code 2FA" className="w-44 h-44 rounded" />
                </div>
                <div className="rounded-md bg-muted p-2 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Ou saisissez manuellement :</p>
                  <p className="font-mono text-xs break-all">{setupData.secret}</p>
                </div>
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => { setStep('setup-verify'); setCode('') }}
                >
                  J&apos;ai scanné le QR code
                </Button>
              </>
            ) : (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        )}

        {step === 'setup-verify' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Entrez le code à 6 chiffres affiché dans votre application pour confirmer la configuration.
            </p>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="text-center text-lg tracking-widest font-mono"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Vérification…' : 'Vérifier et activer'}
            </Button>
            <button
              className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
              onClick={() => { setStep('setup-scan'); scannedRef.current = false }}
            >
              ← Retour au QR code
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
