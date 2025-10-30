import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import '../lib/polyfills'
import { Analytics } from '@vercel/analytics/next'

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
})

export const metadata: Metadata = {
    title: 'HBank - The Onchain Neobank on Hedera',
    description:
        'Your complete onchain banking alternative on Hedera. Earn yield, track your portfolio, trade assets, and spend crypto—all self-custodial and fully transparent.',
    keywords: [
        'Hedera',
        'Neobank',
        'DeFi',
        'Yield',
        'Portfolio Tracker',
        'Crypto Swaps',
        'Credit Card',
        'Self-Custodial',
        'Hedera Hashgraph',
        'HBAR',
        'Onchain Banking',
    ],
    icons: {
        icon: '/HB.png',
        shortcut: '/HB.png',
        apple: '/HB.png',
    },
    openGraph: {
        title: 'HBank - The Onchain Neobank on Hedera',
        description:
            'Earn, trade, spend and manage your onchain assets on Hedera. Fully self-custodial with total transparency.',
        url: 'https://hbank.cash',
        siteName: 'HBank',
        images: [
            {
                url: '/HB-200.png',
                width: 200,
                height: 200,
                alt: 'HBank Logo',
            },
        ],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'HBank - The Onchain Neobank on Hedera',
        description:
            'Earn, trade, spend and manage your onchain assets on Hedera. Fully self-custodial with total transparency.',
        images: ['/HB-200.png'],
    },
    alternates: {
        canonical: 'https://hbank.cash',
    },
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
                <Analytics />
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
