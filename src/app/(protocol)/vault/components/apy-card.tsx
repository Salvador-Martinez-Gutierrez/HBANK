import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

interface ApyCardProps {
  apy: string
}

export function ApyCard({ apy }: ApyCardProps) {
  return (
    <Card className="bg-green-200 border-green-500 md:max-w-2/3">
      <CardContent className=" flex flex-col gap-2 items-center text-center">
        <div className="text-3xl font-bold text-green-600">
          {apy}% APY
        </div>
        <Badge
          variant="default"
          className="bg-green-300 text-black text-md border-green-400" >
          with <Image src="/usdc.svg" alt="USDC" width={20} height={20} className="rounded-full grayscale inline-block mx-1" /> hUSD
        </Badge>
    </CardContent>
    </Card >
  )
}
