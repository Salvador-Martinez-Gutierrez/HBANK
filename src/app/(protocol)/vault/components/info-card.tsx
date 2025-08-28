import { Card, CardContent } from "@/components/ui/card"

export function InfoCard() {
  return (
    <Card className="bg-blue-300 border-blue-500 md:max-w-2/3">
      <CardContent>
        <div className="text-sm text-foreground">
          <strong>hUSD</strong> is a yield bearing token earning rewards, so it&apos;s dollar value is always higher than the base stablecoin. You are still getting the same dollar amount of the token when you mint.
        </div>
      </CardContent>
    </Card>
  )
}
