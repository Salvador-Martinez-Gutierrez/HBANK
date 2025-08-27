import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { MainNav } from '@/components/main-nav'
import { Sidebar } from '@/components/sidebar'
import WalletProvider from './providers/wallet-provider'

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
        <html lang='en' suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <WalletProvider>
                    <ThemeProvider
                        defaultTheme='system'
                        storageKey='hbank-ui-theme'
                    >
                        <div className='relative min-h-screen bg-background'>
                            <Sidebar />
                            <div className='md:pl-64'>
                                <MainNav />
                                <main className='relative h-[calc(100vh-4.5rem)] md:h-[calc(100vh-5rem)]'>
                                    {children}
                                </main>
                            </div>
                        </div>
                    </ThemeProvider>
                </WalletProvider>
            </body>
        </html>
    )
}
