"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface WalletInfo {
    id: string
    name: string
    description: string
    envKey: string
    balances: {
        hbar: number
        usdc: number
        husd: number
    }
    health: 'healthy' | 'warning' | 'critical'
}

interface InstantRedemptionCardProps {
    instantWallet?: WalletInfo
    standardWallet?: WalletInfo
    loading?: boolean
}

export default function InstantRedemptionCard({ 
    instantWallet, 
    standardWallet, 
    loading = false 
}: InstantRedemptionCardProps) {
    const formatBalance = (balance: number, decimals: number = 2) => {
        return balance.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        })
    }

    const instantCapacity = instantWallet?.balances.usdc ?? 0
    const standardCapacity = standardWallet?.balances.usdc ?? 0
    const totalCapacity = instantCapacity + standardCapacity

    if (loading) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-2xl">Instant Redemption Capacity</CardTitle>
                    <CardDescription>
                        hUSD has an attractive liquidity profile with instant redemption capacity.
                        A minimum share of supply is available for instant redemption and replenishes over time to achieve a minimum of 5% of hUSD TVL.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-6">
                        <Link href="#" className="text-primary font-medium">Learn more →</Link>
                    </div>

                    <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                        <div>
                            <div className="mb-4 text-sm font-mono tracking-wide text-muted-foreground">
                                USDC REDEMPTION CAPACITY
                            </div>
                            <Skeleton className="h-12 w-32 mb-2" />
                            <Skeleton className="h-4 w-24" />
                        </div>

                        <div>
                            <div className="mb-4 text-sm font-mono tracking-wide text-muted-foreground">
                                REDEMPTION CAPACITY OVER TIME
                            </div>
                            <div className="flex h-48 items-end gap-10">
                                <div className="flex flex-col items-center gap-2">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-4 w-12" />
                                    <Skeleton className="h-4 w-10" />
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <Skeleton className="h-40 w-20" />
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-4 w-12" />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-2xl">Instant Redemption Capacity</CardTitle>
                <CardDescription>
                    hUSD has an attractive liquidity profile with instant redemption capacity.
                    Real-time USDC balances from withdrawal wallets ensure immediate redemption availability.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-6">
                    <Link href="#" className="text-primary font-medium">Learn more →</Link>
                </div>

                <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                    <div>
                        <div className="mb-4 text-sm font-mono tracking-wide text-muted-foreground">
                            INSTANT USDC CAPACITY
                        </div>
                        <div className="text-5xl font-semibold">
                            ${formatBalance(instantCapacity, 2)}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                            Available immediately from Instant Withdrawal Wallet
                        </div>
                        {instantWallet && (
                            <div className="mt-1 text-xs text-muted-foreground">
                                Wallet: {instantWallet.id}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="mb-4 text-sm font-mono tracking-wide text-muted-foreground">
                            TOTAL REDEMPTION CAPACITY
                        </div>
                        <div className="flex h-48 items-end gap-10">
                            <div className="flex flex-col items-center gap-2">
                                <div 
                                    className="w-20 rounded bg-primary/25 min-h-[16px]" 
                                    style={{ height: `${Math.max(16, (instantCapacity / totalCapacity) * 160)}px` }}
                                />
                                <div className="text-sm text-muted-foreground">
                                    ${formatBalance(instantCapacity, 0)}
                                </div>
                                <div className="text-sm text-muted-foreground">Instant</div>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div 
                                    className="w-20 rounded bg-primary min-h-[16px]" 
                                    style={{ height: `${Math.max(16, (standardCapacity / Math.max(totalCapacity, 1)) * 160)}px` }}
                                />
                                <div className="text-sm text-muted-foreground">
                                    ${formatBalance(standardCapacity, 0)}
                                </div>
                                <div className="text-sm text-muted-foreground">Standard</div>
                            </div>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">
                            Combined capacity: ${formatBalance(totalCapacity, 2)} USDC
                        </div>
                        {standardWallet && (
                            <div className="mt-1 text-xs text-muted-foreground">
                                Standard Wallet: {standardWallet.id}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}


