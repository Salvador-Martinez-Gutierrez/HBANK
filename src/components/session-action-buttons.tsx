"use client";

import { useAccountId, useWallet } from "@buidlerlabs/hashgraph-react-wallets";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "./connect-wallet-button";
import { AccountDialog } from "./account-dialog";
import { useState } from "react";

export function SessionActionButtons() {
    const { isConnected } = useWallet();
    const { data: accountId } = useAccountId();
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);

    if (isConnected && accountId)
        return (
            <>
                <Button
                    onClick={() => setIsAccountDialogOpen(true)}
                    className="bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 rounded-full text-md cursor-pointer py-2"
                >
                    {accountId}
                </Button>
                <AccountDialog
                    open={isAccountDialogOpen}
                    onOpenChange={setIsAccountDialogOpen}
                    accountId={accountId}
                />
            </>
        );

    return (
        <ConnectWalletButton />
    );
}
