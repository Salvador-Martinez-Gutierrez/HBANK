import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import '../lib/polyfills'

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
})

export const metadata: Metadata = {
    title: 'Valora Protocol',
    description:
        'Valora Protocol streamlines the emission of Liquid Yield Tokens.',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang='en' className='dark' suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                {children}
                <Toaster
                    position='top-right'
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#1f2937',
                            color: '#f9fafb',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            fontSize: '14px',
                            padding: '12px 16px',
                        },
                        success: {
                            iconTheme: {
                                primary: '#10b981',
                                secondary: '#1f2937',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#1f2937',
                            },
                        },
                    }}
                />
            </body>
        </html>
    )
}
