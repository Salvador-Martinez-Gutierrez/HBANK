"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"

export default function ReportsCard() {
  const latestReports = [
    { date: "2025-08-26", href: "#" },
    { date: "2025-08-25", href: "#" },
    { date: "2025-08-22", href: "#" },
  ]

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Independent Verifications and Attestations</CardTitle>
        <CardDescription>
          Midas partnered with Ankura Trust to independently verify Collateral Assets and propagate
          pricing on-chain.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Latest Reports</div>
          <Link href="#" className="text-primary">All Reports →</Link>
        </div>

        <div className="mt-4 space-y-4">
          {latestReports.map((r) => (
            <div key={r.date} className="flex items-center justify-between border-b pb-4">
              <div className="text-foreground">{r.date}</div>
              <Link href={r.href} className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


