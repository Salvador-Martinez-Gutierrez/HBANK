"use client"

import { useState } from "react"
import { Card, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TokenInput } from "./token-input"
import { SwapButton } from "./swap-button"
import { TransactionDetails } from "./transaction-details"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { MintActionButton } from "./mint-action-button"

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
  const [isConnected, setIsConnected] = useState(false)

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
      const calculatedTo = activeTab === "mint"
        ? (parseFloat(value) / exchangeRate).toFixed(4)
        : (parseFloat(value) * exchangeRate).toFixed(4)
      setToAmount(calculatedTo)
    } else {
      setToAmount("")
    }
  }

  const handleConnectWallet = () => {
    setIsConnected(!isConnected)
  }

  const handleMint = async () => {
    // TODO: Implement actual Hedera minting transaction
    console.log("Creating Hedera mint transaction:", {
      fromToken,
      toToken,
      fromAmount,
      toAmount,
      exchangeRate
    })

    // Placeholder for complex Hedera transaction creation
    // This will include:
    // 1. Create transaction for USDC transfer to vault
    // 2. Create transaction for hUSD mint
    // 3. Submit complex transaction to wallet for signing
    
    alert(`Successfully minted ${toAmount} ${toToken} for ${fromAmount} ${fromToken}`)
  }

  const handleRedeem = async () => {
    if (!isConnected) {
      handleConnectWallet()
      return
    }

    // TODO: Implement actual redeeming logic
    console.log("Redeeming:", {
      fromToken,
      toToken,
      fromAmount,
      toAmount,
      exchangeRate
    })

    // Placeholder success handling
    alert(`Successfully redeemed ${toAmount} ${toToken} for ${fromAmount} ${fromToken}`)
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
      />

      {/* Tab-specific action button */}
      {activeTab === "mint" ? (
        <MintActionButton
          fromAmount={fromAmount}
          toAmount={toAmount}
          fromToken={fromToken}
          toToken={toToken}
          exchangeRate={exchangeRate}
          onMint={handleMint}
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
