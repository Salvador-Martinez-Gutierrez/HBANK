import { ThemeProvider } from '@/components/theme-provider'
import { MainNav } from '@/components/main-nav'
import { Sidebar } from '@/components/sidebar'
import WalletProvider from '../providers/wallet-provider'

export default function AppLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <WalletProvider>
            <ThemeProvider defaultTheme='dark' storageKey='hbank-ui-theme'>
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
    )
}
