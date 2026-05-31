'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BienCard } from '@/components/immosafe/BienCard'
import { useBiens } from '@/hooks/useBiens'
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle'
import { useAuthStore } from '@/stores/auth.store'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading } = useBiens({ limit: 3 })
  const favoriteToggle = useFavoriteToggle()

  const biens = data?.biens ?? null
  const total = data?.pagination.total ?? 0
  const recent = biens?.slice(0, 3) ?? []
  const firstName = user?.email?.split('@')[0] ?? 'vous'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bonjour, {firstName}</h1>
        <p className="text-muted-foreground mt-1 text-sm">Bienvenue sur votre tableau de bord ImmoSafe.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : !biens || biens.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-dashed border-border p-12 text-center"
        >
          <p className="text-4xl mb-4">🏠</p>
          <h2 className="font-semibold text-lg mb-2">Aucun bien analysé</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
            Analysez votre premier bien et obtenez un score ImmoSafe en 10 secondes.
          </p>
          <Button asChild>
            <Link href="/analyser">Analyser un bien</Link>
          </Button>
        </motion.div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Dernières analyses</h2>
            <Link href="/biens" className="text-sm text-indigo-600 hover:underline">
              Voir tout ({total})
            </Link>
          </div>
          <div className="space-y-3">
            {recent.map((bien, i) => (
              <motion.div
                key={bien.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <BienCard
                  bien={bien}
                  onFavoriteToggle={(id, current) =>
                    favoriteToggle.mutate({ id, isFavorite: !current })
                  }
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* FAB mobile */}
      {biens && biens.length > 0 && (
        <Link
          href="/analyser"
          className="fixed bottom-20 right-4 md:hidden w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors"
        >
          <Plus size={24} />
        </Link>
      )}
    </div>
  )
}
