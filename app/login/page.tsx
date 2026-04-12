"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithGoogle } from '@/lib/firebase/auth'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError('')

    try {
      const user = await signInWithGoogle()
      if (user) {
        setTimeout(() => {
          router.push('/')
        }, 500)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Google sign-in failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-row bg-background font-body">
      {/* Left Column — Image & Quote */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-end p-12 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[8s] hover:scale-105"
          style={{
            backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBfGZEUHQR6iriogrUa456GIpjsbWO3gQhXcCF9ns4X4Zlw3JfXc5YA0s8hqKqcEEUcsioBfZWtE63MHPYJG8XGFzyvqL0wr4L-Bx6i9g0FTxnsiRmqq6VpNmdTUotPMYXj19Ym6yd8fZvpVFugzBSmy61EJcRb79JF-_n_IXh3TV3g5RPo1bjbpxqeXjOjh46120YCUUWpbL0fHehVrxaFo_7E8y4QdTlJifmpHs9A18b3p5z7hGqZcqleYtpBPdF0rmqmCyshwyA')"
          }}
        />
        <div className="absolute inset-0 bg-background/20 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background opacity-80" />

        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px flex-1 max-w-[40px] bg-gradient-to-r from-primary/60 to-transparent" />
            <span className="overline">A Thought</span>
          </div>
          <blockquote className="text-2xl font-serif italic leading-relaxed text-foreground/85">
            &ldquo;Love is not just looking at each other, it&apos;s looking in the same direction.&rdquo;
          </blockquote>
          <p className="mt-5 text-faint text-xs font-medium tracking-[0.15em] uppercase">
            Antoine de Saint-Exupéry
          </p>
        </div>
      </div>

      {/* Right Column — Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-24 relative">
        <div className="w-full max-w-[440px] flex flex-col gap-8 relative z-10">
          <div className="flex flex-col gap-6 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <span className="font-display text-display-xl text-primary leading-none">T</span>
              <span className="text-2xl font-display font-semibold tracking-tight text-foreground">Twofold</span>
            </div>

            <div className="flex flex-col gap-3">
              <h1 className="text-3xl sm:text-4xl font-display font-semibold leading-tight tracking-tight text-foreground">
                Welcome back to your <span className="text-primary">digital locket</span>
              </h1>
              <p className="text-muted text-base sm:text-lg font-serif italic">
                Securely access your shared memories.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-5 mt-2">
            {error && (
              <p className="text-sm text-destructive text-center lg:text-left font-medium">
                {error}
              </p>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="group flex w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-lg h-14 px-8 bg-secondary text-secondary-foreground text-base font-semibold leading-normal shadow-sm transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#FFC107"></path>
                    <path d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" fill="#FF3D00"></path>
                    <path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.652-3.342-11.303-8l-6.571,4.827C9.655,39.664,16.318,44,24,44z" fill="#4CAF50"></path>
                    <path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" fill="#1976D2"></path>
                  </svg>
                  <span>Sign In with Google</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
