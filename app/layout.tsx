import './globals.css'
import { Playfair_Display, Lato, Plus_Jakarta_Sans, Newsreader, Noto_Sans } from 'next/font/google'
import { AuthProvider } from './contexts/AuthContext'
import { LocketProvider } from './contexts/LocketContext'

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
})

const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-body',
  display: 'swap',
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  style: 'italic',
})

const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-noto',
  display: 'swap',
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
      <body className={`${lato.variable} ${playfairDisplay.variable} ${plusJakartaSans.variable} ${newsreader.variable} ${notoSans.variable} font-body bg-background text-foreground antialiased`}>
        <AuthProvider>
          <LocketProvider>
            {children}
          </LocketProvider>
        </AuthProvider>
      </body>
    </html>
  )
}