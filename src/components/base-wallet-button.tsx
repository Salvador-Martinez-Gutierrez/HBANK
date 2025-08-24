"use client";

import { Button } from "@/components/ui/button";
import { useWallet } from "@buidlerlabs/hashgraph-react-wallets";
import { HashpackConnector, HWCConnector, KabilaConnector } from "@buidlerlabs/hashgraph-react-wallets/connectors";
import Image, { StaticImageData } from "next/image";

export interface WalletConfig {
  id: string;
  name: string;
  icon: string | StaticImageData;
  iconSize: { width: number; height: number };
  connector: typeof HashpackConnector | typeof KabilaConnector | typeof HWCConnector;
  mobileSupported: boolean;
}

export interface WalletButtonProps {
  onWalletSelect?: () => void;
  onWalletConnected?: () => void;
  config: WalletConfig;
}

const BaseWalletButton = ({ config }: WalletButtonProps) => {
  const { connect } = useWallet(config.connector);


  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error(`Failed to connect with ${config.name}:`, error);
    }
  };

  return (
    <Button
      onClick={handleConnect}
      className="bg-blue-500 hover:bg-blue-600 w-24 h-24 flex flex-col items-center justify-center gap-2 rounded-xl"
    >
      <Image
        src={config.icon}
        alt={`${config.name} Wallet`}
        width={48}
        height={48}
      />
    </Button>
  );
};

export default BaseWalletButton;
