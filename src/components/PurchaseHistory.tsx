"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { VendingMachineAbi, VendingMachineAddress } from "~/lib/constants";
import { Button } from "./ui/Button";

interface Purchase {
  buyer: string;
  tier: number;
  timestamp: bigint;
  pricePaid: bigint;
  fulfilled: boolean;
  randomWords: bigint[];
}

const TIER_NAMES = ["", "Bronze 🥉", "Silver 🥈", "Gold 🥇", "Diamond 💎"];

export function PurchaseHistory() {
  const { address, isConnected } = useAccount();
  const [purchases, setPurchases] = useState<
    (Purchase & { requestId: bigint })[]
  >([]);

  // Get user's purchase IDs
  const { data: purchaseIds, refetch: refetchIds } = useReadContract({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    functionName: "getUserPurchaseIds",
    args: address ? [address] : undefined,
  });

  // Fetch batch purchases when we have IDs
  const { data: batchPurchases, refetch: refetchBatch } = useReadContract({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    functionName: "getBatchPurchases",
    args:
      purchaseIds && Array.isArray(purchaseIds) && purchaseIds.length > 0
        ? [purchaseIds as bigint[]]
        : undefined,
  });

  // Process purchases
  useEffect(() => {
    if (batchPurchases && purchaseIds) {
      const processedPurchases = (batchPurchases as Purchase[]).map(
        (purchase, index) => ({
          ...purchase,
          requestId: (purchaseIds as bigint[])[index],
        })
      );
      // Sort by timestamp descending (newest first)
      processedPurchases.sort((a, b) => Number(b.timestamp - a.timestamp));
      setPurchases(processedPurchases);
    }
  }, [batchPurchases, purchaseIds]);

  const handleRefresh = () => {
    refetchIds();
    refetchBatch();
  };

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  const getStatusBadge = (purchase: Purchase) => {
    if (purchase.fulfilled) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
          ✅ Ready
        </span>
      );
    } else {
      const timeSince = Date.now() / 1000 - Number(purchase.timestamp);
      if (timeSince > 3600) {
        // 1 hour
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
            ⚠️ Timeout
          </span>
        );
      }
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
          ⏳ Pending
        </span>
      );
    }
  };

  if (!isConnected) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">
            Connect your wallet to view purchase history
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">🎁 Purchase History</h2>
        <Button onClick={handleRefresh} className="px-3 py-1.5 text-xs">
          🔄 Refresh
        </Button>
      </div>

      {/* Purchases List */}
      {purchases.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 mb-2 text-sm">No purchases yet</p>
          <p className="text-xs text-gray-400">
            Make your first purchase to see it here!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map((purchase) => (
            <div
              key={purchase.requestId.toString()}
              className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold mb-1">
                    {TIER_NAMES[purchase.tier]} Wallet
                  </h3>
                  <p className="text-sm text-gray-500">
                    Request ID: {purchase.requestId.toString()}
                  </p>
                </div>
                {getStatusBadge(purchase)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Price Paid</p>
                  <p className="font-semibold">
                    ${Number(formatUnits(purchase.pricePaid, 6))} USDC
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Tier</p>
                  <p className="font-semibold">{TIER_NAMES[purchase.tier]}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Timestamp</p>
                  <p className="font-semibold text-xs">
                    {formatTimestamp(purchase.timestamp)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Status</p>
                  <p className="font-semibold">
                    {purchase.fulfilled ? "Fulfilled" : "Awaiting VRF"}
                  </p>
                </div>
              </div>

              {purchase.fulfilled && purchase.randomWords.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 mb-2">Randomness:</p>
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                    {purchase.randomWords[0].toString()}
                  </p>
                  <Button
                    onClick={() => {
                      // Navigate to wallet retrieval
                      window.location.hash = `#wallet-${purchase.requestId}`;
                    }}
                    className="mt-3 w-full"
                  >
                    🔓 Retrieve Wallet
                  </Button>
                </div>
              )}

              {!purchase.fulfilled && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500">
                    ⏱️ Waiting for Chainlink VRF to generate your wallet...
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    This usually takes 1-2 minutes. Refresh to check status.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">
          ℹ️ About Purchase Status
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>
            • <strong>Pending</strong>:
          </li>
          <li>
            • <strong>Ready</strong>: Your wallet is funded and ready to
            retrieve
          </li>
          <li>
            • <strong>Timeout</strong>: VRF took too long, contact support for
            manual fulfillment
          </li>
        </ul>
      </div>
    </div>
  );
}
