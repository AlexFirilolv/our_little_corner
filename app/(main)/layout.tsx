'use client'

import { Navigation } from '@/components/Navigation'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <Navigation />

      <main className="flex-1 pb-20 md:pb-0 md:pl-64 min-h-screen relative">
        {/* Background texture or gradient if needed */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 to-white/50 pointer-events-none -z-10" />
        {children}
      </main>
    </div>
  )
}
