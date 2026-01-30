'use client'

import { useAuth } from '../contexts/AuthContext'
import { useLocket } from '../contexts/LocketContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import LocketCreator from '../components/LocketCreator'

export default function LocketCreatePage() {
  const { user, loading: authLoading } = useAuth()
  const { currentLocket, userLockets, loading: locketLoading } = useLocket()
  const router = useRouter()

  useEffect(() => {
    // Wait for both auth and locket context to load
    if (authLoading || locketLoading) return

    // Not authenticated - redirect to login
    if (!user) {
      router.push('/login')
      return
    }

    // User already has a locket - redirect to home
    if (currentLocket || userLockets.length > 0) {
      router.replace('/')
      return
    }
  }, [user, authLoading, currentLocket, userLockets, locketLoading, router])

  // Show loading while auth/locket state is being determined
  if (authLoading || locketLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null
  }

  // User already has a locket - show loading while redirect happens
  if (currentLocket || userLockets.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to home...</p>
        </div>
      </div>
    )
  }

  return <LocketCreator />
}
