import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

interface ApyCardProps {
  apy: string
  badgeText?: string
  tokenIcon?: string
  tokenSymbol?: string
}

export function ApyCard({ 
  apy, 
  badgeText = 'with',
  tokenIcon = '/usdc.svg',
  tokenSymbol = 'hUSD'
}: ApyCardProps) {
  return (
    <Card className="bg-green-200 border-green-500 lg:max-w-2/3">
      <CardContent className=" flex flex-col gap-2 items-center text-center">
        <div className="text-xl lg:text-3xl font-bold text-green-600">
          {apy}% APY
        </div>
        <Badge
          variant="default"
          className="bg-green-300 text-black text-sm lg:text-md border-green-400" >
          {badgeText} <Image src={tokenIcon} alt={tokenSymbol} width={20} height={20} className="rounded-full inline-block mx-1" /> {tokenSymbol}
        </Badge>
    </CardContent>
    </Card >
  )
}
