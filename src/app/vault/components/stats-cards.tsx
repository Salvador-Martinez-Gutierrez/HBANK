import { Card, CardContent } from "@/components/ui/card"

// TODO: These values should be fetched from an API endpoint
const METRICS_DATA = [
    { label: 'Total TVL', value: '$11,222,333' },
    { label: 'hUSD APY', value: '13.33%' },
]

export function StatsCards() {
    return (
        <div>
            <Card>
                <CardContent>
                    <div className="flex justify-start gap-4">
                        {METRICS_DATA.map((metric, index) => (
                            <div key={index} className="flex flex-col">
                                <span className="text-md font-bold text-muted-foreground">{metric.label}</span>
                                <span className="font-semibold text-blue-500">{metric.value}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
