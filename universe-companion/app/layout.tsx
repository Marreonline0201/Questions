import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Universe Science Companion',
  description: 'Ask questions about the real science behind Universe Simulation. Get honest answers grounded in actual physics, chemistry, and biology.',
  openGraph: {
    title: 'Universe Science Companion',
    description: 'Real-world science explanations for Universe Simulation players.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
        {children}
      </body>
    </html>
  )
}
