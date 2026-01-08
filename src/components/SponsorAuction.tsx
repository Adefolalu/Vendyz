"use client";

import { useState, useEffect, type ReactElement } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { SponsorAunctionAbi, SponsorAunctionAddress } from "~/lib/constants";
import { formatUnits, parseUnits } from "viem";
import { Button } from "./ui/Button";
import { parseContractError, validateAuctionBid } from "~/lib/errorHandler";
import { showError } from "~/components/ErrorToast";
import {
  trackTransaction,
  updateTransactionStatus,
} from "~/components/TransactionTracker";
import { AuctionCardSkeleton } from "~/components/LoadingSkeletons";

// USDC on Base mainnet
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Helper component to display token symbol
function TokenSymbol({ address }: { address: string }) {
  const { data: symbol } = useReadContract({
    address: address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  return (
    <span className="font-medium">
      {symbol
        ? String(symbol)
        : `${address.slice(0, 6)}...${address.slice(-4)}`}
    </span>
  );
}

export function SponsorAuction(): ReactElement | null {
  const { address, isConnected } = useAccount();
  const [tokenAddress, setTokenAddress] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [showBidForm, setShowBidForm] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);

  // Read current auction
  const {
    data: currentAuction,
    isLoading,
    refetch: refetchAuction,
  } = useReadContract({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    functionName: "getCurrentAuction",
  });

  // Read active sponsors
  const { data: activeSponsors } = useReadContract({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    functionName: "getActiveSponsors",
  }) as { data: readonly string[] | undefined };

  // Read current bids
  const { data: currentBids, refetch: refetchBids } = useReadContract({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    functionName: "getCurrentBids",
  }) as { data: readonly any[] | undefined; refetch: any };

  // Read user's bid amount
  const { data: userBid } = useReadContract({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    functionName: "getUserBid",
    args: address ? [address] : undefined,
  }) as { data: bigint | undefined };

  // Read time remaining
  const { data: timeRemaining, refetch: refetchTime } = useReadContract({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    functionName: "getTimeRemaining",
  });

  // Read USDC allowance
  const { data: usdcAllowance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      address && SponsorAunctionAddress
        ? [address, SponsorAunctionAddress as `0x${string}`]
        : undefined,
  });

  // Read Token Symbol for input
  const { data: inputTokenSymbol } = useReadContract({
    address: (tokenAddress as `0x${string}`) || undefined,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: {
      enabled:
        !!tokenAddress &&
        tokenAddress.startsWith("0x") &&
        tokenAddress.length === 42,
    },
  });

  // Write hooks
  const {
    data: bidHash,
    writeContract: writeBid,
    isPending: isBidPending,
  } = useWriteContract();

  const {
    data: approvalHash,
    writeContract: writeApproval,
    isPending: isApprovalPending,
  } = useWriteContract();

  const {
    data: finalizeHash,
    writeContract: writeFinalize,
    isPending: isFinalizePending,
  } = useWriteContract();

  // Transaction Receipt hooks
  const { isLoading: isBidConfirming, isSuccess: isBidSuccess } =
    useWaitForTransactionReceipt({ hash: bidHash });

  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } =
    useWaitForTransactionReceipt({ hash: approvalHash });

  const { isLoading: isFinalizeConfirming, isSuccess: isFinalizeSuccess } =
    useWaitForTransactionReceipt({ hash: finalizeHash });

  // Track transaction statuses
  useEffect(() => {
    if (bidHash) {
      if (!isBidConfirming && !isBidSuccess) {
        trackTransaction(bidHash, `Sponsor Bid $${bidAmount}`);
      } else if (isBidConfirming) {
        updateTransactionStatus(bidHash, "confirming");
      } else if (isBidSuccess) {
        updateTransactionStatus(bidHash, "success");
      }
    }
  }, [bidHash, isBidConfirming, isBidSuccess, bidAmount]);

  useEffect(() => {
    if (finalizeHash) {
      if (!isFinalizeConfirming && !isFinalizeSuccess) {
        trackTransaction(finalizeHash, "Finalizing Auction");
      } else if (isFinalizeConfirming) {
        updateTransactionStatus(finalizeHash, "confirming");
      } else if (isFinalizeSuccess) {
        updateTransactionStatus(finalizeHash, "success");
      }
    }
  }, [finalizeHash, isFinalizeConfirming, isFinalizeSuccess]);

  // Check approval
  useEffect(() => {
    if (bidAmount && usdcAllowance !== undefined) {
      try {
        const amountBigInt = parseUnits(bidAmount, 6);
        setNeedsApproval(usdcAllowance < amountBigInt);
      } catch (e) {
        // invalid input
      }
    }
  }, [bidAmount, usdcAllowance]);

  // Refresh on success
  useEffect(() => {
    if (isBidSuccess || isFinalizeSuccess) {
      refetchAuction();
      refetchBids();
      refetchTime();
      if (isBidSuccess) {
        setShowBidForm(false);
        setBidAmount("");
        setTokenAddress("");
      }
    }
  }, [
    isBidSuccess,
    isFinalizeSuccess,
    refetchAuction,
    refetchBids,
    refetchTime,
  ]);

  const handleApprove = async () => {
    if (!bidAmount) return;
    try {
      const amountBigInt = parseUnits(bidAmount, 6);
      writeApproval({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [
          SponsorAunctionAddress as `0x${string}`,
          amountBigInt * BigInt(10),
        ],
      });
    } catch (error: any) {
      const errorMsg = parseContractError(error);
      showError(errorMsg.title, errorMsg.message, errorMsg.action);
    }
  };

  const handlePlaceBid = async () => {
    const validationError = validateAuctionBid(
      tokenAddress,
      bidAmount,
      isConnected,
      usdcAllowance as bigint | undefined,
      userBid as bigint | undefined
    );

    if (validationError) {
      showError(
        validationError.title,
        validationError.message,
        validationError.action
      );
      return;
    }

    try {
      const amountBigInt = parseUnits(bidAmount, 6);
      writeBid({
        address: SponsorAunctionAddress as `0x${string}`,
        abi: SponsorAunctionAbi,
        functionName: "placeBid",
        args: [tokenAddress as `0x${string}`, amountBigInt],
      });
    } catch (error: any) {
      const errorMsg = parseContractError(error);
      showError(errorMsg.title, errorMsg.message, errorMsg.action);
    }
  };

  const handleFinalize = async () => {
    try {
      writeFinalize({
        address: SponsorAunctionAddress as `0x${string}`,
        abi: SponsorAunctionAbi,
        functionName: "finalizeAuction",
      });
    } catch (error: any) {
      const errorMsg = parseContractError(error);
      showError(errorMsg.title, errorMsg.message, errorMsg.action);
    }
  };

  if (isLoading) return <AuctionCardSkeleton />;
  if (!currentAuction) return null;

  const auction = currentAuction as {
    auctionId: bigint;
    startTime: bigint;
    endTime: bigint;
    availableSlots: bigint;
    winners: readonly string[];
    winningBids: readonly bigint[];
    finalized: boolean;
  };

  const now = Math.floor(Date.now() / 1000);
  const timeLeft = Number(auction.endTime) - now;
  const isEnded = timeLeft <= 0;

  // Format days/hours
  const daysLeft = Math.max(0, Math.floor(timeLeft / 86400));
  const hoursLeft = Math.max(0, Math.floor((timeLeft % 86400) / 3600));
  const minsLeft = Math.max(0, Math.floor((timeLeft % 3600) / 60));

  // Process bids for leaderboard
  const processedBids = (currentBids || [])
    .filter((b: any) => b.active)
    .sort((a: any, b: any) => Number(b.amount) - Number(a.amount));

  return (
    <div className="w-full max-w-3xl mx-auto p-4 space-y-8">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 dark:bg-orange-900/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent flex items-center gap-2">
              🎅 Sponsor Auction{" "}
              <span className="text-sm px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full border border-orange-200 dark:border-orange-800">
                #{auction.auctionId.toString()}
              </span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Top 5 bidders get their tokens included in every wallet for 7
              days.
            </p>
          </div>

          <div className="text-right bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="text-xs text-gray-500 uppercase font-semibold">
              Time Remaining
            </div>
            <div className="text-xl font-bold font-mono text-orange-600 dark:text-orange-400">
              {isEnded ? (
                <span className="text-green-600">Ended</span>
              ) : (
                <>
                  {daysLeft}d {hoursLeft}h {minsLeft}m
                </>
              )}
            </div>
          </div>
        </div>

        {isEnded && !auction.finalized && (
          <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <span>⚠️</span>
              <span className="font-medium">Auction has ended!</span>
            </div>
            <Button
              onClick={handleFinalize}
              disabled={isFinalizePending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isFinalizePending ? "Finalizing..." : "Finalize & Settle"}
            </Button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 mb-1">Available Slots</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {Number(auction.availableSlots)} / 5
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 mb-1">Min Bid</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            $100 USDC
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 mb-1">Total Bids</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {processedBids.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 mb-1">Your Bid</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {userBid ? `$${formatUnits(userBid, 6)}` : "-"}
          </p>
        </div>
      </div>

      {/* Main Content Area: Leaderboard + Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Left Col: Leaderboard */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              🏆 Live Leaderboard
            </h3>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Top 5 Win
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {processedBids.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-4xl mb-2">🎲</p>
                <p>No bids yet. Be the first!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {processedBids.map((bid, index) => {
                  const isWinning = index < 5;
                  const isMe =
                    address &&
                    bid.bidder.toLowerCase() === address.toLowerCase();

                  return (
                    <div
                      key={`${bid.bidder}-${index}`}
                      className={`p-4 flex items-center justify-between ${isMe ? "bg-orange-50 dark:bg-orange-900/10" : ""}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isWinning ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700"}`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            <TokenSymbol address={bid.tokenAddress} />
                            {isMe && (
                              <span className="text-xs bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            by {bid.bidder.slice(0, 6)}...{bid.bidder.slice(-4)}
                          </div>
                        </div>
                      </div>
                      <div className="font-bold text-gray-900 dark:text-white">
                        ${formatUnits(bid.amount, 6)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Current Active Sponsors */}
          {activeSponsors && activeSponsors.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">
                Current Active Sponsors
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeSponsors.map((sponsor, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-2 shadow-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <TokenSymbol address={sponsor} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Action Card */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 sticky top-4">
            <h3 className="text-lg font-bold mb-4">Place Your Bid</h3>

            {!isConnected ? (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-4">
                  Connect wallet to participate
                </p>
              </div>
            ) : isEnded ? (
              <div className="text-center py-6 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <p className="text-gray-500">Auction has ended.</p>
                {auction.finalized ? (
                  <p className="text-green-600 font-medium mt-1">
                    Winners selected!
                  </p>
                ) : (
                  <p className="text-orange-600 font-medium mt-1">
                    Waiting for finalization...
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    Token to Sponsor
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={tokenAddress}
                      onChange={(e) => setTokenAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full pl-3 pr-16 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    {inputTokenSymbol && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded">
                        {String(inputTokenSymbol)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Enter the address of the ERC20 token you want to promote.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    Bid Amount (USDC)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="Min 100"
                      className="w-full pl-7 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                  {userBid && Number(userBid) > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      Current bid: ${formatUnits(userBid, 6)} (+$5 min increase)
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  {needsApproval ? (
                    <Button
                      onClick={handleApprove}
                      disabled={
                        isApprovalPending || isApprovalConfirming || !bidAmount
                      }
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      {isApprovalPending || isApprovalConfirming
                        ? "Approving..."
                        : "Approve USDC"}
                    </Button>
                  ) : (
                    <Button
                      onClick={handlePlaceBid}
                      disabled={
                        isBidPending ||
                        isBidConfirming ||
                        !tokenAddress ||
                        !bidAmount
                      }
                      className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg shadow-orange-600/20"
                    >
                      {isBidPending || isBidConfirming
                        ? "Placing Bid..."
                        : "Place Bid 🚀"}
                    </Button>
                  )}
                </div>

                {isBidSuccess && (
                  <div className="text-xs text-center text-green-600 bg-green-50 p-2 rounded-lg">
                    Bid placed successfully!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
