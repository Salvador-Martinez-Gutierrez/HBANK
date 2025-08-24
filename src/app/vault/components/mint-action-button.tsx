"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { useWallet, useAccountId, useAssociateTokens } from "@buidlerlabs/hashgraph-react-wallets";
import { checkTokenAssociation } from "@/services/token-association";
import { TOKEN_IDS } from "@/app/constants";
import { Wallet } from "lucide-react";

interface MintActionButtonProps {
  fromAmount: string;
  toAmount: string;
  fromToken: string;
  toToken: string;
  exchangeRate: number;
  onMint: () => Promise<void>;
}

export function MintActionButton({
  fromAmount,
  toAmount,
  fromToken,
  toToken,
  exchangeRate,
  onMint
}: MintActionButtonProps) {
  const { isConnected, isLoading: walletLoading } = useWallet();
  const { data: accountId } = useAccountId();
  const { associateTokens } = useAssociateTokens();
  
  const [isCheckingAssociation, setIsCheckingAssociation] = useState(false);
  const [hasTokenAssociation, setHasTokenAssociation] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check token association when wallet connects
  useEffect(() => {
    if (isConnected && accountId && hasTokenAssociation === null) {
      checkAssociation();
    } else if (!isConnected) {
      // Reset state when wallet disconnects
      setHasTokenAssociation(null);
    }
  }, [isConnected, accountId]);

  const checkAssociation = async () => {
    if (!accountId) return;
    
    setIsCheckingAssociation(true);
    try {
      const hasAssociation = await checkTokenAssociation(accountId);
      setHasTokenAssociation(hasAssociation);
    } catch (error) {
      console.error("Failed to check token association:", error);
      setHasTokenAssociation(false);
    } finally {
      setIsCheckingAssociation(false);
    }
  };

  const handleAssociateToken = async () => {
    setIsProcessing(true);
    try {      
      // Execute the TokenAssociateTransaction using the hashgraph-react-wallets hook
      await associateTokens([TOKEN_IDS.hUSD]);
            
      // Wait a moment for the transaction to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Recheck association after successful association
      await checkAssociation();
      
    } catch (error) {
      console.error("Token association failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMint = async () => {
    setIsProcessing(true);
    try {
      await onMint();
    } catch (error) {
      console.error("Mint failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Show connect wallet button if not connected
  if (!isConnected) {
    return <ConnectWalletButton variant="full-width" />;
  }

  // Show loading state while checking association
  if (walletLoading || isCheckingAssociation) {
    return (
      <Button 
        className="w-full h-14 bg-blue-500 text-white" 
        disabled
      >
        <span className="flex items-center gap-x-2 px-4">
          <Wallet size={24} className="animate-pulse" />
          Checking wallet...
        </span>
      </Button>
    );
  }

  // Show associate token button if token is not associated
  if (hasTokenAssociation === false) {
    return (
      <Button 
        className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white" 
        onClick={handleAssociateToken}
        disabled={isProcessing}
      >
        <span className="flex items-center gap-x-2 px-4">
          {isProcessing ? "Associating Token..." : "Associate hUSD Token Id"}
        </span>
      </Button>
    );
  }

  // Show mint button if everything is ready
  const isDisabled = !fromAmount || !toAmount || parseFloat(fromAmount) <= 0 || isProcessing;

  return (
    <Button 
      className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-400" 
      onClick={handleMint}
      disabled={isDisabled}
    >
      <span className="flex items-center gap-x-2 px-4">
        {isProcessing ? "Minting..." : `Mint ${toAmount} ${toToken}`}
      </span>
    </Button>
  );
}
