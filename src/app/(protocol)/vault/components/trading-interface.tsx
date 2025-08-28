"use client"

import { useState } from "react"
import { Card, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TokenInput } from "./token-input"
import { SwapButton } from "./swap-button"
import { TransactionDetails } from "./transaction-details"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { MintActionButton } from "./mint-action-button"
import { useWallet } from "@buidlerlabs/hashgraph-react-wallets"
import { useTokenBalances } from "../hooks/useTokenBalances"

interface TradingInterfaceProps {
  exchangeRate: number
}

export function TradingInterface({
  exchangeRate
}: TradingInterfaceProps) {
  // State management
  const [activeTab, setActiveTab] = useState<"mint" | "redeem" | "history">("mint")
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const { isConnected } = useWallet()
  const { balances } = useTokenBalances()

  // Token configuration based on active tab
  const fromToken = activeTab === "mint" ? "USDC" : "hUSD"
  const toToken = activeTab === "mint" ? "hUSD" : "USDC"
  const fromIcon = activeTab === "mint" ? "🔵" : "🟠"
  const toIcon = activeTab === "mint" ? "🟠" : "🔵"

  // Event handlers
  const handleSwap = () => {
    setActiveTab(activeTab === "mint" ? "redeem" : "mint")
    setFromAmount(toAmount)
    setToAmount(fromAmount)
  }

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value)
    if (value && !isNaN(parseFloat(value))) {
      // With 1:1 exchange rate, the amounts are equal
      const calculatedTo = parseFloat(value).toFixed(4)
      setToAmount(calculatedTo)
    } else {
      setToAmount("")
    }
  }

  
  // TODO: This should be fetched from an API endpoint
  const getUsdValue = (amount: string) => {
    return amount ? `$${(parseFloat(amount) * 1.00).toFixed(4)}` : "$0.0000"
  }

  const renderTabContent = () => (
    <div className="space-y-2">
      {/* From Token */}
      <TokenInput
        label="You Pay"
        value={fromAmount}
        onChange={handleFromAmountChange}
        tokenSymbol={fromToken}
        tokenIcon={fromIcon}
        usdValue={getUsdValue(fromAmount)}
        balance={balances[fromToken as keyof typeof balances]}
        showBalance={isConnected}
      />

      {/* Swap Arrow */}
      <SwapButton onClick={handleSwap} />

      {/* To Token */}
      <TokenInput
        label="You Get"
        value={toAmount}
        readOnly
        tokenSymbol={toToken}
        tokenIcon={toIcon}
        usdValue={getUsdValue(toAmount)}
        balance={balances[toToken as keyof typeof balances]}
        showBalance={isConnected}
      />

      {/* Tab-specific action button */}
      {activeTab === "mint" ? (
        <MintActionButton
          fromAmount={fromAmount}
          toAmount={toAmount}
          fromToken={fromToken}
          toToken={toToken}
          exchangeRate={exchangeRate}
        />
      ) : (
        /* For redeem and history tabs, show connect wallet for now */
        <ConnectWalletButton variant="full-width" />
      )}

      {/* Transaction Details */}
      <TransactionDetails
        exchangeRate={exchangeRate}
      />
    </div>
  )

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
      <CardHeader>
        <Tabs defaultValue="mint" value={activeTab} onValueChange={(value) => setActiveTab(value as "mint" | "redeem" | "history")}>
          <TabsList>
            <TabsTrigger 
              value="mint" 
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white dark:data-[state=active]:bg-blue-500 dark:data-[state=active]:text-white"
            >
              Mint
            </TabsTrigger>
            <TabsTrigger 
              value="redeem" 
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white dark:data-[state=active]:bg-blue-500 dark:data-[state=active]:text-white"
            >
              Redeem
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white dark:data-[state=active]:bg-blue-500 dark:data-[state=active]:text-white"
            >
              History
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="mint" className="mt-6">
            {renderTabContent()}
          </TabsContent>

          <TabsContent value="redeem" className="mt-6">
            {renderTabContent()}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="space-y-4">
              <div className="text-center text-muted-foreground">
                <p>Transaction History</p>
                <p className="text-sm">Coming soon...</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  )
}
