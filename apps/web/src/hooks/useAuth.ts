'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setAuth, clearAuth, isAuthenticated, user } = useAuthStore()

  const login = async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{ success: boolean; requiresTwoFactor?: boolean }> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.post('/api/auth/login', { email, password, rememberMe })
      const userData = response.data.user as { id: string; email: string; role: 'USER' | 'ADMIN'; twoFactorVerified: boolean }
      setAuth(userData, response.data.accessToken)
      // ADMIN with twoFactorVerified: false → needs 2FA
      const requiresTwoFactor = userData.role === 'ADMIN' && !userData.twoFactorVerified
      return { success: true, requiresTwoFactor }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Erreur de connexion'
      setError(message)
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.post('/api/auth/register', { email, password })
      setAuth(response.data.user, response.data.accessToken)
      return true
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Erreur lors de l'inscription"
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await api.post('/api/auth/logout')
    } finally {
      clearAuth()
    }
  }

  return { login, register, logout, isLoading, error, isAuthenticated, user }
}
