import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { Menu, X, Mic } from 'lucide-react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Backup Boss - Voice-First Business Continuity Platform',
  description: 'Turn daily 2-minute voice memos into emergency operation manuals. Stress-test if your trade business can survive without you. Built for skilled trade businesses with 2-20 employees.',
  keywords: ['business continuity', 'voice memo', 'trade business', 'emergency procedures', 'bus factor', 'HVAC', 'construction', 'metal fabrication'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#2C3E50] shadow-sm">
                <Mic className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold tracking-tight text-[#2C3E50]">
                Backup Boss
              </span>
            </Link>

            <div className="hidden md:flex md:items-center md:gap-8">
              <Link 
                href="/" 
                className="text-sm font-medium text-slate-600 transition-colors hover:text-[#2C3E50]"
              >
                Home
              </Link>
              <Link 
                href="/pricing" 
                className="text-sm font-medium text-slate-600 transition-colors hover:text-[#2C3E50]"
              >
                Pricing
              </Link>
              <Link 
                href="/dashboard" 
                className="text-sm font-medium text-slate-600 transition-colors hover:text-[#2C3E50]"
              >
                Dashboard
              </Link>
            </div>

            <div className="hidden md:flex md:items-center md:gap-4">
              <Link 
                href="/login" 
                className="text-sm font-medium text-slate-600 transition-colors hover:text-[#2C3E50]"
              >
                Login
              </Link>
              <Link 
                href="/signup" 
                className="rounded bg-[#2C3E50] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#2C3E50] focus:ring-offset-2"
              >
                Get Started
              </Link>
            </div>

            <div className="flex md:hidden">
              <label 
                htmlFor="menu-toggle" 
                className="cursor-pointer rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#2C3E50]"
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </label>
            </div>
          </div>

          <input type="checkbox" id="menu-toggle" className="peer hidden" />
          
          <div className="hidden peer-checked:block md:hidden">
            <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 shadow-lg">
              <div className="flex justify-end pb-2">
                <label 
                  htmlFor="menu-toggle" 
                  className="cursor-pointer rounded-md p-2 text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close menu</span>
                </label>
              </div>
              <div className="flex flex-col space-y-1">
                <Link 
                  href="/" 
                  className="rounded-md px-3 py-2 text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-[#2C3E50]"
                >
                  Home
                </Link>
                <Link 
                  href="/pricing" 
                  className="rounded-md px-3 py-2 text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-[#2C3E50]"
                >
                  Pricing
                </Link>
                <Link 
                  href="/dashboard" 
                  className="rounded-md px-3 py-2 text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-[#2C3E50]"
                >
                  Dashboard
                </Link>
                <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
                  <Link 
                    href="/login" 
                    className="rounded-md px-3 py-2 text-center text-base font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Login
                  </Link>
                  <Link 
                    href="/signup" 
                    className="rounded-md bg-[#2C3E50] px-3 py-2 text-center text-base font-semibold text-white hover:bg-slate-700"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="min-h-screen bg-slate-50">{children}</main>
      </body>
    </html>
  )
}