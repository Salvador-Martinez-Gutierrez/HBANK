"use client";

import React from "react";
import { HWBridgeProvider } from "@buidlerlabs/hashgraph-react-wallets";
import {
  HWCConnector,
  HashpackConnector,
  KabilaConnector,
} from "@buidlerlabs/hashgraph-react-wallets/connectors";
import { HederaTestnet } from "@buidlerlabs/hashgraph-react-wallets/chains";

export function WalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const metadata = {
    name: "Valora Protocol",
    description: "Valora Protocol streamlines the emission of Liquid Yield Tokens.",
    icons: [
      "https://valora.com/favicon.ico",
    ],
    url: typeof window !== "undefined" ? window.location.href : "",
  };

  return (
    <HWBridgeProvider
      metadata={metadata}
      projectId={"eb3e42580d8e325d52e2edd599b9c567"}
      connectors={[HWCConnector, HashpackConnector, KabilaConnector]}
      chains={[HederaTestnet]}
    >
      {children}
    </HWBridgeProvider>
  );
}

export default WalletProvider;