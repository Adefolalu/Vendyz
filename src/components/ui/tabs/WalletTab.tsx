"use client";

import { useEffect } from "react";
import { useAccount, useDisconnect, useConnect } from "wagmi";
import { Button } from "../Button";
import { USE_WALLET } from "../../../lib/constants";
import { useMiniApp } from "@neynar/react";

/**
 * WalletTab component manages wallet connection for EVM chains (Base).
 *
 * This component provides a simple wallet interface that supports:
 * - EVM wallet connections (Farcaster Frame, Coinbase Wallet, MetaMask)
 * - Auto-connection in Farcaster clients
 *
 * @example
 * ```tsx
 * <WalletTab />
 * ```
 */

export function WalletTab() {
  // --- Hooks ---
  const { context } = useMiniApp();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();

  // --- Effects ---
  /**
   * Auto-connect when Farcaster context is available.
   */
  useEffect(() => {
    const isInFarcasterClient =
      typeof window !== "undefined" &&
      (window.location.href.includes("warpcast.com") ||
        window.location.href.includes("farcaster") ||
        window.ethereum?.isFarcaster ||
        context?.client);

    if (
      context?.user?.fid &&
      !isConnected &&
      connectors.length > 0 &&
      isInFarcasterClient
    ) {
      try {
        connect({ connector: connectors[0] });
      } catch (error) {
        console.error("Auto-connection failed:", error);
      }
    }
  }, [context?.user?.fid, isConnected, connectors, connect, context?.client]);

  // --- Early Return ---
  if (!USE_WALLET) {
    return null;
  }

  // --- Render ---
  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {/* Wallet Connection Section */}
      <div className="space-y-4">
        <div className="space-y-2 max-w-sm mx-auto">
          {isConnected ? (
            <Button onClick={() => disconnect()} className="w-full">
              Disconnect Wallet
            </Button>
          ) : context ? (
            <Button
              onClick={() => connect({ connector: connectors[0] })}
              className="w-full"
            >
              Connect Wallet
            </Button>
          ) : (
            <div className="space-y-2 w-full">
              <Button
                onClick={() => connect({ connector: connectors[1] })}
                className="w-full"
              >
                Connect Coinbase Wallet
              </Button>
              <Button
                onClick={() => connect({ connector: connectors[2] })}
                className="w-full"
              >
                Connect MetaMask
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
