import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

interface HCFApyCardProps {
  apy: string
}

export function HCFApyCard({ apy }: HCFApyCardProps) {
  return (
    <Card className="bg-purple-200 border-purple-500 lg:max-w-2/3">
      <CardContent className=" flex flex-col gap-2 items-center text-center">
        <div className="text-xl lg:text-3xl font-bold text-purple-600">
          {apy}% APY
        </div>
        <Badge
          variant="default"
          className="bg-purple-300 text-black text-sm lg:text-md border-purple-400" >
          distributed in <Image src="/HB.png" alt="HB" width={20} height={20} className="rounded-full inline-block mx-1" /> $HB
        </Badge>
    </CardContent>
    </Card >
  )
}
