"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { useWallet, useAccountId, useAssociateTokens, useWatchTransactionReceipt } from "@buidlerlabs/hashgraph-react-wallets";
import { checkTokenAssociation } from "@/services/token.services";
import { TOKEN_IDS } from "@/app/constants";
import { Wallet } from "lucide-react";
import { TransferTransaction, AccountId } from '@hashgraph/sdk';

interface MintActionButtonProps {
  fromAmount: string;
  toAmount: string;
  fromToken: string;
  toToken: string;
  exchangeRate: number;
}

export function MintActionButton({
  fromAmount,
  toAmount,
  fromToken,
  toToken,
  exchangeRate,
}: MintActionButtonProps) {
  const { isConnected, isLoading: walletLoading, signer } = useWallet();
  const { data: accountId } = useAccountId();
  const { associateTokens } = useAssociateTokens();
  const { watch } = useWatchTransactionReceipt();
  
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
      console.log("hasAssociation", hasAssociation);
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
      console.log("🔗 Starting token association for hUSD:", TOKEN_IDS.hUSD);
      
      // Execute the TokenAssociateTransaction using the hashgraph-react-wallets hook
      const transactionResult = await associateTokens([TOKEN_IDS.hUSD]);
      
      if (!transactionResult) {
        throw new Error("Failed to get transaction ID from token association");
      }
      
      // Handle both string and string[] return types
      const transactionId = Array.isArray(transactionResult) ? transactionResult[0] : transactionResult;
      
      console.log("📤 Token association transaction sent:", transactionId);
      console.log("⏳ Watching transaction receipt...");
      
      // Watch the transaction receipt for completion
      await watch(transactionId, {
        onSuccess: (transaction) => {
          console.log("✅ Token association successful:", transaction);
          console.log("🔄 Updating association state to true");
          
          // Update state to show mint button
          setHasTokenAssociation(true);
          setIsProcessing(false);
          
          return transaction;
        },
        onError: (transaction, error) => {
          console.error("❌ Token association failed:", error);
          console.log("📊 Transaction details:", transaction);
          
          // Keep the associate button visible
          setIsProcessing(false);
          
          return transaction;
        },
      });
      
    } catch (error) {
      console.error("❌ Token association failed:", error);
      setIsProcessing(false);
    }
  };

  const handleMint = async () => {
    setIsProcessing(true);
    try {
      // Validate amount
      const amountNum = parseFloat(fromAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Invalid amount');
      }

      console.log('Creating deposit transaction for:', amountNum, 'USDC');

      // Check if signer is available
      if (!signer) {
        throw new Error('No signer available');
      }

      // 1. Create USDC transfer transaction
      const amountInTinybar = amountNum * 1_000_000; // USDC has 6 decimals

      const transaction = new TransferTransaction()
        .addTokenTransfer(
          TOKEN_IDS.USDC,
          AccountId.fromString(accountId),
          -amountInTinybar
        )
        .addTokenTransfer(
          TOKEN_IDS.USDC,
          AccountId.fromString('0.0.6510977'), // TREASURY_ID
          amountInTinybar
        )
        .setTransactionMemo(`Mint`);

      console.log('Transaction created, freezing with signer...');

      // 2. Freeze with signer
      const frozenTx = await transaction.freezeWithSigner(signer as any);

      console.log('Requesting signature from wallet...');

      // 3. User signs
      const signedTx = await frozenTx.signWithSigner(signer as any);

      console.log('Executing deposit transaction...');

      // 4. Execute
      const txResponse = await signedTx.executeWithSigner(signer as any);
      console.log('Transaction executed:', txResponse.transactionId?.toString());

      // 5. Get receipt
      const receipt = await txResponse.getReceiptWithSigner(signer as any);
      console.log('Receipt:', receipt.status.toString());

      if (receipt.status.toString() !== 'SUCCESS') {
        throw new Error(`Transaction failed: ${receipt.status}`);
      }

      console.log('Requesting hUSD from backend...');

      // 6. Request hUSD from backend
      const response = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAccountId: accountId,
          amount: amountInTinybar,
          depositTxId: txResponse.transactionId?.toString(),
          tokenType: 'USDC',
        }),
      });

      console.log('Backend response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend error:', errorData);
        throw new Error(
          errorData.message || errorData.error || 'Server error'
        );
      }

      const result = await response.json();
      console.log('Success:', result);

      alert(
        `Mint successful!\nYou received ${result.hUSDReceived / 1_000_000} hUSD\nTx ID: ${result.hUSDTxId}`
      );
      
    } catch (error: any) {
      console.error("Mint failed:", error);
      alert(`Mint failed: ${error?.message || 'Unknown error'}`);
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
        {isProcessing ? "Minting..." : `Mint`}
      </span>
    </Button>
  );
}
