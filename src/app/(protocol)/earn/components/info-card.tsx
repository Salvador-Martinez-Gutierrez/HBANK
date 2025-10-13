import { Card, CardContent } from "@/components/ui/card"
import { ReactNode } from "react"

interface InfoCardProps {
  children: ReactNode
}

export function InfoCard({ children }: InfoCardProps) {
  return (
    <Card className="bg-blue-300 border-blue-500 lg:max-w-2/3">
      <CardContent>
        <div className="text-sm text-black">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
