'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLocket } from '@/contexts/LocketContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Heart, Mail, Users, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'

interface LocketInvite {
  id: string
  locket_id: string
  email: string
  role: 'admin' | 'participant'
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expires_at: string
  invited_by?: {
    name: string
    email: string
  }
  locket?: {
    id: string
    name: string
    description?: string
  }
}

export default function InvitePage({ params }: { params: { code: string } }) {
  const { code } = params
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { switchLocket, refreshLockets } = useLocket()

  const [invite, setInvite] = useState<LocketInvite | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Auth form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const inviteEmail = searchParams.get('email')

  useEffect(() => {
    if (inviteEmail) {
      setEmail(inviteEmail)
    }
    loadInvite()
  }, [code, inviteEmail])

  const loadInvite = async () => {
    try {
      setLoading(true)
      // We need to find the invite by locket invite_code and email
      const response = await fetch(`/api/locket-invites?code=${code}&email=${inviteEmail || ''}`)

      if (response.ok) {
        const data = await response.json()
        if (data.invite) {
          setInvite(data.invite)
          if (data.invite.status !== 'pending') {
            setError(`This invitation is ${data.invite.status}`)
          }
        } else {
          setError('Invitation not found or expired')
        }
      } else {
        setError('Failed to load invitation')
      }
    } catch (error) {
      setError('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invite) return

    setProcessing(true)
    setError('')

    try {
      if (!auth) {
        throw new Error('Firebase not initialized')
      }

      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
      const provider = new GoogleAuthProvider()

      // Request additional scopes if needed
      provider.addScope('email')
      provider.addScope('profile')

      provider.setCustomParameters({
        prompt: 'select_account'
      })

      const userCredential = await signInWithPopup(auth, provider)

      // Wait for auth context to update
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Accept the invitation
      await acceptInvitation()

    } catch (error: any) {
      console.error('Authentication error:', error)
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.')
      } else {
        setError(error.message || 'Authentication failed')
      }
    } finally {
      setProcessing(false)
    }
  }

  const acceptInvitation = async () => {
    if (!invite) return

    try {
      setProcessing(true)

      let response;
      if (invite.id === 'generic-invite-code') {
        // Handle generic invite link by calling the join endpoint
        response = await fetch('/api/lockets/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code })
        })
      } else {
        // Handle specific invite by ID
        response = await fetch(`/api/locket-invites/${invite.id}/accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        })
      }

      if (response.ok) {
        setSuccess('Invitation accepted! Redirecting to your locket...')

        // Refresh lockets to include the newly joined locket in the background
        refreshLockets().catch(console.error)
        if (invite.locket) {
          switchLocket(invite.locket.id).catch(console.error)
        }

        // Redirect to home (user now has a locket) using a hard navigation to ensure clean state
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
      } else {
        const errorData = await response.json()

        // If the user is already a member, treat it as a success and redirect them
        if (response.status === 409 || errorData.error?.includes('already a member')) {
          setSuccess('You are already a member! Redirecting to your locket...')
          setTimeout(() => {
            window.location.href = '/'
          }, 1500)
        } else {
          setError(errorData.error || 'Failed to accept invitation')
        }
      }
    } catch (error) {
      setError('Failed to accept invitation')
    } finally {
      setProcessing(false)
    }
  }

  const handleDirectAccept = async () => {
    if (user) {
      await acceptInvitation()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Invitation Not Found</CardTitle>
            <CardDescription>
              {error || 'This invitation may have expired or been revoked.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>{success}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl font-heading text-primary">
            You're Invited!
          </CardTitle>
          <CardDescription>
            {invite.invited_by ? (
              <>
                You've been invited by <strong>{invite.invited_by.name}</strong> to join <strong>{invite.locket?.name || 'Our Locket'}</strong>!
              </>
            ) : (
              <>
                You've been invited to join <strong>{invite.locket?.name || 'Our Locket'}</strong>!
              </>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {user ? (
            // User is already authenticated
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Signed in as {user.email}
              </div>
              <Button
                onClick={handleDirectAccept}
                disabled={processing}
                className="w-full"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  'Accept Invitation'
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Please sign in with Google to continue
              </p>

              <Button
                onClick={handleAuth}
                disabled={processing}
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <title>Google</title>
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}