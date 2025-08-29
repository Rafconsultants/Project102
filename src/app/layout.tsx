import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Baby Heartbeat Generator - 3-Second Samples with Whisper Overlay',
  description: 'Create personalized 3-second baby heartbeat recordings with gentle whisper overlay. Upload ultrasound images for automatic BPM detection, generate samples, and share on social media.',
  keywords: 'baby heartbeat, ultrasound, BPM detection, whisper overlay, social sharing, pregnancy, parenting',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
