"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { RaffleManagerAbi, RaffleManagerAddress } from "~/lib/constants";
import { Button } from "./ui/Button";
import {
  parseContractError,
  validateRafflePurchase,
  validateRaffleCreation,
} from "~/lib/errorHandler";
import { showError } from "./ErrorToast";
import {
  trackTransaction,
  updateTransactionStatus,
} from "./TransactionTracker";
import { RaffleCardSkeleton } from "./LoadingSkeletons";

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

interface Raffle {
  raffleId: bigint;
  creator: string;
  tokenAddress: string;
  ticketPrice: bigint;
  maxTickets: bigint;
  minTickets: bigint;
  ticketsSold: bigint;
  prizePool: bigint;
  winner: string;
  completed: boolean;
  cancelled: boolean;
  startTime: bigint;
  endTime: bigint;
  duration: bigint;
}

export function RaffleManager() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRaffle, setSelectedRaffle] = useState<bigint | null>(null);
  const [raffles, setRaffles] = useState<Raffle[]>([]);

  // Create form state
  const [tokenAddress, setTokenAddress] = useState(USDC_ADDRESS);
  const [ticketPrice, setTicketPrice] = useState("1");
  const [maxTickets, setMaxTickets] = useState("100");
  const [minTickets, setMinTickets] = useState("10");
  const [duration, setDuration] = useState("7");

  // Buy tickets state
  const [ticketAmount, setTicketAmount] = useState("1");
  const [needsApproval, setNeedsApproval] = useState(false);

  // Read active raffle IDs
  const { data: activeRaffleIds, refetch: refetchRaffles } = useReadContract({
    address: RaffleManagerAddress as `0x${string}`,
    abi: RaffleManagerAbi,
    functionName: "getActiveRaffles",
  });

  // Contract write hooks
  const {
    data: createHash,
    writeContract: writeCreate,
    isPending: isCreatePending,
  } = useWriteContract();
  const {
    data: buyHash,
    writeContract: writeBuy,
    isPending: isBuyPending,
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

  const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess } =
    useWaitForTransactionReceipt({
      hash: createHash,
    });

  const { isLoading: isBuyConfirming, isSuccess: isBuySuccess } =
    useWaitForTransactionReceipt({
      hash: buyHash,
    });

  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } =
    useWaitForTransactionReceipt({
      hash: approvalHash,
    });

  const { isLoading: isFinalizeConfirming, isSuccess: isFinalizeSuccess } =
    useWaitForTransactionReceipt({
      hash: finalizeHash,
    });

  // Read USDC allowance
  const { data: usdcAllowance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      address && RaffleManagerAddress
        ? [address, RaffleManagerAddress as `0x${string}`]
        : undefined,
  });

  // Fetch raffle details for each active raffle
  useEffect(() => {
    if (!activeRaffleIds || !Array.isArray(activeRaffleIds) || !publicClient)
      return;

    const fetchRaffles = async () => {
      const rafflePromises = (activeRaffleIds as bigint[]).map(async (id) => {
        try {
          const data = await publicClient.readContract({
            address: RaffleManagerAddress as `0x${string}`,
            abi: RaffleManagerAbi,
            functionName: "getRaffle",
            args: [id],
          });
          return data as Raffle;
        } catch (error) {
          console.error(`Failed to fetch raffle ${id}`, error);
          return null;
        }
      });

      const fetchedRaffles = await Promise.all(rafflePromises);
      setRaffles(fetchedRaffles.filter((r): r is Raffle => r !== null));
    };

    fetchRaffles();
  }, [activeRaffleIds, publicClient]);

  // Check approval when buying tickets
  useEffect(() => {
    if (selectedRaffle && ticketAmount && usdcAllowance !== undefined) {
      const raffle = raffles.find((r) => r.raffleId === selectedRaffle);
      if (raffle) {
        const totalCost = raffle.ticketPrice * BigInt(ticketAmount);
        setNeedsApproval(usdcAllowance < totalCost);
      }
    }
  }, [selectedRaffle, ticketAmount, usdcAllowance, raffles]);

  // Reset forms after success
  useEffect(() => {
    if (isCreateSuccess) {
      setShowCreateForm(false);
      setTokenAddress(USDC_ADDRESS);
      setTicketPrice("1");
      setMaxTickets("100");
      setMinTickets("10");
      setDuration("7");
      refetchRaffles();
    }
  }, [isCreateSuccess, refetchRaffles]);

  useEffect(() => {
    if (isBuySuccess) {
      setSelectedRaffle(null);
      setTicketAmount("1");
      refetchRaffles();
    }
  }, [isBuySuccess, refetchRaffles]);

  useEffect(() => {
    if (isFinalizeSuccess) {
      refetchRaffles();
    }
  }, [isFinalizeSuccess, refetchRaffles]);

  // Track transaction statuses
  useEffect(() => {
    if (createHash) {
      if (!isCreateConfirming && !isCreateSuccess) {
        trackTransaction(createHash, "Creating Raffle");
      } else if (isCreateConfirming) {
        updateTransactionStatus(createHash, "confirming");
      } else if (isCreateSuccess) {
        updateTransactionStatus(createHash, "success");
      }
    }
  }, [createHash, isCreateConfirming, isCreateSuccess]);

  useEffect(() => {
    if (buyHash) {
      if (!isBuyConfirming && !isBuySuccess) {
        trackTransaction(buyHash, `Buying ${ticketAmount} Ticket(s)`);
      } else if (isBuyConfirming) {
        updateTransactionStatus(buyHash, "confirming");
      } else if (isBuySuccess) {
        updateTransactionStatus(buyHash, "success");
      }
    }
  }, [buyHash, isBuyConfirming, isBuySuccess, ticketAmount]);

  useEffect(() => {
    if (approvalHash) {
      if (!isApprovalConfirming && !isApprovalSuccess) {
        trackTransaction(approvalHash, "Approving USDC");
      } else if (isApprovalConfirming) {
        updateTransactionStatus(approvalHash, "confirming");
      } else if (isApprovalSuccess) {
        updateTransactionStatus(approvalHash, "success");
      }
    }
  }, [approvalHash, isApprovalConfirming, isApprovalSuccess]);

  useEffect(() => {
    if (finalizeHash) {
      if (!isFinalizeConfirming && !isFinalizeSuccess) {
        trackTransaction(finalizeHash, "Finalizing Raffle");
      } else if (isFinalizeConfirming) {
        updateTransactionStatus(finalizeHash, "confirming");
      } else if (isFinalizeSuccess) {
        updateTransactionStatus(finalizeHash, "success");
      }
    }
  }, [finalizeHash, isFinalizeConfirming, isFinalizeSuccess]);

  const handleCreateRaffle = async () => {
    if (
      !tokenAddress ||
      !ticketPrice ||
      !maxTickets ||
      !minTickets ||
      !duration
    )
      return;

    try {
      // Validate raffle parameters
      const validation = validateRaffleCreation(
        tokenAddress,
        ticketPrice,
        maxTickets,
        minTickets,
        duration,
        isConnected
      );
      if (validation) {
        showError(validation.title, validation.message, validation.action);
        return;
      }

      const durationSeconds = BigInt(Number(duration) * 86400); // days to seconds
      writeCreate({
        address: RaffleManagerAddress as `0x${string}`,
        abi: RaffleManagerAbi,
        functionName: "createRaffle",
        args: [
          tokenAddress as `0x${string}`,
          parseUnits(ticketPrice, 6),
          BigInt(maxTickets),
          BigInt(minTickets),
          durationSeconds,
        ],
      });
    } catch (error) {
      console.error("Create raffle failed:", error);
      const parsedError = parseContractError(error);
      showError(parsedError.title, parsedError.message, parsedError.action);
    }
  };

  const handleApprove = async () => {
    if (!selectedRaffle || !ticketAmount) return;
    const raffle = raffles.find((r) => r.raffleId === selectedRaffle);
    if (!raffle) return;

    try {
      const totalCost = raffle.ticketPrice * BigInt(ticketAmount);
      writeApproval({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [RaffleManagerAddress as `0x${string}`, totalCost * BigInt(10)],
      });
    } catch (error) {
      console.error("Approval failed:", error);
      const parsedError = parseContractError(error);
      showError(parsedError.title, parsedError.message, parsedError.action);
    }
  };

  const handleBuyTickets = async () => {
    if (!selectedRaffle || !ticketAmount) return;

    try {
      // Validate ticket purchase
      const raffle = raffles.find((r) => r.raffleId === selectedRaffle);
      const totalCost = raffle
        ? raffle.ticketPrice * BigInt(ticketAmount)
        : undefined;
      const validation = validateRafflePurchase(
        selectedRaffle,
        ticketAmount,
        isConnected,
        usdcAllowance as bigint | undefined,
        totalCost
      );
      if (validation) {
        showError(validation.title, validation.message, validation.action);
        return;
      }

      writeBuy({
        address: RaffleManagerAddress as `0x${string}`,
        abi: RaffleManagerAbi,
        functionName: "buyTickets",
        args: [selectedRaffle, BigInt(ticketAmount)],
      });
    } catch (error) {
      console.error("Buy tickets failed:", error);
      const parsedError = parseContractError(error);
      showError(parsedError.title, parsedError.message, parsedError.action);
    }
  };

  const handleFinalizeRaffle = async (raffleId: bigint) => {
    try {
      writeFinalize({
        address: RaffleManagerAddress as `0x${string}`,
        abi: RaffleManagerAbi,
        functionName: "finalizeRaffle",
        args: [raffleId],
      });
    } catch (error) {
      console.error("Finalize raffle failed:", error);
      const parsedError = parseContractError(error);
      showError(parsedError.title, parsedError.message, parsedError.action);
    }
  };

  const formatTimeRemaining = (endTime: bigint) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = Number(endTime) - now;

    if (remaining <= 0) return "Ended";

    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const calculateProgress = (raffle: Raffle) => {
    return (Number(raffle.ticketsSold) / Number(raffle.maxTickets)) * 100;
  };

  const canFinalize = (raffle: Raffle) => {
    if (!address || raffle.completed || raffle.cancelled) return false;
    if (raffle.creator.toLowerCase() !== address.toLowerCase()) return false;

    const now = Math.floor(Date.now() / 1000);
    const hasEnded = now >= Number(raffle.endTime);
    const isFilled = raffle.ticketsSold >= raffle.maxTickets;
    const meetsMinimum = raffle.ticketsSold >= raffle.minTickets;

    return (hasEnded || isFilled) && meetsMinimum;
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold mb-1">🎄 Raffle Manager</h1>
          <p className="text-gray-600 dark:text-gray-400 text-xs">
            Create raffles or buy tickets to win!
          </p>
        </div>
        {isConnected && (
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700"
          >
            {showCreateForm ? "Cancel" : "+ Create Raffle"}
          </Button>
        )}
      </div>

      {/* Success Messages */}
      {isCreateSuccess && (
        <div
          className="mb-6 px-4 py-3 rounded"
          style={{
            backgroundColor: "#d4e7a0",
            border: "2px solid #b8d47a",
            color: "#000000",
          }}
        >
          <p className="font-bold">Raffle Created Successfully! 🎉</p>
        </div>
      )}

      {isBuySuccess && (
        <div
          className="mb-6 px-4 py-3 rounded"
          style={{
            backgroundColor: "#d4e7a0",
            border: "2px solid #b8d47a",
            color: "#000000",
          }}
        >
          <p className="font-bold">Tickets Purchased! 🎫</p>
        </div>
      )}

      {isApprovalSuccess && (
        <div
          className="mb-6 px-4 py-3 rounded"
          style={{
            backgroundColor: "#e8f5d0",
            border: "2px solid #d4e7a0",
            color: "#000000",
          }}
        >
          <p className="font-bold">Approval Successful! ✅</p>
        </div>
      )}

      {isFinalizeSuccess && (
        <div
          className="mb-6 px-4 py-3 rounded"
          style={{
            backgroundColor: "#e0f0a0",
            border: "2px solid #c8d99a",
            color: "#000000",
          }}
        >
          <p className="font-bold">Raffle Finalized! Winner Selected! 🏆</p>
        </div>
      )}

      {/* Create Raffle Form */}
      {showCreateForm && (
        <div
          className="mb-8 p-6 border-2 rounded-lg"
          style={{
            backgroundColor: "#e8f5d0",
            borderColor: "#d4e7a0",
            color: "#000000",
          }}
        >
          <h3 className="text-xl font-bold mb-4">Create New Raffle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Prize Token Address
              </label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Ticket Price (USDC)
              </label>
              <input
                type="number"
                value={ticketPrice}
                onChange={(e) => setTicketPrice(e.target.value)}
                placeholder="1"
                min="1"
                step="0.1"
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Max Tickets
              </label>
              <input
                type="number"
                value={maxTickets}
                onChange={(e) => setMaxTickets(e.target.value)}
                placeholder="100"
                min="2"
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Min Tickets
              </label>
              <input
                type="number"
                value={minTickets}
                onChange={(e) => setMinTickets(e.target.value)}
                placeholder="10"
                min="2"
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Duration (Days)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="7"
                min="1"
                max="30"
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <Button
            onClick={handleCreateRaffle}
            disabled={isCreatePending || isCreateConfirming}
            className="w-full"
          >
            {isCreatePending || isCreateConfirming ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Creating...
              </span>
            ) : (
              "Create Raffle"
            )}
          </Button>
        </div>
      )}

      {/* Active Raffles */}
      {!isConnected ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Connect your wallet to view raffles</p>
        </div>
      ) : activeRaffleIds === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RaffleCardSkeleton />
          <RaffleCardSkeleton />
          <RaffleCardSkeleton />
          <RaffleCardSkeleton />
        </div>
      ) : raffles.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg"
          style={{ backgroundColor: "#f5ffdb", color: "#000000" }}
        >
          <p className="text-gray-500 mb-4">No active raffles</p>
          <p className="text-sm text-gray-400">Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {raffles.map((raffle) => {
            const progress = calculateProgress(raffle);
            const isCreator =
              address?.toLowerCase() === raffle.creator.toLowerCase();
            const canFinalizeRaffle = canFinalize(raffle);

            return (
              <div
                key={raffle.raffleId.toString()}
                className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold mb-1">
                      Raffle #{raffle.raffleId.toString()}
                    </h3>
                    {isCreator && (
                      <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">
                        Your Raffle
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                    {formatTimeRemaining(raffle.endTime)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      {raffle.ticketsSold.toString()} /{" "}
                      {raffle.maxTickets.toString()} tickets
                    </span>
                    <span className="font-semibold">
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Raffle Info */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Ticket Price</p>
                    <p className="font-semibold">
                      ${Number(formatUnits(raffle.ticketPrice, 6))} USDC
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Prize Pool</p>
                    <p className="font-semibold">
                      ${Number(formatUnits(raffle.prizePool, 6))} USDC
                    </p>
                  </div>
                </div>

                {/* Actions */}
                {canFinalizeRaffle ? (
                  <Button
                    onClick={() => handleFinalizeRaffle(raffle.raffleId)}
                    disabled={isFinalizePending || isFinalizeConfirming}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isFinalizePending || isFinalizeConfirming ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        Finalizing...
                      </span>
                    ) : (
                      "🏆 Finalize & Pick Winner"
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setSelectedRaffle(raffle.raffleId)}
                    disabled={raffle.completed || raffle.cancelled}
                    className="w-full"
                  >
                    🎫 Buy Tickets
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Buy Tickets Modal */}
      {selectedRaffle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              Buy Tickets - Raffle #{selectedRaffle.toString()}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Number of Tickets (Max 50)
              </label>
              <input
                type="number"
                value={ticketAmount}
                onChange={(e) => setTicketAmount(e.target.value)}
                placeholder="1"
                min="1"
                max="50"
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white"
              />
            </div>

            {needsApproval ? (
              <Button
                onClick={handleApprove}
                disabled={isApprovalPending || isApprovalConfirming}
                className="w-full mb-2"
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
                onClick={handleBuyTickets}
                disabled={isBuyPending || isBuyConfirming}
                className="w-full mb-2"
              >
                {isBuyPending || isBuyConfirming ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Buying...
                  </span>
                ) : (
                  "Buy Tickets"
                )}
              </Button>
            )}

            <Button
              onClick={() => {
                setSelectedRaffle(null);
                setTicketAmount("1");
              }}
              className="w-full bg-gray-500 hover:bg-gray-600"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div
        className="mt-8 p-4 rounded-lg"
        style={{
          backgroundColor: "#e8f5d0",
          border: "2px solid #d4e7a0",
          color: "#000000",
        }}
      >
        <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">
          ℹ️ How Raffles Work
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>• Anyone can create a raffle with custom parameters</li>
          <li>• Buy up to 50 tickets per raffle</li>
          <li>• Creator finalizes when time ends or tickets sell out</li>
          <li>• Chainlink VRF picks a provably fair winner</li>
          <li>• Winner gets the prize pool minus 10% house fee</li>
        </ul>
      </div>
    </div>
  );
}
