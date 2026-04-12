import './globals.css'
import { Fraunces, DM_Sans, Newsreader } from 'next/font/google'
import { AuthProvider } from './contexts/AuthContext'
import { LocketProvider } from './contexts/LocketContext'

// New design system fonts
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  style: 'italic',
})


export const metadata = {
  title: 'Twofold',
  description: 'A shared digital locket for couples',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${dmSans.variable} ${newsreader.variable} font-body bg-background text-foreground antialiased`}>
        <AuthProvider>
          <LocketProvider>
            {children}
          </LocketProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
