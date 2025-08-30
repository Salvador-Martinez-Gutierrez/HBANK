"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function InstantRedemptionCard() {
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
            <div className="text-5xl font-semibold">0.00</div>
            <div className="mt-2 text-sm text-muted-foreground">5% of hUSD TVL</div>
          </div>

          <div>
            <div className="mb-4 text-sm font-mono tracking-wide text-muted-foreground">
              REDEMPTION CAPACITY OVER TIME
            </div>
            <div className="flex h-48 items-end gap-10">
              <div className="flex flex-col items-center gap-2">
                <div className="h-4 w-20 rounded bg-primary/25" />
                <div className="text-sm text-muted-foreground">$0.00</div>
                <div className="text-sm text-muted-foreground">Instant</div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="h-40 w-20 rounded bg-primary" />
                <div className="text-sm text-muted-foreground">$14.89M</div>
                <div className="text-sm text-muted-foreground">2 Days</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


