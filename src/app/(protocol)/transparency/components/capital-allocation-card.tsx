"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

type CapitalAllocationItem = {
  name: string
  amount: string
  percentage: string
  linkLabel?: string
  linkHref?: string
}

type CapitalAllocationSection = {
  title: string
  totalAmount: string
  totalPercentage: string
  items: CapitalAllocationItem[]
}

type CapitalAllocationCardProps = {
  title?: string
  sections?: CapitalAllocationSection[]
}

export default function CapitalAllocationCard({
  title = "Capital Allocation",
  sections = [
    {
      title: "Defi Strategies",
      totalAmount: "$24.13M",
      totalPercentage: "73.50%",
      items: [
        { name: "Fireblocks 1", amount: "$12.78M", percentage: "38.94%", linkLabel: "Debank", linkHref: "#" },
        { name: "Fireblocks 4", amount: "$6.63M", percentage: "20.19%", linkLabel: "Debank", linkHref: "#" },
      ],
    },
    {
      title: "Exchanges",
      totalAmount: "$8.65M",
      totalPercentage: "26.35%",
      items: [
        { name: "Hyperliquid", amount: "$7.91M", percentage: "24.11%" },
        { name: "Bybit", amount: "$709.23K", percentage: "2.16%" },
      ],
    },
    {
      title: "Instant Redemption",
      totalAmount: "$0.00",
      totalPercentage: "0.00%",
      items: [
        { name: "Hedera", amount: "$0.00", percentage: "0.00%", linkLabel: "Hashscan", linkHref: "#" },
      ],
    },
  ],
}: CapitalAllocationCardProps) {
  const chartData = sections.map((section, index) => ({
    name: section.title,
    value: parseFloat(section.totalPercentage),
    color: `var(--chart-${(index % 5) + 1})`,
  }))

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            {sections.map((section) => (
              <div key={section.title} className="space-y-3">
                <div className="grid grid-cols-3 items-center gap-2">
                  <div className="col-span-1 text-lg font-semibold text-foreground">{section.title}</div>
                  <div className="col-span-1 text-right font-semibold tabular-nums">{section.totalAmount}</div>
                  <div className="col-span-1 text-right font-semibold tabular-nums">{section.totalPercentage}</div>
                </div>

                {section.items.map((item) => (
                  <div key={item.name} className="grid grid-cols-3 items-center gap-2">
                    <div className="col-span-1 text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        {item.linkLabel && item.linkHref ? (
                          <Link href={item.linkHref} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                            {item.linkLabel}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    <div className="col-span-1 text-right tabular-nums">{item.amount}</div>
                    <div className="col-span-1 text-right tabular-nums text-muted-foreground">{item.percentage}</div>
                  </div>
                ))}
              </div>
            ))}

            <div className="grid grid-cols-3 items-center gap-2 border-t pt-4">
              <div className="col-span-1 text-lg font-semibold text-foreground">Total TVL</div>
              <div className="col-span-1 text-right font-semibold tabular-nums">$32.82M</div>
              <div className="col-span-1 text-right font-semibold tabular-nums">100%</div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="var(--border)"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}-${index}`} fill={entry.color as string} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${Number(value).toFixed(2)}%`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {chartData.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: d.color as string }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="tabular-nums">{d.value.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


