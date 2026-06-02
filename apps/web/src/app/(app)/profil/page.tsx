'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useSharedAccess, useInvite, useRevokeAccess } from '@/hooks/useSharedAccess'
import { Users, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

type Notification = { type: 'success' | 'error' | 'info'; message: string }

function SharedAccessSection() {
  const { data, isLoading } = useSharedAccess()
  const invite = useInvite()
  const revoke = useRevokeAccess()
  const [email, setEmail] = useState('')

  const activeInvitations = data?.owned.filter((i) => i.status !== 'REVOKED') ?? []
  const canInvite = activeInvitations.length < 3

  const handleInvite = () => {
    if (!email.trim()) return
    invite.mutate(email.trim(), {
      onSuccess: () => {
        toast.success(`Invitation envoyée à ${email}`)
        setEmail('')
      },
      onError: (err: unknown) => {
        const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code
        const msg =
          code === 'ALREADY_INVITED' ? 'Cet email a déjà été invité.' :
          code === 'MAX_INVITATIONS' ? 'Maximum 3 invités actifs.' :
          code === 'INVALID_EMAIL' ? 'Vous ne pouvez pas vous inviter vous-même.' :
          "Erreur lors de l'envoi."
        toast.error(msg)
      },
    })
  }

  const STATUS_LABEL: Record<string, string> = {
    ACTIVE: '✅ Accès actif',
    PENDING: '⏳ Invitation en attente',
    REVOKED: 'Révoqué',
  }
  const STATUS_COLOR: Record<string, string> = {
    ACTIVE: 'text-green-600',
    PENDING: 'text-orange-500',
    REVOKED: 'text-gray-400',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users size={18} className="text-indigo-500" />
          Recherche partagée
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Accès reçu (guest) */}
        {data?.received && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl mb-2">
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              👥 Vous consultez la recherche de{' '}
              <strong>{data.received.owner.email.split('@')[0]}</strong>
            </p>
          </div>
        )}

        {/* Invitations envoyées */}
        {isLoading ? (
          <div className="h-10 bg-muted animate-pulse rounded-xl" />
        ) : (
          data?.owned.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{inv.guestEmail}</p>
                <p className={`text-xs ${STATUS_COLOR[inv.status] ?? 'text-gray-400'}`}>
                  {STATUS_LABEL[inv.status] ?? inv.status}
                </p>
              </div>
              {inv.status !== 'REVOKED' && (
                <button
                  onClick={() => revoke.mutate(inv.id)}
                  disabled={revoke.isPending}
                  className="text-xs text-red-400 hover:text-red-600 transition"
                >
                  Révoquer
                </button>
              )}
            </div>
          ))
        )}

        {/* Formulaire d'invitation */}
        {canInvite && (
          <div className="flex gap-2 pt-1">
            <Input
              type="email"
              placeholder="Email de votre partenaire…"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              className="flex-1"
            />
            <Button
              onClick={handleInvite}
              disabled={!email.trim() || invite.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
            >
              {invite.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Inviter'}
            </Button>
          </div>
        )}

        {!canInvite && (
          <p className="text-xs text-muted-foreground">Maximum 3 invités actifs atteint.</p>
        )}
      </CardContent>
    </Card>
  )
}

function ProfilContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const { logout } = useAuth()

  const {
    isActive,
    currentPeriodEnd,
    daysRemaining,
    isLoading,
    createCheckout,
    isCreatingCheckout,
    checkoutError,
    cancel,
    isCancelling,
  } = useSubscription()

  const [notification, setNotification] = useState<Notification | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  useEffect(() => {
    const success = searchParams.get('success')
    const cancelled = searchParams.get('cancelled')

    if (success === 'true') {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      setNotification({ type: 'success', message: 'Paiement réussi ! Votre accès ImmoTest est maintenant actif.' })
      router.replace('/profil')
    } else if (cancelled === 'true') {
      setNotification({ type: 'info', message: 'Paiement annulé. Vous pouvez réessayer quand vous le souhaitez.' })
      router.replace('/profil')
    }
  }, [searchParams, queryClient, router])

  const handleCancel = () => {
    cancel(undefined, {
      onSuccess: () => {
        setShowCancelConfirm(false)
        setNotification({
          type: 'info',
          message: `Abonnement annulé. Votre accès reste actif jusqu'au ${currentPeriodEnd ? formatDate(currentPeriodEnd) : '—'}.`,
        })
      },
      onError: () => {
        setNotification({ type: 'error', message: "Erreur lors de l'annulation. Réessayez plus tard." })
      },
    })
  }

  const isExpired = !isActive && currentPeriodEnd !== undefined

  const notifColors: Record<Notification['type'], string> = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  }

  return (
    <div className="container max-w-lg mx-auto px-4 py-8 space-y-6">
      {notification && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-start justify-between gap-3 border ${notifColors[notification.type]}`}>
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="opacity-60 hover:opacity-100 shrink-0 text-lg leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      {/* Bloc apparence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Apparence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Choisissez le thème de l'interface.</p>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Bloc compte */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mon compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <Button variant="outline" size="sm" onClick={() => logout()}>
            Se déconnecter
          </Button>
        </CardContent>
      </Card>

      {/* Bloc partage */}
      <SharedAccessSection />

      {/* Bloc abonnement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mon abonnement</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            </div>
          ) : isActive ? (
            // Bloc B — abonné actif
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
                ✅ Abonnement actif
              </span>
              <div className="space-y-1">
                <p className="text-sm">
                  Accès valide jusqu'au{' '}
                  <strong>{currentPeriodEnd ? formatDate(currentPeriodEnd) : '—'}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Il vous reste <strong>{daysRemaining}</strong> jour{daysRemaining !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round(((daysRemaining ?? 0) / 90) * 100))}%` }}
                />
              </div>

              {showCancelConfirm ? (
                <div className="border rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium">Annuler l'abonnement ?</p>
                  <p className="text-sm text-muted-foreground">
                    Votre accès restera actif jusqu'au{' '}
                    <strong>{currentPeriodEnd ? formatDate(currentPeriodEnd) : '—'}</strong>.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isCancelling}
                    >
                      {isCancelling ? 'Annulation…' : "Confirmer l'annulation"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowCancelConfirm(false)}>
                      Retour
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  Annuler mon abonnement
                </Button>
              )}
            </div>
          ) : isExpired ? (
            // Bloc C — expiré
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 bg-muted text-muted-foreground text-xs font-medium px-2.5 py-1 rounded-full">
                ⏰ Abonnement expiré
              </span>
              <p className="text-sm text-muted-foreground">
                Votre accès a expiré le{' '}
                <strong>{currentPeriodEnd ? formatDate(currentPeriodEnd) : '—'}</strong>.
              </p>
              <Button
                className="w-full"
                onClick={() => createCheckout()}
                disabled={isCreatingCheckout}
              >
                {isCreatingCheckout ? 'Redirection…' : 'Renouveler mon accès — 29 €'}
              </Button>
            </div>
          ) : (
            // Bloc A — pas abonné
            <div className="space-y-5">
              <div>
                <p className="font-semibold mb-3">Passez à l'abonnement ImmoTest</p>
                <ul className="space-y-2 text-sm">
                  {[
                    'Analyses illimitées',
                    'Rapports PDF téléchargeables',
                    'Accès pendant 3 mois complets',
                  ].map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-center py-2">
                <p className="text-4xl font-bold">29 €</p>
                <p className="text-sm text-muted-foreground">pour 3 mois</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Paiement unique, pas d'abonnement automatique
                </p>
              </div>
              {checkoutError && (
                <p className="text-sm text-destructive text-center">
                  Une erreur est survenue. Veuillez réessayer.
                </p>
              )}
              <Button
                className="w-full"
                size="lg"
                onClick={() => createCheckout()}
                disabled={isCreatingCheckout}
              >
                {isCreatingCheckout ? 'Redirection vers Stripe…' : 'Démarrer mon accès'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ProfilPage() {
  return (
    <Suspense
      fallback={
        <div className="container max-w-lg mx-auto px-4 py-8 space-y-6">
          <div className="h-32 bg-muted animate-pulse rounded-xl" />
          <div className="h-48 bg-muted animate-pulse rounded-xl" />
        </div>
      }
    >
      <ProfilContent />
    </Suspense>
  )
}
