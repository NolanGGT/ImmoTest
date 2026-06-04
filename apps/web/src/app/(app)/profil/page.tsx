'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { useAuthStore } from '@/stores/auth.store'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuth } from '@/hooks/useAuth'
import { useMe } from '@/hooks/useMe'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useSharedAccess, useInvite, useRevokeAccess } from '@/hooks/useSharedAccess'
import { Users, Loader2, Sun, Moon, Monitor, Shield, LogOut, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

function formatDate(iso: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

// ─── Shared access section (unchanged) ────────────────────────────────────────

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
        {data?.received && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl mb-2">
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              👥 Vous consultez la recherche de{' '}
              <strong>{data.received.owner.email.split('@')[0]}</strong>
            </p>
          </div>
        )}

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

// ─── Main page ─────────────────────────────────────────────────────────────────

function ProfilContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const { logout } = useAuth()
  const { data: profile } = useMe()
  const { theme, setTheme } = useTheme()

  const {
    isActive,
    currentPeriodEnd,
    daysRemaining,
    cancelAtPeriodEnd,
    isLoading,
    createCheckout,
    isCreatingCheckout,
    checkoutError,
    cancel,
    isCancelling,
    reactivate,
    isReactivating,
  } = useSubscription()

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const success = searchParams.get('success')
    const cancelled = searchParams.get('cancelled')
    if (success === 'true') {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      toast.success('Paiement réussi ! Votre accès ImmoTest est maintenant actif.')
      router.replace('/profil')
    } else if (cancelled === 'true') {
      toast.info('Paiement annulé. Vous pouvez réessayer quand vous le souhaitez.')
      router.replace('/profil')
    }
  }, [searchParams, queryClient, router])

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/api/auth/password', { currentPassword, newPassword })
    },
    onSuccess: () => {
      toast.success('Mot de passe modifié avec succès')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (error: unknown) => {
      const code = (error as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code
      const msg =
        code === 'WRONG_PASSWORD' ? 'Mot de passe actuel incorrect' :
        code === 'SAME_PASSWORD' ? 'Le nouveau mot de passe doit être différent' :
        code === 'NO_PASSWORD' ? 'Ce compte utilise la connexion Google' :
        'Erreur lors du changement de mot de passe'
      toast.error(msg)
    },
  })

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/api/auth/account')
    },
    onSuccess: () => {
      logout()
      router.replace('/login')
    },
    onError: () => toast.error('Erreur lors de la suppression du compte'),
  })

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    changePasswordMutation.mutate()
  }

  const handleCancel = () => {
    cancel(undefined, {
      onSuccess: () => {
        setShowCancelModal(false)
        toast.info(`Abonnement annulé. Votre accès reste actif jusqu'au ${currentPeriodEnd ? formatDate(currentPeriodEnd) : '—'}.`)
      },
      onError: () => toast.error("Erreur lors de l'annulation. Réessayez plus tard."),
    })
  }

  const handleReactivate = () => {
    reactivate(undefined, {
      onSuccess: () => toast.success('Abonnement réactivé !'),
      onError: () => toast.error('Erreur lors de la réactivation.'),
    })
  }

  const isExpired = !isActive && currentPeriodEnd !== undefined

  const themeOptions = [
    { value: 'light', icon: Sun, label: 'Clair' },
    { value: 'dark', icon: Moon, label: 'Sombre' },
    { value: 'system', icon: Monitor, label: 'Système' },
  ] as const

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Section 1 — Header profil */}
      <div className="flex items-center gap-4 p-6 bg-gray-900 dark:bg-gray-900 rounded-2xl border border-gray-800">
        <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-xl font-bold text-white shrink-0">
          {user?.email?.[0].toUpperCase() ?? '?'}
        </div>
        <div>
          <p className="font-semibold text-white text-lg">{user?.email}</p>
          {profile?.createdAt && (
            <p className="text-sm text-gray-400">
              Membre depuis{' '}
              {new Date(profile.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Section 2 — Abonnement */}
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
            <div className="space-y-4">
              {cancelAtPeriodEnd ? (
                <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-1 rounded-full">
                  ⚠️ Annulé — accès jusqu'au {currentPeriodEnd ? formatDate(currentPeriodEnd) : '—'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
                  ✅ Abonnement actif
                </span>
              )}
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
                  className={cn(
                    'h-2 rounded-full transition-all duration-500',
                    cancelAtPeriodEnd ? 'bg-orange-400' : 'bg-green-500'
                  )}
                  style={{ width: `${Math.min(100, Math.round(((daysRemaining ?? 0) / 90) * 100))}%` }}
                />
              </div>
              {cancelAtPeriodEnd ? (
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  size="sm"
                  onClick={handleReactivate}
                  disabled={isReactivating}
                >
                  {isReactivating ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                  Renouveler l'abonnement
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setShowCancelModal(true)}
                >
                  Annuler mon abonnement
                </Button>
              )}
            </div>
          ) : isExpired ? (
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 bg-muted text-muted-foreground text-xs font-medium px-2.5 py-1 rounded-full">
                ⏰ Abonnement expiré
              </span>
              <p className="text-sm text-muted-foreground">
                Votre accès a expiré le{' '}
                <strong>{currentPeriodEnd ? formatDate(currentPeriodEnd) : '—'}</strong>.
              </p>
              <Button className="w-full" onClick={() => createCheckout()} disabled={isCreatingCheckout}>
                {isCreatingCheckout ? 'Redirection…' : 'Renouveler mon accès — 29 €'}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="font-semibold mb-3">Passez à l'abonnement ImmoTest</p>
                <ul className="space-y-2 text-sm">
                  {['Analyses illimitées', 'Rapports PDF téléchargeables', 'Accès pendant 3 mois complets'].map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <span className="text-green-600">✅</span>{b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-center py-2">
                <p className="text-4xl font-bold">29 €</p>
                <p className="text-sm text-muted-foreground">pour 3 mois</p>
                <p className="text-xs text-muted-foreground mt-1">Paiement unique, pas d'abonnement automatique</p>
              </div>
              {checkoutError && <p className="text-sm text-destructive text-center">Une erreur est survenue. Veuillez réessayer.</p>}
              <Button className="w-full" size="lg" onClick={() => createCheckout()} disabled={isCreatingCheckout}>
                {isCreatingCheckout ? 'Redirection vers Stripe…' : 'Démarrer mon accès'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3 — Sécurité */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield size={18} className="text-indigo-500" />
            Sécurité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={!currentPassword || !newPassword || !confirmPassword || changePasswordMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {changePasswordMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
            Changer le mot de passe
          </Button>
        </CardContent>
      </Card>

      {/* Section 4 — Apparence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Apparence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {themeOptions.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors flex-1 justify-center',
                  theme === value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-border text-muted-foreground hover:border-indigo-300 hover:text-foreground'
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 5 — Recherche partagée */}
      <SharedAccessSection />

      {/* Section 6 — Danger zone */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <CardTitle className="text-lg text-red-600">Zone de danger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
            onClick={() => logout()}
          >
            <LogOut size={16} />
            Se déconnecter
          </Button>
          <Button
            variant="outline"
            className="w-full border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 size={16} />
            Supprimer mon compte
          </Button>
        </CardContent>
      </Card>

      {/* Modal — Annuler abonnement */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler votre abonnement ?</DialogTitle>
            <DialogDescription>
              Votre accès reste actif jusqu'au{' '}
              <strong>{currentPeriodEnd ? formatDate(currentPeriodEnd) : '—'}</strong>
              {daysRemaining !== undefined && ` (${daysRemaining} jours restants)`}.
              Après cette date, vous ne pourrez plus analyser de nouveaux biens.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal — Supprimer compte */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer votre compte ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Tous vos biens, analyses et données seront définitivement supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ProfilPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <div className="h-24 bg-muted animate-pulse rounded-2xl" />
          <div className="h-48 bg-muted animate-pulse rounded-xl" />
          <div className="h-32 bg-muted animate-pulse rounded-xl" />
        </div>
      }
    >
      <ProfilContent />
    </Suspense>
  )
}
