'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'

interface CTAButtonProps {
  size?: 'default' | 'large'
  label?: string
  className?: string
}

export function CTAButton({
  size = 'default',
  label = 'Analyser une annonce gratuitement →',
  className = '',
}: CTAButtonProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const router = useRouter()

  const handleClick = () => {
    router.push(isAuthenticated ? '/analyser' : '/login?redirect=/analyser&source=landing')
  }

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center
        bg-indigo-600 hover:bg-indigo-500 text-white font-semibold
        rounded-xl transition-all duration-200 shadow-lg
        hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0
        ${size === 'large' ? 'px-8 py-4 text-lg' : 'px-6 py-3 text-base'}
        ${className}
      `}
    >
      {label}
    </button>
  )
}
