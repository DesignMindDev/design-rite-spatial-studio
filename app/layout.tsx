import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Spatial Studio - AI-Powered Floor Plan Intelligence',
  description: 'Transform floor plans into 3D models with AI-powered camera placement recommendations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
