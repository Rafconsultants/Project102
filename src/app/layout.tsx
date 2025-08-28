import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Baby Heartbeat Generator - Create Beautiful Baby Heartbeat Audio",
  description: "Transform your ultrasound recordings into personalized baby heartbeat audio files. Perfect for creating lasting memories and sharing with loved ones.",
  keywords: "baby heartbeat, ultrasound audio, pregnancy, baby memories, audio generator",
  authors: [{ name: "Baby Heartbeat Generator" }],
  openGraph: {
    title: "Baby Heartbeat Generator",
    description: "Create beautiful baby heartbeat audio from ultrasound recordings",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
