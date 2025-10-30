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
import Image from 'next/image'
import {
    ArrowRight,
    Lock,
    BarChart3,
    Globe,
    Sparkles,
    ChevronDown,
    Wallet,
    ArrowRightLeft,
    CreditCard,
    CircleCheck,
} from 'lucide-react'
import Head from 'next/head'
import { useTVL } from '@/hooks/useTVL'

export default function Home() {
    const { formattedTVL, loading: tvlLoading } = useTVL()
    return (
        <>
            <Head>
                <title>HBank - The Onchain Neobank on Hedera</title>
                <meta
                    name='description'
                    content="Your complete onchain banking alternative on Hedera. Earn yield, track your portfolio, trade assets, and spend crypto—all self-custodial and fully transparent."
                />
                <meta
                    name='keywords'
                    content='Hedera, Neobank, DeFi, Yield, Portfolio Tracker, Crypto Swaps, Credit Card, Self-Custodial, Hedera Hashgraph, HBAR, Onchain Banking'
                />
                <meta
                    property='og:title'
                    content='HBank - The Onchain Neobank on Hedera'
                />
                <meta
                    property='og:description'
                    content='Earn, trade, spend and manage your onchain assets on Hedera. Fully self-custodial with total transparency.'
                />
                <meta property='og:type' content='website' />
                <meta name='twitter:card' content='summary_large_image' />
                <link rel='canonical' href='https://hbank.pro' />
            </Head>

            <div className='min-h-screen'>
                {/* Hero Section */}
                <section className='relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 px-4 py-10 sm:px-6 lg:px-8'>
                    <div className='absolute inset-0 bg-grid-white/10 bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]' />
                    <div className='relative mx-auto max-w-7xl'>
                        {/* Logo and Launch App Button */}
                        <div className='mb-16 flex items-center justify-between'>
                            <Image
                                src='/hb_logo-no-bg.png'
                                alt='HBank Logo'
                                width={240}
                                height={240}
                                priority
                            />
                            <Link href='/earn'>
                                <Button
                                    size='lg'
                                    className='min-w-[140px] text-base font-semibold'
                                >
                                    Launch App
                                    <ArrowRight className='ml-2 h-4 w-4' />
                                </Button>
                            </Link>
                        </div>
                        <div className='text-center'>
                            <h1 className='mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl'>
                                <span className='bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent'>
                                    The Onchain Neobank
                                </span>
                                <br />
                                To Grow Your Wealth
                            </h1>
                            <p className='mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl'>
                                The onchain banking alternative on Hedera Hashgraph. Earn, spend and manage your assets all in one place.
                            </p>
                            <div className='flex flex-col items-center justify-center gap-4 sm:flex-row'>
                                <Button
                                    size='lg'
                                    className='min-w-[200px] text-base bg-white text-black hover:bg-gray-100 border-2 border-white'
                                    onClick={() => {
                                        document
                                            .getElementById('products-section')
                                            ?.scrollIntoView({
                                                behavior: 'smooth',
                                            })
                                    }}
                                >
                                    Learn More
                                </Button>
                                <Link href='/earn'>
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
                                        {tvlLoading
                                            ? 'Loading...'
                                            : formattedTVL}
                                    </div>
                                    <p className='text-muted-foreground'>TVL</p>
                                </div>
                            </div>
                            <div className='flex items-center justify-center rounded-lg border bg-card/50 p-6 transition-all hover:border-primary/50 hover:shadow-lg'>
                                <div className='text-center'>
                                    <div className='mb-2 text-2xl font-bold text-primary'>
                                        13.33%
                                    </div>
                                    <p className='text-muted-foreground'>APY</p>
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

                {/* Value Proposition Section */}
                <section className='bg-gradient-to-b from-secondary/5 to-background px-4 py-20 sm:px-6 lg:px-8'>
                    <div className='mx-auto max-w-7xl'>
                        <div className='grid items-center gap-12 lg:grid-cols-2'>
                            <div>
                                <h2 className='mb-6 text-3xl font-bold sm:text-4xl'>
                                    Your Complete
                                    <br />
                                    <span className='bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent'>
                                        Onchain Banking Alternative
                                    </span>
                                </h2>
                                <p className='mb-8 text-lg text-muted-foreground'>
                                    Everything you need to manage your digital assets in one place. 
                                    Earn yield, track your portfolio, trade, and spend — all while maintaining 
                                    full self-custody and complete transparency.
                                </p>
                            </div>
                            <div className='relative'>
                                <div className='absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-3xl ml-10' />
                                <div className='space-y-4'>
                                    <div className='flex items-start'>
                                        <Lock className='mr-3 mt-1 h-5 w-5 text-primary' />
                                        <div>
                                            <h3 className='font-semibold'>
                                                Self-Custodial & Secure
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
                                                Composable & Liquid
                                            </h3>
                                            <p className='text-sm text-muted-foreground'>
                                                Seamlessly integrate with DeFi protocols
                                            </p>
                                        </div>
                                    </div>
                                    <div className='flex items-start'>
                                        <BarChart3 className='mr-3 mt-1 h-5 w-5 text-primary' />
                                        <div>
                                            <h3 className='font-semibold'>
                                                Real-Time Transparency
                                            </h3>
                                            <p className='text-sm text-muted-foreground'>
                                                Dashboards with auditable and
                                                up-to-date metrics
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Products Section */}
                <section
                    id='products-section'
                    className='px-4 py-20 sm:px-6 lg:px-8'
                >
                    <div className='mx-auto max-w-7xl'>
                        <div className='text-center'>
                            <h2 className='mb-4 text-3xl font-bold sm:text-4xl'>
                                Our Products
                            </h2>
                            <p className='mx-auto mb-12 max-w-2xl text-lg text-muted-foreground'>
                                Complete financial solutions for your onchain journey
                            </p>
                        </div>

                        <div className='grid gap-6 md:grid-cols-2 lg:gap-8'>
                            {/* Liquid Yield Tokens */}
                            <Card className='relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent'>
                                <div className='absolute right-0 top-0 h-32 w-32 bg-primary/10 blur-3xl' />
                                <CardHeader>
                                    <div className='mb-4 flex items-center justify-between'>
                                        <div className='flex items-center gap-3'>
                                            <div className='inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                                                <Sparkles className='h-6 w-6' />
                                            </div>
                                            <span className='text-xl font-semibold'>
                                                Liquid Yield
                                            </span>
                                        </div>
                                        <span className='rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600'>
                                            Live - Testnet
                                        </span>
                                    </div>
                                    <CardTitle className='text-xl'>
                                        Earn passive yield on your assets
                                    </CardTitle>
                                    <CardDescription className='text-base'>
                                        Generate yields automatically with optimized 
                                        DeFi Strategies
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
                                                {tvlLoading
                                                    ? 'Loading...'
                                                    : formattedTVL}
                                            </span>
                                        </div>
                                    </div>
                                    <Link href='/earn'>
                                        <Button className='w-full' size='lg'>
                                            Start Earning
                                            <ArrowRight className='ml-2 h-4 w-4' />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>

                            {/* Portfolio Tracker */}
                            <Card className='relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent'>
                                <div className='absolute right-0 top-0 h-32 w-32 bg-secondary/10 blur-3xl' />
                                <CardHeader>
                                    <div className='mb-4 flex items-center justify-between'>
                                        <div className='flex items-center gap-3'>
                                            <div className='inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                                                <Wallet className='h-6 w-6' />
                                            </div>
                                            <span className='text-xl font-semibold'>
                                                Portfolio
                                            </span>
                                        </div>
                                        <span className='rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600'>
                                            Live - Testnet
                                        </span>
                                    </div>
                                    <CardTitle className='text-xl'>
                                        Manage all your holdings in one place
                                    </CardTitle>
                                    <CardDescription className='text-base'>
                                        Track multiple wallets and DeFi positions 
                                        from a unified dashboard
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className='mb-6 space-y-3'>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-sm text-muted-foreground'>
                                                Multi-Wallet Support
                                            </span>
                                            <CircleCheck className='h-5 w-5 text-green-500' />
                                        </div>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-sm text-muted-foreground'>
                                                Real-Time Updates
                                            </span>
                                            <CircleCheck className='h-5 w-5 text-green-500' />
                                        </div>
                                    </div>
                                    <Link href='/portfolio'>
                                        <Button className='w-full' size='lg'>
                                            View Portfolio
                                            <ArrowRight className='ml-2 h-4 w-4' />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>

                            {/* Crypto Swaps */}
                            <Card className='relative overflow-hidden border-primary/20 bg-gradient-to-br from-secondary/5 to-transparent'>
                                <div className='absolute right-0 top-0 h-32 w-32 bg-secondary/10 blur-3xl' />
                                <CardHeader>
                                    <div className='mb-4 flex items-center justify-between'>
                                        <div className='flex items-center gap-3'>
                                            <div className='inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                                                <ArrowRightLeft className='h-6 w-6' />
                                            </div>
                                            <span className='text-xl font-semibold'>
                                                Swaps
                                            </span>
                                        </div>
                                        <span className='rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-600'>
                                            Coming Soon
                                        </span>
                                    </div>
                                    <CardTitle className='text-xl'>
                                        Trade assets with the best prices
                                    </CardTitle>
                                    <CardDescription className='text-base'>
                                        Access optimal liquidity through ETAswap 
                                        aggregator integration
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className='mb-6 space-y-3'>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-sm text-muted-foreground'>
                                                Best Rates Guaranteed
                                            </span>
                                            <CircleCheck className='h-5 w-5 text-green-500' />
                                        </div>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-sm text-muted-foreground'>
                                                Multiple DEXs Supported
                                            </span>
                                            <CircleCheck className='h-5 w-5 text-green-500' />
                                        </div>
                                    </div>
                                    <Button 
                                        className='w-full' 
                                        size='lg'
                                        variant='secondary'
                                        disabled
                                    >
                                        Coming Soon
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Credit Card */}
                            <Card className='relative overflow-hidden border-primary/20 bg-gradient-to-br from-secondary/5 to-transparent'>
                                <div className='absolute right-0 top-0 h-32 w-32 bg-secondary/10 blur-3xl' />
                                <CardHeader>
                                    <div className='mb-4 flex items-center justify-between'>
                                        <div className='flex items-center gap-3'>
                                            <div className='inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                                                <CreditCard className='h-6 w-6' />
                                            </div>
                                            <span className='text-xl font-semibold'>
                                                Credit Card
                                            </span>
                                        </div>
                                        <span className='rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-600'>
                                            Coming Soon
                                        </span>
                                    </div>
                                    <CardTitle className='text-xl'>
                                        Spend your crypto anywhere
                                    </CardTitle>
                                    <CardDescription className='text-base'>
                                        Self-custodial card for seamless everyday 
                                        spending of your onchain assets
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className='mb-6 space-y-3'>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-sm text-muted-foreground'>
                                                Global
                                            </span>
                                            <CircleCheck className='h-5 w-5 text-green-500' />
                                        </div>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-sm text-muted-foreground'>
                                                Full Self-Custody
                                            </span>
                                            <CircleCheck className='h-5 w-5 text-green-500' />
                                        </div>
                                    </div>
                                    <Button 
                                        className='w-full' 
                                        size='lg'
                                        variant='secondary'
                                        disabled
                                    >
                                        Coming Soon
                                    </Button>
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
                                Everything you need to know about HBank
                            </p>
                        </div>

                        <div className='space-y-4'>
                            <details className='group rounded-lg border bg-card p-6'>
                                <summary className='flex cursor-pointer items-center justify-between font-semibold'>
                                    What is HBank?
                                    <ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
                                </summary>
                                <p className='mt-4 text-muted-foreground'>
                                    HBank is the fully onchain, self-custodial neobank 
                                    built on Hedera Hashgraph. We provide a complete suite 
                                    of financial services including liquid yield tokens for 
                                    earning passive income, a multi-wallet portfolio tracker, 
                                    crypto swaps through aggregated liquidity, and a credit 
                                    card for seamless spending. Unlike traditional neobanks, 
                                    you maintain full custody of your assets with complete 
                                    transparency and verifiability on-chain.
                                </p>
                            </details>

                            <details className='group rounded-lg border bg-card p-6'>
                                <summary className='flex cursor-pointer items-center justify-between font-semibold'>
                                    How does the hUSD Vault work?
                                    <ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
                                </summary>
                                <p className='mt-4 text-muted-foreground'>
                                    The hUSD Vault is our flagship product for
                                    qualified investors, currently offering
                                    13.33% APY with{' '}
                                    {tvlLoading
                                        ? 'substantial'
                                        : `over ${formattedTVL}`}{' '}
                                    in TVL. When you deposit assets, our
                                    delta-neutral strategies are applied to
                                    generate maximum yield through
                                    diversification across multiple blue-chip
                                    DeFi protocols. All operations are
                                    transparent and verifiable on-chain. For
                                    more details check our docs.
                                </p>
                            </details>

                            <details className='group rounded-lg border bg-card p-6'>
                                <summary className='flex cursor-pointer items-center justify-between font-semibold'>
                                    Is it safe to invest in Hbank?
                                    <ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
                                </summary>
                                <p className='mt-4 text-muted-foreground'>
                                    Absolutely. Security is our top priority
                                    with enterprise-grade protection through
                                    Hedera&apos;s aBFT consensus mechanism. Our
                                    protocol is fully audited by recognized
                                    security firms, we implement multi-signature
                                    controls and MCP wallets for critical
                                    operations, and we maintain 100% on-chain
                                    transparency.
                                </p>
                            </details>

                            <details className='group rounded-lg border bg-card p-6'>
                                <summary className='flex cursor-pointer items-center justify-between font-semibold'>
                                    What are the fees?
                                    <ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
                                </summary>
                                <p className='mt-4 text-muted-foreground'>
                                    During our testnet alpha phase, the protocol
                                    operates with zero fees—you only pay
                                    standard network transaction costs. As we
                                    transition to mainnet, we&apos;ll introduce
                                    transparent fee structures that may include
                                    management fees, performance fees, or both.
                                    All future fees will be clearly communicated
                                    and designed to align our success with
                                    yours.
                                </p>
                            </details>

                            <details className='group rounded-lg border bg-card p-6'>
                                <summary className='flex cursor-pointer items-center justify-between font-semibold'>
                                    How do withdrawals work?
                                    <ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
                                </summary>
                                <p className='mt-4 text-muted-foreground'>
                                    We offer flexible withdrawal options to suit
                                    your needs. Standard withdrawals process
                                    within 48 hours at no additional cost. For
                                    immediate access to your funds, instant
                                    withdrawals are available with a 0.5% fee on
                                    the withdrawn amount and depends on
                                    available liquidity. All withdrawal
                                    transactions are processed on-chain and
                                    fully transparent.
                                </p>
                            </details>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className='border-t bg-card/50'>
                    <div className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
                        <div className='grid gap-8 grid-cols-2 md:grid-cols-4 w-full'>
                            {/* Brand */}
                            <div className='space-y-4 col-span-2 md:col-span-1 ml-4 md:ml-0'>
                                <h3 className='text-lg font-bold'>
                                    HBank
                                </h3>
                                <p className='text-sm text-muted-foreground'>
                                    Your complete onchain banking alternative 
                                    on Hedera Hashgraph.
                                </p>
                                <div className='flex gap-4'>
                                    <Link
                                        href='#'
                                        className='text-muted-foreground transition-colors hover:text-primary'
                                    >
                                        <svg
                                            viewBox='0 0 24 24'
                                            aria-hidden='true'
                                            className='h-5 w-5'
                                        >
                                            <g>
                                                <path
                                                    fill='currentColor'
                                                    d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'
                                                />
                                            </g>
                                        </svg>
                                    </Link>
                                </div>
                            </div>

                            {/* Products */}
                            <div className='space-y-4 text-left md:text-right ml-4 md:ml-0'>
                                <h4 className='font-semibold'>Products</h4>
                                <ul className='space-y-2 text-sm'>
                                    <li>
                                        <Link
                                            href='/earn'
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
                            <div className='space-y-4 text-left md:text-right ml-4 md:ml-0'>
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
                            <div className='space-y-4 text-left md:text-right ml-4 md:ml-0'>
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
                                    © 2025 HBank. All rights reserved.
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
