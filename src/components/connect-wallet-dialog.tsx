"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
//import { useCallback } from "react";
import BaseWalletButton from "@/components/base-wallet-button";
import { SUPPORTED_WALLETS } from "@/app/constants";

export function ConnectWalletDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  //const handleWalletSelect = () => {
  //  setIsConnectModalOpen(false);
  //  setIsWaitingApproval(true);
  //};

  //const handleWalletConnected = () => {
  //  setIsWaitingApproval(false);
  //};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl bg-black items-center w-[90%] sm:max-w-xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
        <DialogHeader>
          <DialogTitle className="text-white text-center text-2xl">
            Login
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            Select a wallet to connect to Hbank
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-row gap-4 py-4 justify-center">
          {SUPPORTED_WALLETS.map((wallet) => (
            <BaseWalletButton
              key={wallet.id}
              config={wallet}
              //onWalletSelect={onWalletSelect}
              //onWalletConnected={onWalletConnected}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
