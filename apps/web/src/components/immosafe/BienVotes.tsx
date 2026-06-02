'use client'

import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { useVotes, useSubmitVote } from '@/hooks/useVotes'
import type { BienVoteRecord } from '@/hooks/useVotes'

const VOTE_OPTIONS = [
  { type: 'LOVE'    as const, emoji: '❤️', label: "J'adore" },
  { type: 'LIKE'    as const, emoji: '👍', label: 'Intéressant' },
  { type: 'DISLIKE' as const, emoji: '👎', label: 'Pas convaincu' },
]

interface Props {
  bienId: string
  currentUserId: string
}

function nameFromEmail(email: string): string {
  return email.split('@')[0]
}

export function BienVotes({ bienId, currentUserId }: Props) {
  const { data, isLoading } = useVotes(bienId, !!currentUserId)
  const submitVote = useSubmitVote(bienId)

  const myVote = data?.votes.find((v) => v.userId === currentUserId) ?? null
  const partnerVote = data?.votes.find((v) => v.userId !== currentUserId) ?? null
  const partner = data?.partner ?? null

  const [myComment, setMyComment] = useState(myVote?.comment ?? '')

  // Sync comment when vote data loads
  useEffect(() => {
    if (myVote?.comment !== undefined) setMyComment(myVote.comment ?? '')
  }, [myVote?.comment])

  const handleVote = (vote: 'LOVE' | 'LIKE' | 'DISLIKE') => {
    submitVote.mutate({ vote, comment: myComment || undefined })
  }

  const handleCommentBlur = () => {
    if (myVote && myComment !== (myVote.comment ?? '')) {
      submitVote.mutate({ vote: myVote.vote, comment: myComment || undefined })
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded w-32 animate-pulse" />
        <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    )
  }

  const hasPartner = !!partner

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <MessageCircle size={16} className="text-gray-400" />
        Vos avis
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Vote de l'utilisateur courant */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Votre avis</p>

          <div className="flex gap-2 mb-3">
            {VOTE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                type="button"
                onClick={() => handleVote(opt.type)}
                disabled={submitVote.isPending}
                className={`flex-1 flex flex-col items-center py-2 rounded-xl border-2 transition ${
                  myVote?.vote === opt.type
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{opt.label}</span>
              </button>
            ))}
          </div>

          {myVote && (
            <textarea
              placeholder="Ajouter un commentaire… (optionnel)"
              value={myComment}
              onChange={(e) => setMyComment(e.target.value)}
              onBlur={handleCommentBlur}
              maxLength={500}
              rows={2}
              className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent px-3 py-2 resize-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400"
            />
          )}
        </div>

        {/* Vote du partenaire */}
        {partnerVote ? (
          <PartnerVoteCard vote={partnerVote} />
        ) : hasPartner ? (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Avis de {nameFromEmail(partner!.email)}
            </p>
            <div className="p-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 text-center h-full flex items-center justify-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">En attente de son avis…</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PartnerVoteCard({ vote }: { vote: BienVoteRecord }) {
  const opt = VOTE_OPTIONS.find((v) => v.type === vote.vote)
  const borderColor =
    vote.vote === 'LOVE' ? 'border-red-200 bg-red-50 dark:bg-red-900/20' :
    vote.vote === 'LIKE' ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20' :
    'border-gray-200 bg-gray-50 dark:bg-gray-700/50'

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        Avis de {nameFromEmail(vote.user.email)}
      </p>
      <div className={`p-3 rounded-xl border-2 ${borderColor}`}>
        <p className="text-2xl mb-1">{opt?.emoji}</p>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{opt?.label}</p>
        {vote.comment && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">"{vote.comment}"</p>
        )}
      </div>
    </div>
  )
}
