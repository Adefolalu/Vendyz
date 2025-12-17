"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { useSendCalls, useCallsStatus } from "wagmi";
import { formatUnits, parseUnits, encodeFunctionData } from "viem";
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
  isContinuous: boolean;
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
  const [isContinuous, setIsContinuous] = useState(true);

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

  // Batch transaction hooks
  const {
    sendCalls,
    data: callsId,
    isPending: isCallsPending,
  } = useSendCalls();

  const { data: callsStatus } = useCallsStatus({
    id: typeof callsId === "string" ? callsId : (callsId?.id ?? ""),
    query: {
      enabled: Boolean(typeof callsId === "string" ? callsId : callsId?.id),
      refetchInterval: (data) =>
        data.state.data?.status === "pending" ? 500 : false,
    },
  });

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

  // Track batch transaction status
  useEffect(() => {
    if (callsStatus?.status === "success") {
      setSelectedRaffle(null);
      setTicketAmount("1");
      refetchRaffles();
      // Assuming we can track it, but callsId is not a hash.
      // We might need to adjust tracking logic if it strictly expects 0x hash.
      // For now, we'll just rely on the UI state updates.
    }
  }, [callsStatus, refetchRaffles]);

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
          isContinuous,
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

  const handleBuyWithBatch = async () => {
    if (!selectedRaffle || !ticketAmount) return;
    const raffle = raffles.find((r) => r.raffleId === selectedRaffle);
    if (!raffle) return;

    try {
      const totalCost = raffle.ticketPrice * BigInt(ticketAmount);

      // 1. Approve Call
      const approveCall = {
        to: USDC_ADDRESS as `0x${string}`,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [RaffleManagerAddress as `0x${string}`, totalCost],
        }),
        value: BigInt(0),
      };

      // 2. Buy Tickets Call
      const buyCall = {
        to: RaffleManagerAddress as `0x${string}`,
        data: encodeFunctionData({
          abi: RaffleManagerAbi,
          functionName: "buyTickets",
          args: [selectedRaffle, BigInt(ticketAmount)],
        }),
        value: BigInt(0),
      };

      sendCalls({
        calls: [approveCall, buyCall],
      });
    } catch (error) {
      console.error("Batch transaction failed:", error);
      showError(
        "Transaction Failed",
        "Failed to send batch transaction",
        undefined
      );
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
    const now = Math.floor(Date.now() / 1000);
    const hasEnded = Number(raffle.endTime) <= now;
    const meetsMinTickets = raffle.ticketsSold >= raffle.minTickets;
    return (
      !raffle.completed && !raffle.cancelled && hasEnded && meetsMinTickets
    );
  };

  const selectedRaffleData = raffles.find((r) => r.raffleId === selectedRaffle);

  return (
    <div className="w-full max-w-3xl mx-auto p-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            🎄 Raffle Manager
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Create your own raffle or join existing ones to win big!
          </p>
        </div>
        {isConnected && raffles.length === 0 && (
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            fullWidth={false}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
              showCreateForm
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                : "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
            }`}
          >
            {showCreateForm ? "Cancel" : "+ Create Raffle"}
          </Button>
        )}
      </div>

      {/* Notifications Area */}
      <div className="space-y-4">
        {isCreateSuccess && (
          <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <span className="text-xl">🎉</span>
            <div>
              <p className="font-bold">Raffle Created!</p>
              <p className="text-sm opacity-90">
                Your raffle is now live and ready for participants.
              </p>
            </div>
          </div>
        )}

        {isBuySuccess && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <span className="text-xl">🎫</span>
            <div>
              <p className="font-bold">Tickets Purchased!</p>
              <p className="text-sm opacity-90">
                Good luck! You can view your tickets in the dashboard.
              </p>
            </div>
          </div>
        )}

        {isFinalizeSuccess && (
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <span className="text-xl">🏆</span>
            <div>
              <p className="font-bold">Raffle Finalized!</p>
              <p className="text-sm opacity-90">
                A winner has been selected and funds distributed.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Raffle Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400 text-sm">
              1
            </span>
            Configure Raffle
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="col-span-full">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Prize Token Address
              </label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">
                The ERC20 token users will pay with (e.g. USDC)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Ticket Price
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                />
                <span className="absolute left-3 top-3.5 text-gray-400">$</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Duration (Days)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Min Tickets
              </label>
              <input
                type="number"
                value={minTickets}
                onChange={(e) => setMinTickets(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Max Tickets
              </label>
              <input
                type="number"
                value={maxTickets}
                onChange={(e) => setMaxTickets(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="col-span-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <input
                type="checkbox"
                checked={isContinuous}
                onChange={(e) => setIsContinuous(e.target.checked)}
                className="w-5 h-5 text-green-600 rounded focus:ring-green-500 border-gray-300"
              />
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white">
                  Continuous Raffle
                </label>
                <p className="text-xs text-gray-500">
                  Automatically start a new raffle with same settings when this
                  one ends.
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleCreateRaffle}
            disabled={isCreatePending || isCreateConfirming}
            className="w-full py-4 text-base font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-600/20 rounded-xl"
          >
            {isCreatePending || isCreateConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Creating Raffle...
              </span>
            ) : (
              "Launch Raffle 🚀"
            )}
          </Button>
        </div>
      )}

      {/* Active Raffles Grid */}
      {!isConnected ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-4">👛</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Connect Wallet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            Connect your wallet to view active raffles and buy tickets.
          </p>
        </div>
      ) : activeRaffleIds === undefined ? (
        <div className="grid grid-cols-1 gap-6">
          <RaffleCardSkeleton />
        </div>
      ) : raffles.length === 0 ? (
        <div className="text-center py-16 bg-green-50 dark:bg-green-900/10 rounded-3xl border-2 border-dashed border-green-200 dark:border-green-800">
          <div className="text-4xl mb-4">🎄</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            No Active Raffles
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-6">
            The holiday season is quiet right now. Be the first to start the
            fun!
          </p>
          <Button
            onClick={() => setShowCreateForm(true)}
            fullWidth={false}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Create First Raffle
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {raffles.map((raffle) => {
            const progress = calculateProgress(raffle);
            const isCreator =
              address?.toLowerCase() === raffle.creator.toLowerCase();
            const canFinalizeRaffle = canFinalize(raffle);
            const prizePool = Number(formatUnits(raffle.prizePool, 6));
            const ticketPrice = Number(formatUnits(raffle.ticketPrice, 6));

            return (
              <div
                key={raffle.raffleId.toString()}
                className="group relative bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border-4 border-green-100 dark:border-green-900/30 transition-all duration-300 hover:scale-[1.01]"
              >
                {/* Badge */}
                <div className="absolute top-6 right-6 flex gap-2">
                  {isCreator && (
                    <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full">
                      Owner
                    </span>
                  )}
                  <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-full">
                    #{raffle.raffleId.toString()}
                  </span>
                </div>

                {/* Header */}
                <div className="mb-8">
                  <div className="text-sm font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
                    Current Prize Pool
                  </div>
                  <div className="text-6xl font-black text-gray-900 dark:text-white tracking-tighter">
                    ${prizePool.toLocaleString()}
                    <span className="text-2xl font-bold text-gray-400 ml-2">
                      USDC
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                      ✨ 90% to Winner
                    </span>
                    <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                      🏠 10% House Fee
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-8">
                  <div className="flex justify-between text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">
                    <span>Progress</span>
                    <span className="text-gray-900 dark:text-white">
                      {raffle.ticketsSold.toString()} /{" "}
                      {raffle.maxTickets.toString()} Tickets
                    </span>
                  </div>
                  <div className="h-6 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 transition-all duration-500 ease-out relative"
                      style={{ width: `${Math.max(2, progress)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-right text-emerald-600 dark:text-emerald-400 font-bold">
                    {progress.toFixed(0)}% Sold
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Ticket Price
                    </div>
                    <div className="text-3xl font-black text-gray-900 dark:text-white">
                      ${ticketPrice}
                    </div>
                  </div>
                  <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Ends In
                    </div>
                    <div className="text-3xl font-black text-gray-900 dark:text-white">
                      {formatTimeRemaining(raffle.endTime)}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                {canFinalizeRaffle ? (
                  <Button
                    onClick={() => handleFinalizeRaffle(raffle.raffleId)}
                    disabled={isFinalizePending || isFinalizeConfirming}
                    className="w-full py-5 text-xl bg-purple-600 hover:bg-purple-700 text-white shadow-xl shadow-purple-600/20 rounded-2xl font-black"
                  >
                    {isFinalizePending || isFinalizeConfirming
                      ? "Finalizing..."
                      : "🏆 Finalize Raffle"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setSelectedRaffle(raffle.raffleId)}
                    disabled={raffle.completed || raffle.cancelled}
                    className="w-full py-5 text-xl bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 dark:text-black text-white shadow-xl rounded-2xl font-black transition-transform active:scale-95"
                  >
                    Buy Tickets 🎫
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Buy Tickets Modal */}
      {selectedRaffle && selectedRaffleData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🎫
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Buy Tickets
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Raffle #{selectedRaffle.toString()}
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  How many tickets?
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() =>
                      setTicketAmount(
                        Math.max(1, Number(ticketAmount) - 1).toString()
                      )
                    }
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg font-bold hover:bg-gray-200 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={ticketAmount}
                    onChange={(e) => setTicketAmount(e.target.value)}
                    className="flex-1 text-center py-2 bg-transparent text-gray-900 dark:text-white text-2xl font-bold outline-none border-b-2 border-gray-200 focus:border-green-500 transition-colors"
                    min="1"
                    max="100"
                  />
                  <button
                    onClick={() =>
                      setTicketAmount(
                        Math.min(100, Number(ticketAmount) + 1).toString()
                      )
                    }
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg font-bold hover:bg-gray-200 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">
                  Total Cost
                </span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  $
                  {(
                    Number(ticketAmount) *
                    Number(formatUnits(selectedRaffleData.ticketPrice, 6))
                  ).toLocaleString()}{" "}
                  USDC
                </span>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleBuyWithBatch}
                  disabled={isCallsPending || callsStatus?.status === "pending"}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-600/20"
                >
                  {isCallsPending || callsStatus?.status === "pending"
                    ? "Processing..."
                    : `Buy ${ticketAmount} Ticket(s)`}
                </Button>

                <button
                  onClick={() => {
                    setSelectedRaffle(null);
                    setTicketAmount("1");
                  }}
                  className="w-full py-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-12 border-t border-gray-200 dark:border-gray-800 pt-8">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
          How it works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
              1
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create a raffle with your own rules: ticket price, duration, and
              wallet value.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm shrink-0">
              2
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Participants buy tickets. Each ticket is a chance to win a
              pre-funded wallet.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm shrink-0">
              3
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Winner is selected randomly on-chain. They receive a wallet funded
              with tokens worth the total value.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
