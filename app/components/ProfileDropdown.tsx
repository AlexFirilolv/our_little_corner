'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { useLocket } from '../contexts/LocketContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { User, Settings, LogOut, ChevronDown, Heart } from 'lucide-react'

export default function ProfileDropdown() {
  const { user, signOut } = useAuth()
  const { currentLocket } = useLocket()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user || !currentLocket) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <Button
        variant="ghost"
        className="flex items-center gap-2 px-3 py-2 hover:bg-accent/20"
        onClick={() => setIsOpen(!isOpen)}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'User'}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
        )}
        <span className="font-body text-sm hidden md:block">
          {user.displayName || user.email}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <Card className="absolute top-full right-0 mt-2 w-80 shadow-2xl border-accent/30 z-50 bg-card backdrop-blur-md">
          <CardContent className="p-4">
            {/* User Info */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-accent/20">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-heading text-primary text-lg">
                  {user.displayName || 'Anonymous'}
                </p>
                <p className="font-body text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Current Locket */}
            <div className="mb-4 pb-4 border-b border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-primary" />
                <span className="font-body text-sm font-medium">Your Locket</span>
              </div>
              <div className="ml-6">
                <p className="font-heading text-primary">{currentLocket.name}</p>
              </div>
            </div>

            {/* Menu Actions */}
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start px-2 py-2 h-auto font-body"
                onClick={() => {
                  setIsOpen(false)
                  router.push('/settings')
                }}
              >
                <Settings className="h-4 w-4 mr-3" />
                Settings
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start px-2 py-2 h-auto font-body text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleSignOut}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 mr-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    Signing out...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-3" />
                    Sign Out
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
