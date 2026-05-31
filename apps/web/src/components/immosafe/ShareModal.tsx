'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Check, Trash2, Share2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'

interface ShareModalProps {
  bienId: string
  open: boolean
  onClose: () => void
}

interface ShareInfo {
  token: string
  expiresAt: string
}

async function fetchActiveShare(bienId: string): Promise<ShareInfo | null> {
  const { data } = await api.get(`/api/biens/${bienId}/partage`)
  return data
}

async function creerPartage(bienId: string): Promise<ShareInfo> {
  const { data } = await api.post(`/api/biens/${bienId}/partager`)
  return data
}

async function revoquerPartage(bienId: string): Promise<void> {
  await api.delete(`/api/biens/${bienId}/partage`)
}

export function ShareModal({ bienId, open, onClose }: ShareModalProps) {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)

  const { data: activeShare, isLoading } = useQuery<ShareInfo | null>({
    queryKey: ['partage', bienId],
    queryFn: () => fetchActiveShare(bienId),
    enabled: open,
    staleTime: 0,
  })

  const creerMutation = useMutation({
    mutationFn: () => creerPartage(bienId),
    onSuccess: (data) => {
      queryClient.setQueryData(['partage', bienId], data)
    },
  })

  const revoquerMutation = useMutation({
    mutationFn: () => revoquerPartage(bienId),
    onSuccess: () => {
      queryClient.setQueryData(['partage', bienId], null)
    },
  })

  const share = activeShare ?? creerMutation.data ?? null

  const shareUrl = share
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/partage/${share.token}`
    : null

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const expiresLabel = share
    ? `Expire le ${new Date(share.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 size={18} />
            Partager l'analyse
          </DialogTitle>
          <DialogDescription>
            Partagez un lien public vers cette analyse. Le lien expire après 7 jours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : shareUrl ? (
            <>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 text-xs bg-muted rounded-md px-3 py-2 border border-border font-mono truncate"
                />
                <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0">
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </Button>
              </div>
              {expiresLabel && (
                <p className="text-xs text-muted-foreground">{expiresLabel}</p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:text-destructive border-destructive/40 hover:bg-destructive/5"
                disabled={revoquerMutation.isPending}
                onClick={() => revoquerMutation.mutate()}
              >
                {revoquerMutation.isPending ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : (
                  <Trash2 size={14} className="mr-2" />
                )}
                Révoquer le lien
              </Button>
            </>
          ) : (
            <div className="text-center space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Aucun lien actif. Créez un lien partageable.
              </p>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={creerMutation.isPending}
                onClick={() => creerMutation.mutate()}
              >
                {creerMutation.isPending ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : (
                  <Share2 size={14} className="mr-2" />
                )}
                Créer un lien
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
