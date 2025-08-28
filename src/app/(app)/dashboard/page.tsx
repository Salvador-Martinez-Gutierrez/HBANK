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
    Shield,
    TrendingUp,
    Lock,
    Zap,
    BarChart3,
    Globe,
    Sparkles,
    ChevronRight,
    CheckCircle2,
    Coins,
    Activity,
    Users,
    Award,
    ChevronDown,
    Mail,
    Twitter,
    Github,
    MessageCircle,
} from 'lucide-react'

export default function Dashboard() {
    return (
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
                                Maximize your Yield
                            </span>
                            <br />
                            with Total Transparency
                        </h1>
                        <p className='mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl'>
                            Valora Protocol is the most advanced DeFi platform
                            on Hedera. Get superior yields with the security and
                            transparency that only blockchain technology can
                            offer.
                        </p>
                        <div className='flex flex-col items-center justify-center gap-4 sm:flex-row'>
                            <Link href='/vault'>
                                <Button
                                    size='lg'
                                    className='group min-w-[200px] text-base cursor-pointer hover:cursor-pointer'
                                >
                                    Start Investing
                                    <ArrowRight className='ml-2 h-5 w-5 transition-transform group-hover:translate-x-1' />
                                </Button>
                            </Link>
                            <Link href='/defi'>
                                <Button
                                    size='lg'
                                    variant='outline'
                                    className='min-w-[200px] text-base cursor-pointer hover:cursor-pointer'
                                >
                                    Explore DeFi
                                    <ChevronRight className='ml-2 h-5 w-5' />
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className='mt-20 grid grid-cols-2 gap-8 sm:grid-cols-4'>
                        <div className='text-center'>
                            <div className='text-3xl font-bold text-primary'>
                                $10M+
                            </div>
                            <div className='mt-1 text-sm text-muted-foreground'>
                                Total Value Locked
                            </div>
                        </div>
                        <div className='text-center'>
                            <div className='text-3xl font-bold text-primary'>
                                15%
                            </div>
                            <div className='mt-1 text-sm text-muted-foreground'>
                                Average APY
                            </div>
                        </div>
                        <div className='text-center'>
                            <div className='text-3xl font-bold text-primary'>
                                1000+
                            </div>
                            <div className='mt-1 text-sm text-muted-foreground'>
                                Active Users
                            </div>
                        </div>
                        <div className='text-center'>
                            <div className='text-3xl font-bold text-primary'>
                                100%
                            </div>
                            <div className='mt-1 text-sm text-muted-foreground'>
                                On-Chain
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className='px-4 py-20 sm:px-6 lg:px-8'>
                <div className='mx-auto max-w-7xl'>
                    <div className='text-center'>
                        <h2 className='mb-4 text-3xl font-bold sm:text-4xl'>
                            Why choose Valora Protocol?
                        </h2>
                        <p className='mx-auto mb-12 max-w-2xl text-lg text-muted-foreground'>
                            We combine the best of DeFi with the speed and
                            security of Hedera
                        </p>
                    </div>

                    <div className='grid gap-8 md:grid-cols-2 lg:grid-cols-3'>
                        <Card className='group relative overflow-hidden transition-all hover:shadow-lg'>
                            <CardHeader>
                                <div className='mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                                    <TrendingUp className='h-6 w-6' />
                                </div>
                                <CardTitle>Superior Yields</CardTitle>
                                <CardDescription>
                                    Optimized strategies that automatically
                                    maximize your returns
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className='space-y-2 text-sm'>
                                    <li className='flex items-start'>
                                        <CheckCircle2 className='mr-2 mt-0.5 h-4 w-4 text-primary' />
                                        <span>Smart auto-compounding</span>
                                    </li>
                                    <li className='flex items-start'>
                                        <CheckCircle2 className='mr-2 mt-0.5 h-4 w-4 text-primary' />
                                        <span>Automatic rebalancing</span>
                                    </li>
                                    <li className='flex items-start'>
                                        <CheckCircle2 className='mr-2 mt-0.5 h-4 w-4 text-primary' />
                                        <span>No hidden fees</span>
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className='group relative overflow-hidden transition-all hover:shadow-lg'>
                            <CardHeader>
                                <div className='mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                                    <Shield className='h-6 w-6' />
                                </div>
                                <CardTitle>Maximum Security</CardTitle>
                                <CardDescription>
                                    Audited smart contracts backed by the most
                                    secure network
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className='space-y-2 text-sm'>
                                    <li className='flex items-start'>
                                        <CheckCircle2 className='mr-2 mt-0.5 h-4 w-4 text-primary' />
                                        <span>Verified contracts</span>
                                    </li>
                                    <li className='flex items-start'>
                                        <CheckCircle2 className='mr-2 mt-0.5 h-4 w-4 text-primary' />
                                        <span>Multi-sig protection</span>
                                    </li>
                                    <li className='flex items-start'>
                                        <CheckCircle2 className='mr-2 mt-0.5 h-4 w-4 text-primary' />
                                        <span>Regular audits</span>
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className='group relative overflow-hidden transition-all hover:shadow-lg'>
                            <CardHeader>
                                <div className='mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                                    <Zap className='h-6 w-6' />
                                </div>
                                <CardTitle>Hedera Speed</CardTitle>
                                <CardDescription>
                                    Instant transactions with minimal fees
                                    thanks to Hedera
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className='space-y-2 text-sm'>
                                    <li className='flex items-start'>
                                        <CheckCircle2 className='mr-2 mt-0.5 h-4 w-4 text-primary' />
                                        <span>3-5 seconds per transaction</span>
                                    </li>
                                    <li className='flex items-start'>
                                        <CheckCircle2 className='mr-2 mt-0.5 h-4 w-4 text-primary' />
                                        <span>Fees &lt; $0.01</span>
                                    </li>
                                    <li className='flex items-start'>
                                        <CheckCircle2 className='mr-2 mt-0.5 h-4 w-4 text-primary' />
                                        <span>10,000+ TPS</span>
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Transparency Section */}
            <section className='bg-gradient-to-b from-secondary/5 to-background px-4 py-20 sm:px-6 lg:px-8'>
                <div className='mx-auto max-w-7xl'>
                    <div className='grid items-center gap-12 lg:grid-cols-2'>
                        <div>
                            <h2 className='mb-6 text-3xl font-bold sm:text-4xl'>
                                Total Transparency with{' '}
                                <span className='bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent'>
                                    Hedera Hashgraph
                                </span>
                            </h2>
                            <p className='mb-8 text-lg text-muted-foreground'>
                                Every transaction, every yield generated, every
                                movement is immutably recorded on the Hedera
                                network. Check the status of your investments in
                                real time with total transparency.
                            </p>
                            <div className='space-y-4'>
                                <div className='flex items-start'>
                                    <Globe className='mr-3 mt-1 h-5 w-5 text-primary' />
                                    <div>
                                        <h3 className='font-semibold'>
                                            100% On-Chain
                                        </h3>
                                        <p className='text-sm text-muted-foreground'>
                                            All operations verifiable on Hedera
                                            Explorer
                                        </p>
                                    </div>
                                </div>
                                <div className='flex items-start'>
                                    <Lock className='mr-3 mt-1 h-5 w-5 text-primary' />
                                    <div>
                                        <h3 className='font-semibold'>
                                            Immutable & Secure
                                        </h3>
                                        <p className='text-sm text-muted-foreground'>
                                            Permanent and unalterable record of
                                            all transactions
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
                                            Dashboards with up-to-date metrics
                                            instantly
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className='relative'>
                            <div className='absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-3xl' />
                            <Card className='relative'>
                                <CardHeader>
                                    <CardTitle>Live Stats</CardTitle>
                                    <CardDescription>
                                        Real-time platform metrics
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className='space-y-4'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center'>
                                            <Activity className='mr-2 h-4 w-4 text-primary' />
                                            <span className='text-sm'>
                                                Transacciones/24h
                                            </span>
                                        </div>
                                        <span className='font-mono text-sm font-semibold'>
                                            12,847
                                        </span>
                                    </div>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center'>
                                            <Coins className='mr-2 h-4 w-4 text-primary' />
                                            <span className='text-sm'>
                                                Volume/24h
                                            </span>
                                        </div>
                                        <span className='font-mono text-sm font-semibold'>
                                            $2.4M
                                        </span>
                                    </div>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center'>
                                            <Users className='mr-2 h-4 w-4 text-primary' />
                                            <span className='text-sm'>
                                                Active Users
                                            </span>
                                        </div>
                                        <span className='font-mono text-sm font-semibold'>
                                            1,234
                                        </span>
                                    </div>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center'>
                                            <Award className='mr-2 h-4 w-4 text-primary' />
                                            <span className='text-sm'>
                                                Average APY
                                            </span>
                                        </div>
                                        <span className='font-mono text-sm font-semibold text-green-600'>
                                            15.2%
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* Products Section */}
            <section className='px-4 py-20 sm:px-6 lg:px-8'>
                <div className='mx-auto max-w-7xl'>
                    <div className='text-center'>
                        <h2 className='mb-4 text-3xl font-bold sm:text-4xl'>
                            Our DeFi Products
                        </h2>
                        <p className='mx-auto mb-12 max-w-2xl text-lg text-muted-foreground'>
                            Complete solutions to maximize your capital in the
                            Hedera ecosystem
                        </p>
                    </div>

                    <div className='grid gap-8 md:grid-cols-2'>
                        <Card className='relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent'>
                            <div className='absolute right-0 top-0 h-32 w-32 bg-primary/10 blur-3xl' />
                            <CardHeader>
                                <div className='mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                                    <Lock className='h-7 w-7' />
                                </div>
                                <CardTitle className='text-2xl'>
                                    Vault
                                </CardTitle>
                                <CardDescription className='text-base'>
                                    Deposit your assets and generate yields
                                    automatically with optimized strategies
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className='mb-6 space-y-3'>
                                    <div className='flex items-center justify-between'>
                                        <span className='text-sm text-muted-foreground'>
                                            Current APY
                                        </span>
                                        <span className='text-lg font-semibold text-green-600'>
                                            12-18%
                                        </span>
                                    </div>
                                    <div className='flex items-center justify-between'>
                                        <span className='text-sm text-muted-foreground'>
                                            Risk
                                        </span>
                                        <span className='text-sm font-medium'>
                                            Low-Medium
                                        </span>
                                    </div>
                                    <div className='flex items-center justify-between'>
                                        <span className='text-sm text-muted-foreground'>
                                            Lock Period
                                        </span>
                                        <span className='text-sm font-medium'>
                                            Flexible
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
                                <div className='mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10 text-secondary'>
                                    <TrendingUp className='h-7 w-7' />
                                </div>
                                <CardTitle className='text-2xl'>
                                    DeFi Hub
                                </CardTitle>
                                <CardDescription className='text-base'>
                                    Access multiple DeFi protocols from a single
                                    unified interface
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className='mb-6 space-y-3'>
                                    <div className='flex items-center justify-between'>
                                        <span className='text-sm text-muted-foreground'>
                                            Protocols
                                        </span>
                                        <span className='text-lg font-semibold'>
                                            10+
                                        </span>
                                    </div>
                                    <div className='flex items-center justify-between'>
                                        <span className='text-sm text-muted-foreground'>
                                            Total TVL
                                        </span>
                                        <span className='text-sm font-medium'>
                                            $50M+
                                        </span>
                                    </div>
                                    <div className='flex items-center justify-between'>
                                        <span className='text-sm text-muted-foreground'>
                                            Fees
                                        </span>
                                        <span className='text-sm font-medium'>
                                            0.1-0.3%
                                        </span>
                                    </div>
                                </div>
                                <Link href='/defi'>
                                    <Button
                                        className='w-full'
                                        size='lg'
                                        variant='secondary'
                                    >
                                        Access DeFi
                                        <ArrowRight className='ml-2 h-4 w-4' />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Partners Section */}
            <section className='px-4 py-20 sm:px-6 lg:px-8'>
                <div className='mx-auto max-w-7xl'>
                    <div className='text-center'>
                        <h2 className='mb-4 text-3xl font-bold sm:text-4xl'>
                            Ecosystem & Partners
                        </h2>
                        <p className='mx-auto mb-12 max-w-2xl text-lg text-muted-foreground'>
                            Integrated with the best protocols and services in
                            the Hedera ecosystem
                        </p>
                    </div>

                    <div className='grid grid-cols-2 gap-8 md:grid-cols-4'>
                        <div className='flex items-center justify-center rounded-lg border bg-card/50 p-6 transition-all hover:border-primary/50 hover:shadow-lg'>
                            <div className='text-center'>
                                <div className='mb-2 text-2xl font-bold text-primary'>
                                    Hedera
                                </div>
                                <p className='text-xs text-muted-foreground'>
                                    Network
                                </p>
                            </div>
                        </div>
                        <div className='flex items-center justify-center rounded-lg border bg-card/50 p-6 transition-all hover:border-primary/50 hover:shadow-lg'>
                            <div className='text-center'>
                                <div className='mb-2 text-2xl font-bold text-primary'>
                                    HashPack
                                </div>
                                <p className='text-xs text-muted-foreground'>
                                    Wallet
                                </p>
                            </div>
                        </div>
                        <div className='flex items-center justify-center rounded-lg border bg-card/50 p-6 transition-all hover:border-primary/50 hover:shadow-lg'>
                            <div className='text-center'>
                                <div className='mb-2 text-2xl font-bold text-primary'>
                                    SaucerSwap
                                </div>
                                <p className='text-xs text-muted-foreground'>
                                    DEX
                                </p>
                            </div>
                        </div>
                        <div className='flex items-center justify-center rounded-lg border bg-card/50 p-6 transition-all hover:border-primary/50 hover:shadow-lg'>
                            <div className='text-center'>
                                <div className='mb-2 text-2xl font-bold text-primary'>
                                    Kabila
                                </div>
                                <p className='text-xs text-muted-foreground'>
                                    Wallet
                                </p>
                            </div>
                        </div>
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
                            Everything you need to know about Valora Protocol
                        </p>
                    </div>

                    <div className='space-y-4'>
                        <details className='group rounded-lg border bg-card p-6'>
                            <summary className='flex cursor-pointer items-center justify-between font-semibold'>
                                What is Valora Protocol?
                                <ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
                            </summary>
                            <p className='mt-4 text-muted-foreground'>
                                Valora Protocol is a DeFi platform built on
                                Hedera Hashgraph that allows users to maximize
                                their returns through automated yield farming,
                                staking, and liquidity provision strategies. We
                                offer total transparency with all operations
                                verifiable on-chain.
                            </p>
                        </details>

                        <details className='group rounded-lg border bg-card p-6'>
                            <summary className='flex cursor-pointer items-center justify-between font-semibold'>
                                How does the Vault work?
                                <ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
                            </summary>
                            <p className='mt-4 text-muted-foreground'>
                                The Vault is our main product where you deposit
                                your assets and optimized strategies are
                                automatically applied to generate maximum yield.
                                We use auto-compounding, automatic rebalancing,
                                and diversification across multiple protocols to
                                maximize your earnings.
                            </p>
                        </details>

                        <details className='group rounded-lg border bg-card p-6'>
                            <summary className='flex cursor-pointer items-center justify-between font-semibold'>
                                Is it safe to invest in Valora?
                                <ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
                            </summary>
                            <p className='mt-4 text-muted-foreground'>
                                Yes, security is our priority. All our smart
                                contracts are audited by recognized firms, we
                                use multi-sig for critical operations, and the
                                Hedera network provides enterprise-grade
                                security with aBFT consensus. In addition, we
                                never have direct custody of your funds.
                            </p>
                        </details>

                        <details className='group rounded-lg border bg-card p-6'>
                            <summary className='flex cursor-pointer items-center justify-between font-semibold'>
                                What are the fees?
                                <ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
                            </summary>
                            <p className='mt-4 text-muted-foreground'>
                                We charge a 1% fee on each deposit made.
                                Transactions on Hedera cost less than $0.01.
                                There are no hidden fees; everything is
                                transparent and verifiable on-chain.
                            </p>
                        </details>

                        <details className='group rounded-lg border bg-card p-6'>
                            <summary className='flex cursor-pointer items-center justify-between font-semibold'>
                                How do withdrawals work?
                                <ChevronDown className='h-5 w-5 transition-transform group-open:rotate-180' />
                            </summary>
                            <p className='mt-4 text-muted-foreground'>
                                Standard withdrawals take 48 hours to process.
                                If you wish to withdraw your funds before that
                                period, a 0.5% fee will be applied to the
                                withdrawn amount. Some specific vaults may have
                                additional lock periods to optimize yields, but
                                this is always clearly indicated before
                                depositing.
                            </p>
                        </details>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className='px-4 py-20 sm:px-6 lg:px-8'>
                <div className='mx-auto max-w-4xl text-center'>
                    <h2 className='mb-6 text-3xl font-bold sm:text-4xl'>
                        Start generating yields today
                    </h2>
                    <p className='mb-10 text-lg text-muted-foreground'>
                        Join thousands of users already maximizing their
                        earnings with the transparency and security of Hedera
                    </p>
                    <div className='flex flex-col items-center justify-center gap-4 sm:flex-row'>
                        <Link href='/vault'>
                            <Button
                                size='lg'
                                className='group min-w-[200px] text-base'
                            >
                                Access Vault
                                <ArrowRight className='ml-2 h-5 w-5 transition-transform group-hover:translate-x-1' />
                            </Button>
                        </Link>
                        <Link href='/portfolio'>
                            <Button
                                size='lg'
                                variant='outline'
                                className='min-w-[200px] text-base'
                            >
                                View Portfolio
                                <ChevronRight className='ml-2 h-5 w-5' />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className='border-t bg-card/50'>
                <div className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
                    <div className='grid gap-8 md:grid-cols-4'>
                        {/* Brand */}
                        <div className='space-y-4'>
                            <h3 className='text-lg font-bold'>
                                Valora Protocol
                            </h3>
                            <p className='text-sm text-muted-foreground'>
                                The most transparent and profitable DeFi
                                platform on Hedera Hashgraph.
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
                        <div className='space-y-4'>
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
                                        href='/defi'
                                        className='text-muted-foreground transition-colors hover:text-primary'
                                    >
                                        DeFi Hub
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
                                <li>
                                    <Link
                                        href='/transparency'
                                        className='text-muted-foreground transition-colors hover:text-primary'
                                    >
                                        Analytics
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Resources */}
                        <div className='space-y-4'>
                            <h4 className='font-semibold'>Resources</h4>
                            <ul className='space-y-2 text-sm'>
                                <li>
                                    <Link
                                        href='#'
                                        className='text-muted-foreground transition-colors hover:text-primary'
                                    >
                                        Documentation
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='#'
                                        className='text-muted-foreground transition-colors hover:text-primary'
                                    >
                                        API
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='#'
                                        className='text-muted-foreground transition-colors hover:text-primary'
                                    >
                                        Audits
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='#'
                                        className='text-muted-foreground transition-colors hover:text-primary'
                                    >
                                        Blog
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Legal */}
                        <div className='space-y-4'>
                            <h4 className='font-semibold'>Legal</h4>
                            <ul className='space-y-2 text-sm'>
                                <li>
                                    <Link
                                        href='#'
                                        className='text-muted-foreground transition-colors hover:text-primary'
                                    >
                                        Terms of Use
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='#'
                                        className='text-muted-foreground transition-colors hover:text-primary'
                                    >
                                        Privacy Policy
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='#'
                                        className='text-muted-foreground transition-colors hover:text-primary'
                                    >
                                        Risk Notice
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href='#'
                                        className='text-muted-foreground transition-colors hover:text-primary'
                                    >
                                        Contact
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className='mt-8 border-t pt-8'>
                        <div className='flex flex-col items-center justify-between gap-4 sm:flex-row'>
                            <p className='text-sm text-muted-foreground'>
                                © 2024 Valora Protocol. All rights reserved.
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
    )
}

