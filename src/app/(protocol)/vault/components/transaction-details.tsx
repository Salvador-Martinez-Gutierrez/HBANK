

interface TransactionDetailsProps {
  exchangeRate: number
}

export function TransactionDetails({
  exchangeRate,
}: TransactionDetailsProps) {
  return (
    <div className="bg-muted/50 mt-2 rounded-lg p-4 space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Exchange Rate :</span>
        <span>1 hUSD = {exchangeRate} USDC</span>
      </div>
    </div>
  )
}
