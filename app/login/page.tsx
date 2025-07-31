"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, Lock } from 'lucide-react'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect to the gallery
        router.push('/')
      } else {
        setError(data.error || 'Invalid password')
      }
    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Romantic header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Heart className="h-8 w-8 text-primary animate-heart-beat" />
            <h1 className="text-4xl font-romantic text-primary">Our Little Corner</h1>
            <Heart className="h-8 w-8 text-primary animate-heart-beat" />
          </div>
          <p className="text-muted-foreground font-body">
            A special place for our memories 💕
          </p>
        </div>

        {/* Login card */}
        <Card className="romantic-card border-accent/30 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-romantic text-primary">Welcome Back</CardTitle>
            <CardDescription className="font-body">
              Enter the password to access our memories
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Enter password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="romantic-input text-center text-lg h-12"
                  disabled={isLoading}
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-red-500 text-center font-body animate-fade-in">
                    {error}
                  </p>
                )}
              </div>
              
              <Button
                type="submit"
                variant="romantic"
                className="w-full h-12 text-lg"
                disabled={isLoading || !password.trim()}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Entering...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Enter Our Corner
                    <Heart className="h-5 w-5" />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground font-body">
                Made with 💖 for someone special
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Decorative elements */}
        <div className="mt-8 text-center">
          <div className="flex justify-center items-center gap-2 text-primary/60">
            <div className="w-2 h-2 bg-primary/40 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    </div>
  )
}