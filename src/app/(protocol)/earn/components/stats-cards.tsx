import { Card, CardContent } from '@/components/ui/card'
import { useTVL } from '@/hooks/useTVL'

export function StatsCards() {
    const { formattedTVL, loading: tvlLoading } = useTVL()

    // Static APY data and updated TVL data
    const METRICS_DATA = [
        { label: 'Total TVL', value: tvlLoading ? 'Loading...' : formattedTVL },
        { label: 'hUSD APY', value: '13.33%' },
    ]

    return (
        <div>
            <Card>
                <CardContent>
                    <div className='flex justify-start gap-4'>
                        {METRICS_DATA.map((metric, index) => (
                            <div key={index} className='flex flex-col'>
                                <span className='text-md font-bold text-muted-foreground'>
                                    {metric.label}
                                </span>
                                <span className='font-semibold text-blue-500'>
                                    {metric.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
