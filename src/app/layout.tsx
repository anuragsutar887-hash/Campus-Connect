import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/lib/theme-context'
import { Toaster } from 'sonner'

// ⚡ next/font: fonts are downloaded at build-time and self-hosted
// This eliminates the render-blocking CDN request entirely.
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Campus Connect — Your College Classroom, Connected',
  description: 'A professional academic workspace for students and professors to manage class communication, attendance, assignments, notes, meetings, and resources in one place.',
  keywords: 'campus, academic, classroom, assignments, attendance, notes, college',
  authors: [{ name: 'Campus Connect' }],
  openGraph: {
    title: 'Campus Connect',
    description: 'One class. One workspace. Everything connected.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              theme="system"
              position="top-right"
              toastOptions={{
                classNames: {
                  toast: 'font-sans',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
