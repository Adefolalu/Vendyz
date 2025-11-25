"use client";

import { useState, useEffect } from "react";
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
] as const;

export function SponsorAuction() {
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
  });

  // Read current bids
  const { data: currentBids } = useReadContract({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    functionName: "getCurrentBids",
  });

  // Read user's bid
  const { data: userBid } = useReadContract({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    functionName: "getUserBid",
    args: address ? [address] : undefined,
  });

  // Read time remaining
  const { data: timeRemaining } = useReadContract({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    functionName: "getTimeRemaining",
  });

  // Read highest bid
  const { data: highestBid } = useReadContract({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    functionName: "getHighestCurrentBid",
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

  // Contract write hooks
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

  const { isLoading: isBidConfirming, isSuccess: isBidSuccess } =
    useWaitForTransactionReceipt({
      hash: bidHash,
    });

  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } =
    useWaitForTransactionReceipt({
      hash: approvalHash,
    });

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
    if (approvalHash) {
      if (!isApprovalConfirming && !isApprovalSuccess) {
        trackTransaction(approvalHash, "USDC Approval for Bid");
      } else if (isApprovalConfirming) {
        updateTransactionStatus(approvalHash, "confirming");
      } else if (isApprovalSuccess) {
        updateTransactionStatus(approvalHash, "success");
      }
    }
  }, [approvalHash, isApprovalConfirming, isApprovalSuccess]);

  // Check if approval is needed
  useEffect(() => {
    if (bidAmount && usdcAllowance !== undefined) {
      const amountBigInt = parseUnits(bidAmount, 6);
      setNeedsApproval(usdcAllowance < amountBigInt);
    }
  }, [bidAmount, usdcAllowance]);

  // Refresh auction after successful bid
  useEffect(() => {
    if (isBidSuccess) {
      refetchAuction();
      setShowBidForm(false);
      setBidAmount("");
      setTokenAddress("");
    }
  }, [isBidSuccess, refetchAuction]);

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
    // Client-side validation
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

  if (isLoading) {
    return <AuctionCardSkeleton />;
  }

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
  const daysLeft = Math.floor(timeLeft / 86400);
  const hoursLeft = Math.floor((timeLeft % 86400) / 3600);

  return (
    <div
      className="w-full p-6 rounded-lg border-2"
      style={{
        backgroundColor: "#EEFFBE",
        borderColor: "#c8d99a",
        color: "#000000",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          🏆 Sponsor Auction
        </h2>
        <span className="text-sm font-semibold px-3 py-1 bg-orange-600 text-white rounded-full">
          #{auction.auctionId.toString()}
        </span>
      </div>

      {/* Time Remaining */}
      <div
        className="mb-4 p-4 rounded-lg"
        style={{ backgroundColor: "#f5ffdb", color: "#000000" }}
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Time Remaining
        </p>
        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
          {daysLeft}d {hoursLeft}h
        </p>
      </div>

      {/* Auction Info */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div
          className="p-3 rounded"
          style={{ backgroundColor: "#f5ffdb", color: "#000000" }}
        >
          <p className="text-gray-600 dark:text-gray-400 mb-1">
            Available Slots
          </p>
          <p className="font-bold">{auction.availableSlots.toString()} / 5</p>
        </div>
        <div
          className="p-3 rounded"
          style={{ backgroundColor: "#f5ffdb", color: "#000000" }}
        >
          <p className="text-gray-600 dark:text-gray-400 mb-1">Min Bid</p>
          <p className="font-bold">$100 USDC</p>
        </div>
      </div>

      {/* Active Sponsors */}
      {activeSponsors &&
        Array.isArray(activeSponsors) &&
        (activeSponsors as string[]).length > 0 && (
          <div
            className="mb-4 p-4 rounded-lg"
            style={{ backgroundColor: "#f5ffdb", color: "#000000" }}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Active Sponsors ({(activeSponsors as string[]).length}/5)
            </p>
            <div className="space-y-1">
              {(activeSponsors as string[]).slice(0, 5).map((sponsor, idx) => (
                <div key={idx} className="text-xs font-mono truncate">
                  {String(sponsor)}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* User's Current Bid */}
      {isConnected && userBid && Number(userBid) > 0 && (
        <div
          className="mb-4 p-4 rounded-lg"
          style={{
            backgroundColor: "#e8f5d0",
            border: "2px solid #d4e7a0",
            color: "#000000",
          }}
        >
          <p className="text-sm text-blue-900 dark:text-blue-300 mb-1">
            Your Current Bid
          </p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
            ${Number(formatUnits(userBid as bigint, 6))} USDC
          </p>
        </div>
      )}

      {/* Highest Bid */}
      {highestBid && Number(highestBid) > 0 && (
        <div
          className="mb-4 p-3 rounded-lg"
          style={{ backgroundColor: "#f5ffdb", color: "#000000" }}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Highest Bid
          </p>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
            ${Number(formatUnits(highestBid as bigint, 6))} USDC
          </p>
        </div>
      )}

      {/* Success Messages */}
      {isBidSuccess && (
        <div
          className="mb-4 px-4 py-3 rounded"
          style={{
            backgroundColor: "#d4e7a0",
            border: "2px solid #b8d47a",
            color: "#000000",
          }}
        >
          <p className="font-bold">Bid Placed Successfully! 🎉</p>
        </div>
      )}

      {isApprovalSuccess && (
        <div
          className="mb-4 px-4 py-3 rounded"
          style={{
            backgroundColor: "#e8f5d0",
            border: "2px solid #d4e7a0",
            color: "#000000",
          }}
        >
          <p className="font-bold">Approval Successful! ✅</p>
          <p className="text-sm">You can now place your bid.</p>
        </div>
      )}

      {/* Bid Form */}
      {showBidForm && isConnected ? (
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Token Address
            </label>
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-orange-500 dark:bg-gray-800 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              The ERC20 token you want to sponsor
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Bid Amount (USDC)
            </label>
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="Min $100"
              min="100"
              step="5"
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-orange-500 dark:bg-gray-800 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum $100, increments of $5
            </p>
          </div>

          <div className="flex gap-2">
            {needsApproval ? (
              <Button
                onClick={handleApprove}
                disabled={
                  isApprovalPending || isApprovalConfirming || !bidAmount
                }
                className="flex-1"
              >
                {isApprovalPending || isApprovalConfirming ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Approving...
                  </span>
                ) : (
                  "Approve USDC"
                )}
              </Button>
            ) : (
              <Button
                onClick={handlePlaceBid}
                disabled={
                  isBidPending || isBidConfirming || !tokenAddress || !bidAmount
                }
                className="flex-1"
              >
                {isBidPending || isBidConfirming ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Bidding...
                  </span>
                ) : (
                  "Place Bid"
                )}
              </Button>
            )}
            <Button
              onClick={() => setShowBidForm(false)}
              className="px-6 bg-gray-500 hover:bg-gray-600"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Win a spot to have your token included in every wallet for 30 days.
            Top 5 bidders win!
          </p>

          {!isConnected ? (
            <p className="text-center text-gray-500 py-3">
              Connect wallet to place a bid
            </p>
          ) : (
            <Button
              onClick={() => setShowBidForm(true)}
              className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 font-semibold"
            >
              Place Bid 💰
            </Button>
          )}
        </div>
      )}

      {/* Info */}
      <div
        className="mt-4 p-3 rounded text-xs"
        style={{
          backgroundColor: "#f5ffdb",
          border: "2px solid #e0f0a0",
          color: "#000000",
          opacity: 0.9,
        }}
      >
        <p className="font-semibold mb-1">📋 Auction Rules:</p>
        <ul className="space-y-1 ml-4">
          <li>• Minimum bid: $100 USDC</li>
          <li>• Bid increments: $5 USDC</li>
          <li>• Top 5 bidders win sponsorship slots</li>
          <li>• Duration: 7 days, auto-renews</li>
          <li>• You can update your bid anytime</li>
        </ul>
      </div>
    </div>
  );
}
