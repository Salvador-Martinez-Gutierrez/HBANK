'use client'

import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'
import {
    ArrowRight,
    Lock,
    BarChart3,
    Globe,
    Sparkles,
    ChevronDown,
    Mail,
    Twitter,
    Github,
    MessageCircle,
} from 'lucide-react'
import Head from 'next/head'

export default function Home() {
    return (
        <>
            <Head>
                <title>
                    Hbank Protocol - Tokenized Yield Solutions
                </title>
                <meta
                    name='description'
                    content="Maximize your crypto yields with Hbank Protocol's secure DeFi vault on Hedera Hashgraph. Get your APY with automated yield farming strategies and total transparency."
                />
                <meta
                    name='keywords'
                    content='Hedera, DeFi, Yield, Vault, Yield Farming, Hedera Hashgraph, Crypto Staking, HBAR, DeFi Protocol'
                />
                <meta
                    property='og:title'
                    content="Hbank Protocol - Tokenized Yield Solutions"
                />
                <meta
                    property='og:description'
                    content='Earn superior yields on Hedera with automated DeFi strategies. Transparent, secure, and optimized for maximum returns.'
                />
                <meta property='og:type' content='website' />
                <meta name='twitter:card' content='summary_large_image' />
                <link rel='canonical' href='https://hbank.pro' />
            </Head>

            <div className='min-h-screen'>
                {/* Hero Section */}
                <section className='relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 px-4 py-20 sm:px-6 lg:px-8'>
                    <div className='absolute inset-0 bg-grid-white/10 bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]' />
                    <div className='relative mx-auto max-w-7xl'>
                        <div className='text-center'>
                            <div className='mb-6 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary'>
                                <Sparkles className='mr-2 h-4 w-4' />
                                Powered by Hedera Hashgraph
                            </div>
                            <h1 className='mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl'>
                                <span className='bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent'>
                                    Tokenized Yield Solutions
                                </span>
                                <br />
                                Maximum Returns, Total Transparency
                            </h1>
                            <p className='mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl'>
                                Hbank is the premier on-chain asset management platform specializing in the issuance of liquid yield tokens on Hedera Hashgraph.
                            </p>
                            <div className='flex flex-col items-center justify-center gap-4 sm:flex-row'>
                                <Button
                                    size='lg'
                                    className='min-w-[200px] text-base bg-white text-black hover:bg-gray-100 border-2 border-white'
                                    onClick={() => {
                                        document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })
                                    }}
                                >
                                    Learn More
                                </Button>
                                <Link href='/vault'>
                                    <Button
                                        size='lg'
                                        className='group min-w-[200px] text-base cursor-pointer hover:cursor-pointer'
                                    >
                                        Start Earning
                                        <ArrowRight className='ml-2 h-5 w-5 transition-transform group-hover:translate-x-1' />
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Enhanced Stats with Schema */}
                        <div className='grid grid-cols-2 gap-8 md:grid-cols-4 mt-20'>
                            <div className='flex items-center justify-center rounded-lg border bg-card/50 p-6 transition-all hover:border-primary/50 hover:shadow-lg'>
                                <div className='text-center'>
                                    <div className='mb-2 text-2xl font-bold text-primary'>
                                        +$10M
                                    </div>
                                    <p className='text-muted-foreground'>
                                        TVL
                                    </p>
                                </div>
                            </div>
                            <div className='flex items-center justify-center rounded-lg border bg-card/50 p-6 transition-all hover:border-primary/50 hover:shadow-lg'>
                                <div className='text-center'>
                                    <div className='mb-2 text-2xl font-bold text-primary'>
                                        13.33%
                                    </div>
                                    <p className='text-muted-foreground'>
                                        APY
                                    </p>
                                </div>
                            </div>
                            <div className='flex items-center justify-center rounded-lg border bg-card/50 p-6 transition-all hover:border-primary/50 hover:shadow-lg'>
                                <div className='text-center'>
                                    <div className='mb-2 text-2xl font-bold text-primary'>
                                        +1,000
                                    </div>
                                    <p className='text-muted-foreground'>
                                        Unique Users
                                    </p>
                                </div>
                            </div>
                            <div className='flex items-center justify-center rounded-lg border bg-card/50 p-6 transition-all hover:border-primary/50 hover:shadow-lg'>
                                <div className='text-center'>
                                    <div className='mb-2 text-2xl font-bold text-primary'>
                                        100%
                                    </div>
                                    <p className='text-muted-foreground'>
                                        On-Chain
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Transparency Section */}
                <section className='bg-gradient-to-b from-secondary/5 to-background px-4 py-20 sm:px-6 lg:px-8'>
                    <div className='mx-auto max-w-7xl'>
                        <div className='grid items-center gap-12 lg:grid-cols-2'>
                            <div>
                                <h2 className='mb-6 text-3xl font-bold sm:text-4xl'>
                                    Institutional Grade
                                    <br />
                                    <span className='bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent'>
                                        Onchain Asset Management
                                    </span>
                                </h2>
                                <p className='mb-8 text-lg text-muted-foreground'>
                                    Launch and invest in liquid, transparent and composable yield bearing tokens backed by
                                    diversified DeFi strategies deployed on blue-chip DeFi protocols.
                                </p>
                            </div>
                            <div className='relative'>
                                <div className='absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-3xl ml-10' />
                                <div className='space-y-4'>
                                    <div className='flex items-start'>
                                        <Lock className='mr-3 mt-1 h-5 w-5 text-primary' />
                                        <div>
                                            <h3 className='font-semibold'>
                                                Immutable & Secure
                                            </h3>
                                            <p className='text-sm text-muted-foreground'>
                                                Permanent and unalterable record
                                                of all transactions
                                            </p>
                                        </div>
                                    </div>
                                    <div className='flex items-start'>
                                        <Globe className='mr-3 mt-1 h-5 w-5 text-primary' />
                                        <div>
                                            <h3 className='font-semibold'>
                                                Compossable and liquid
                                            </h3>
                                            <p className='text-sm text-muted-foreground'>
                                                Use our yield bearing tokens as collateral for other DeFi protocols
                                            </p>
                                        </div>
                                    </div>
                                    <div className='flex items-start'>
                                        <BarChart3 className='mr-3 mt-1 h-5 w-5 text-primary' />
                                        <div>
                                            <h3 className='font-semibold'>
                                                Real-Time Analytics
                                            </h3>
                                            <p className='text-sm text-muted-foreground'>
                                                Dashboards with auditable and up-to-date
                                                metrics
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Products Section */}
                <section id='products-section' className='px-4 py-20 sm:px-6 lg:px-8'>
                    <div className='mx-auto max-w-7xl'>
                        <div className='text-center'>
                            <h2 className='mb-4 text-3xl font-bold sm:text-4xl'>
                                Our Products
                            </h2>
                            <p className='mx-auto mb-12 max-w-2xl text-lg text-muted-foreground'>
                                Complete solutions for investors and asset managers
                            </p>
                        </div>

                        <div className='grid gap-8 md:grid-cols-2'>
                            <Card className='relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent'>
                                <div className='absolute right-0 top-0 h-32 w-32 bg-primary/10 blur-3xl' />
                                <CardHeader>
                                    <div className='mb-4 flex items-center gap-4'>
                                        <div className='inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                                            <Lock className='h-7 w-7' />
                                        </div>
                                        <span className='text-2xl font-semibold'>
                                            hUSD Vault
                                        </span>
                                    </div>
                                    <CardTitle className='text-2xl'>
                                        For Qualified Investors
                                    </CardTitle>
                                    <CardDescription className='text-base'>
                                        Deposit your assets and generate yields
                                        automatically with optimized delta neutral strategies
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className='mb-6 space-y-3'>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-sm text-muted-foreground'>
                                                Current APY
                                            </span>
                                            <span className='text-sm font-semibold text-green-600'>
                                                13.33%
                                            </span>
                                        </div>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-sm text-muted-foreground'>
                                                TVL
                                            </span>
                                            <span className='text-sm font-medium'>
                                                $10M+
                                            </span>
                                        </div>
                                    </div>
                                    <Link href='/vault'>
                                        <Button className='w-full' size='lg'>
                                            Explore Vault
                                            <ArrowRight className='ml-2 h-4 w-4' />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>

                            <Card className='relative overflow-hidden border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent'>
                                <div className='absolute right-0 top-0 h-32 w-32 bg-secondary/10 blur-3xl' />
                                <CardHeader>
                                    <div className='mb-4 flex items-center gap-4'>
                                        <div className='inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                                            <Lock className='h-7 w-7' />
                                        </div>
                                        <span className='text-2xl font-semibold'>
                                            Hbank SDK <span className='text-sm text-muted-foreground'>(Coming Soon)</span>
                                        </span>
                                    </div>
                                    <CardTitle className='text-2xl'>
                                        For Asset Managers
                                    </CardTitle>
                                    <CardDescription className='text-base'>
                                        Launch and manage your own yield bearing tokens optimizing operational processes
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className='mb-6 space-y-3'>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-sm text-muted-foreground'>
                                                Accelerate
                                            </span>
                                            <span className='text-sm font-semibold'>
                                                Time to Market
                                            </span>
                                        </div>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-sm text-muted-foreground'>
                                                Security
                                            </span>
                                            <span className='text-sm font-medium'>
                                                Audited Platform
                                            </span>
                                        </div>
                                    </div>
                                    <Link 
                                        href='https://hbank.gitbook.io/hbank-docs/'
                                        target='_blank'
                                        rel='noopener noreferrer'
                                    >
                                        <Button
                                            className='w-full'
                                            size='lg'
                                            variant='secondary'
                                        >
                                            Explore Docs
                                            <ArrowRight className='ml-2 h-4 w-4' />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className='bg-gradient-to-b from-background to-primary/5 px-4 py-20 sm:px-6 lg:px-8'>
                    <div className='mx-auto max-w-4xl'>
                        <div className='text-center'>
                            <h2 className='mb-4 text-3xl font-bold sm:text-4xl'>
                                Frequently Asked Questions
                            </h2>
                            <p className='mx-auto mb-12 max-w-2xl text-lg text-muted-foreground'>
                                Everything you need to know about the Hbank
                                Protocol
                            </p>
                        </div>

                        <div className='space-y-4'>
                            <details className='group rounded-lg border bg-card p-6'>
                                <summary className='flex cursor-pointer items-center justify-between font-semibold'>
                                    What is Hbank Protocol?
                                    <ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
                                </summary>
                                <p className='mt-4 text-muted-foreground'>
                                    Hbank Protocol is the premier onchain asset management platform specialized in liquid yield tokens. Built on Hedera Hashgraph, we provide institutional-grade DeFi solutions that launch and manage yield-bearing tokens backed by diversified strategies deployed on blue-chip DeFi protocols. Our platform offers total transparency, composability, and real-time analytics for both qualified investors and asset managers.
                                </p>
                            </details>

                            <details className='group rounded-lg border bg-card p-6'>
                                <summary className='flex cursor-pointer items-center justify-between font-semibold'>
                                    How does the hUSD Vault work?
                                    <ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
                                </summary>
                                <p className='mt-4 text-muted-foreground'>
                                    The hUSD Vault is our flagship product for qualified investors, currently offering 13.33% APY with over $10M in TVL. When you deposit assets, our delta-neutral strategies are applied to generate maximum yield through diversification across multiple blue-chip DeFi protocols. All operations are transparent and verifiable on-chain. For more details check our docs.
                                </p>
                            </details>

                            <details className='group rounded-lg border bg-card p-6'>
                                <summary className='flex cursor-pointer items-center justify-between font-semibold'>
                                    Is it safe to invest in Hbank?
                                    <ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
                                </summary>
                                <p className='mt-4 text-muted-foreground'>
                                    Absolutely. Security is our top priority with enterprise-grade protection through Hedera&apos;s aBFT consensus mechanism. Our protocol is fully audited by recognized security firms, we implement multi-signature controls and MCP wallets for critical operations, and we maintain 100% on-chain transparency.
                                </p>
                            </details>

                            <details className='group rounded-lg border bg-card p-6'>
                                <summary className='flex cursor-pointer items-center justify-between font-semibold'>
                                    What are the fees?
                                    <ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
                                </summary>
                                <p className='mt-4 text-muted-foreground'>
                                    During our testnet alpha phase, the protocol operates with zero fees—you only pay standard network transaction costs. As we transition to mainnet, we&apos;ll introduce transparent fee structures that may include management fees, performance fees, or both. All future fees will be clearly communicated and designed to align our success with yours.
                                </p>
                            </details>

                            <details className='group rounded-lg border bg-card p-6'>
                                <summary className='flex cursor-pointer items-center justify-between font-semibold'>
                                    How do withdrawals work?
                                    <ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
                                </summary>
                                <p className='mt-4 text-muted-foreground'>
                                    We offer flexible withdrawal options to suit your needs. Standard withdrawals process within 48 hours at no additional cost. For immediate access to your funds, instant withdrawals are available with a 0.5% fee on the withdrawn amount and depends on available liquidity. All withdrawal transactions are processed on-chain and fully transparent.
                                </p>
                            </details>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className='border-t bg-card/50'>
                    <div className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
                        <div className='grid gap-8 md:grid-cols-4 w-full'>
                            {/* Brand */}
                            <div className='space-y-4'>
                                <h3 className='text-lg font-bold'>
                                    Hbank Protocol
                                </h3>
                                <p className='text-sm text-muted-foreground'>
                                    The onchain asset management platform on Hedera Hashgraph.
                                </p>
                                <div className='flex gap-4'>
                                    <Link
                                        href='#'
                                        className='text-muted-foreground transition-colors hover:text-primary'
                                    >
                                        <Twitter className='h-5 w-5' />
                                    </Link>
                                    <Link
                                        href='#'
                                        className='text-muted-foreground transition-colors hover:text-primary'
                                    >
                                        <Github className='h-5 w-5' />
                                    </Link>
                                    <Link
                                        href='#'
                                        className='text-muted-foreground transition-colors hover:text-primary'
                                    >
                                        <MessageCircle className='h-5 w-5' />
                                    </Link>
                                    <Link
                                        href='#'
                                        className='text-muted-foreground transition-colors hover:text-primary'
                                    >
                                        <Mail className='h-5 w-5' />
                                    </Link>
                                </div>
                            </div>

                            {/* Products */}
                            <div className='space-y-4 text-right'>
                                <h4 className='font-semibold'>Products</h4>
                                <ul className='space-y-2 text-sm'>
                                    <li>
                                        <Link
                                            href='/vault'
                                            className='text-muted-foreground transition-colors hover:text-primary'
                                        >
                                            Vault
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href='/transparency'
                                            className='text-muted-foreground transition-colors hover:text-primary'
                                        >
                                            Transparency
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href='/portfolio'
                                            className='text-muted-foreground transition-colors hover:text-primary'
                                        >
                                            Portfolio
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Resources */}
                            <div className='space-y-4 text-right'>
                                <h4 className='font-semibold'>Resources</h4>
                                <ul className='space-y-2 text-sm'>
                                    <li>
                                        <Link
                                            href='https://hbank.gitbook.io/hbank-docs/'
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            className='text-muted-foreground transition-colors hover:text-primary'
                                        >
                                            Documentation
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href='https://hbank.gitbook.io/hbank-docs/technical-docs/sdk'
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            className='text-muted-foreground transition-colors hover:text-primary'
                                        >
                                            SDK
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href='https://hbank.gitbook.io/hbank-docs/resources/audits'
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            className='text-muted-foreground transition-colors hover:text-primary'
                                        >
                                            Audits
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Legal */}
                            <div className='space-y-4 text-right'>
                                <h4 className='font-semibold'>Legal</h4>
                                <ul className='space-y-2 text-sm'>
                                    <li>
                                        <Link
                                            href='https://hbank.gitbook.io/hbank-docs/resources/legal'
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            className='text-muted-foreground transition-colors hover:text-primary'
                                        >
                                            Terms of Service
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className='mt-8 border-t pt-8'>
                            <div className='flex flex-col items-center justify-between gap-4 sm:flex-row'>
                                <p className='text-sm text-muted-foreground'>
                                    © 2025 Hbank Protocol. All rights reserved.
                                </p>
                                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                                    <span>Powered by</span>
                                    <span className='font-semibold text-primary'>
                                        Hedera Hashgraph
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    )
}
