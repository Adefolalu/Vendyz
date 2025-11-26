"use client";

import { useEffect, useState } from "react";
import { useAccount, useDisconnect, useConnect, type Connector } from "wagmi";
import { Button } from "../Button";
import { USE_WALLET } from "../../../lib/constants";
import { useMiniApp } from "@neynar/react";
import { WalletExport } from "../../WalletExport";

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

  // State for wallet retrieval
  const [requestId, setRequestId] = useState<string>("");
  const [showExport, setShowExport] = useState(false);

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

  // Show WalletExport if requestId is provided
  if (showExport && requestId) {
    return (
      <WalletExport
        requestId={requestId}
        onClose={() => {
          setShowExport(false);
          setRequestId("");
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Wallet Connection Section */}
      <div className="space-y-6">
        <div className="space-y-3 max-w-md mx-auto">
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
            <div className="space-y-3 w-full">
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

        {/* Wallet Retrieval Section */}
        {isConnected && (
          <div className="mt-8 max-w-md mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">
                🔓 Retrieve Your Wallet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Enter your purchase request ID to access your wallet
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Request ID
                </label>
                <input
                  type="text"
                  value={requestId}
                  onChange={(e) => setRequestId(e.target.value)}
                  placeholder="Enter request ID"
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <Button
                onClick={() => setShowExport(true)}
                disabled={!requestId}
                className="w-full py-3"
              >
                Retrieve Wallet
              </Button>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <h3 className="font-bold text-yellow-900 dark:text-yellow-300 mb-2 text-sm">
                  ⚠️ Security Warning
                </h3>
                <ul className="text-xs text-yellow-800 dark:text-yellow-400 space-y-1">
                  <li>• Only retrieve wallets on a secure, private device</li>
                  <li>• Never share your private key with anyone</li>
                  <li>• Credentials auto-delete after 5 minutes</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
