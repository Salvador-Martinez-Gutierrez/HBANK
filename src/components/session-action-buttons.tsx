"use client";

import { useAccountId, useWallet } from "@buidlerlabs/hashgraph-react-wallets";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ConnectWalletButton } from "./connect-wallet-button";

export function SessionActionButtons() {
    const { isConnected, disconnect } = useWallet();
    const { data: accountId } = useAccountId();
    const router = useRouter();

    const handleDisconnect = async () => {
        disconnect();
    };

    if (isConnected && accountId)
        return (
            <Button
                onClick={() => {
                    handleDisconnect();
                }}
                className="bg-neutral-200 text-red-600 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-red-400 dark:hover:bg-neutral-700 rounded-full text-md cursor-pointer py-2"
            >
                Disconnect
            </Button>
        );

    return (
        <ConnectWalletButton />
    );
}
