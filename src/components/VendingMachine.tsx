"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
  useConnect,
  useSendCalls,
  useCallsStatus,
} from "wagmi";
import { formatUnits, decodeEventLog, encodeFunctionData } from "viem";
import { VendingMachineAbi, VendingMachineAddress } from "~/lib/constants";
import { parseContractError, validatePurchase } from "~/lib/errorHandler";
import { showError } from "~/components/ErrorToast";
import {
  trackTransaction,
  updateTransactionStatus,
} from "~/components/TransactionTracker";
import { WalletPreparationModal } from "~/components/WalletPreparationModal";
import { VendingMachineAnimation } from "~/components/VendingMachineAnimation";
import { useTreasuryBalance } from "~/hooks/useTreasuryBalance";
import { Wallet, XCircle, Zap, Star } from "lucide-react";

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
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface ContractTier {
  price: bigint;
  minValue: bigint;
  maxValue: bigint;
  active: boolean;
}

interface TierDisplay {
  id: number;
  name: string;
  emoji: string;
  price: bigint;
  minValue: bigint;
  maxValue: bigint;
  active: boolean;
}

const TIER_NAMES = [
  { name: "Bronze", emoji: "🥉", code: "T1" },
  { name: "Silver", emoji: "🥈", code: "T2" },
  { name: "Gold", emoji: "🥇", code: "T3" },
  { name: "Diamond", emoji: "💎", code: "T4" },
];

export function VendingMachine() {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [tiers, setTiers] = useState<TierDisplay[]>([]);
  const [latestRequestId, setLatestRequestId] = useState<string | null>(null);
  const [walletStatus, setWalletStatus] = useState<
    "idle" | "preparing" | "ready" | "error"
  >("idle");
  const [walletData, setWalletData] = useState<any>(null);
  const [preparingDots, setPreparingDots] = useState("");
  const [codeInput, setCodeInput] = useState<string>("");
  const [message, setMessage] = useState<string>("🎰 WELCOME TO VENDYZ 🎰");
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { connect, connectors } = useConnect();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Treasury balance hook
  const { data: treasuryData, loading: treasuryLoading } = useTreasuryBalance();

  // Animated dots effect for preparing state
  useEffect(() => {
    if (walletStatus !== "preparing") return;
    const interval = setInterval(() => {
      setPreparingDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [walletStatus]);

  // Contract write hooks
  const {
    data: callsId,
    sendCalls,
    isPending: isPurchasePending,
  } = useSendCalls();

  const { data: callsStatus } = useCallsStatus({
    id: callsId?.id as string,
    query: {
      enabled: !!callsId,
      refetchInterval: (query) =>
        query.state.data?.status === "success" ? false : 1000,
    },
  });

  const isPurchaseConfirming = callsStatus?.status === "pending";
  const isPurchaseSuccess = callsStatus?.status === "success";

  // Fallback for individual approval if needed
  const {
    data: approvalHash,
    writeContract: writeApproval,
    isPending: isApprovalPending,
  } = useWriteContract();

  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } =
    useWaitForTransactionReceipt({
      hash: approvalHash,
    });

  // Track approval transaction status (fallback)
  useEffect(() => {
    if (approvalHash) {
      if (!isApprovalConfirming && !isApprovalSuccess) {
        trackTransaction(approvalHash, "USDC Approval");
      } else if (isApprovalConfirming) {
        updateTransactionStatus(approvalHash, "confirming");
      } else if (isApprovalSuccess) {
        updateTransactionStatus(approvalHash, "success");
      }
    }
  }, [approvalHash, isApprovalConfirming, isApprovalSuccess]);

  // Track batch transaction status and extract requestId
  useEffect(() => {
    if (callsId && isPurchaseSuccess && callsStatus?.receipts?.[0]) {
      const tier = tiers.find((t) => t.id === selectedTier);
      trackTransaction(
        callsStatus.receipts[0].transactionHash,
        `Purchase ${tier?.name || "Wallet"} Tier`
      );
      // Extract requestId from transaction receipt
      extractRequestIdFromReceipt(callsStatus.receipts[0].logs);
    }
  }, [callsId, isPurchaseSuccess, callsStatus, selectedTier, tiers]);

  // Poll wallet status after purchase
  useEffect(() => {
    if (!latestRequestId || walletStatus !== "preparing") return;

    let pollInterval: NodeJS.Timeout | undefined;
    let attempts = 0;
    const maxAttempts = 60;

    const checkWalletStatus = async () => {
      attempts++;

      if (attempts > maxAttempts) {
        setWalletStatus("error");
        if (pollInterval) clearInterval(pollInterval);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/wallet/${latestRequestId}/status`
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.ready) {
            setWalletStatus("ready");
            if (pollInterval) clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error("Error polling wallet status:", err);
      }
    };

    pollInterval = setInterval(checkWalletStatus, 2000);
    checkWalletStatus();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [latestRequestId, walletStatus, API_URL]);

  // Extract requestId from PurchaseInitiated event
  const extractRequestIdFromReceipt = (logs: any[]) => {
    try {
      // Find PurchaseInitiated event
      for (const log of logs) {
        try {
          const decoded = decodeEventLog({
            abi: VendingMachineAbi,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === "PurchaseInitiated") {
            const requestId = (decoded.args as any).requestId.toString();
            setLatestRequestId(requestId);
            setWalletStatus("preparing");
            console.log("Request ID extracted:", requestId);
            break;
          }
        } catch (e) {
          // Skip logs that don't match
          continue;
        }
      }
    } catch (error) {
      console.error("Error extracting requestId:", error);
    }
  };

  // Read user purchase count
  const { data: purchaseCount } = useReadContract({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    functionName: "getUserPurchaseCount",
    args: address ? [address] : undefined,
  });

  // Read USDC balance
  const { data: usdcBalanceData } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Read USDC allowance
  const { data: usdcAllowance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      address && VendingMachineAddress
        ? [address, VendingMachineAddress as `0x${string}`]
        : undefined,
  });

  // Fetch tier data from contract
  const { data: tier1 } = useReadContract({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    functionName: "getTier",
    args: [1],
  });

  const { data: tier2 } = useReadContract({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    functionName: "getTier",
    args: [2],
  });

  const { data: tier3 } = useReadContract({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    functionName: "getTier",
    args: [3],
  });

  const { data: tier4 } = useReadContract({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    functionName: "getTier",
    args: [4],
  });

  // Combine tier data
  useEffect(() => {
    const tierData = [tier1, tier2, tier3, tier4];
    const displayTiers: TierDisplay[] = tierData
      .map((data, index) => {
        if (!data) return null;
        const tierStruct = data as {
          price: bigint;
          minValue: bigint;
          maxValue: bigint;
          active: boolean;
        };
        return {
          id: index + 1,
          name: TIER_NAMES[index].name,
          emoji: TIER_NAMES[index].emoji,
          price: tierStruct.price,
          minValue: tierStruct.minValue,
          maxValue: tierStruct.maxValue,
          active: tierStruct.active,
        };
      })
      .filter((t): t is TierDisplay => t !== null && t.active);
    setTiers(displayTiers);
  }, [tier1, tier2, tier3, tier4]);

  // Check if approval is needed when tier is selected
  useEffect(() => {
    if (selectedTier && usdcAllowance !== undefined) {
      const tier = tiers.find((t) => t.id === selectedTier);
      if (tier) {
        setNeedsApproval(usdcAllowance < tier.price);
      }
    }
  }, [selectedTier, usdcAllowance, tiers]);

  // Reset approval state after successful approval
  useEffect(() => {
    if (isApprovalSuccess) {
      setNeedsApproval(false);
    }
  }, [isApprovalSuccess]);

  const handleApproveAndPurchase = async () => {
    if (!selectedTier) return;
    const tier = tiers.find((t) => t.id === selectedTier);
    if (!tier) return;

    // Client-side validation
    const validationError = validatePurchase(
      selectedTier,
      isConnected,
      usdcBalanceData as bigint | undefined,
      tier?.price
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
      // Batch approve and purchase together
      await sendCalls({
        calls: [
          {
            to: USDC_ADDRESS as `0x${string}`,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: "approve",
              args: [
                VendingMachineAddress as `0x${string}`,
                tier.price * BigInt(10),
              ],
            }),
          },
          {
            to: VendingMachineAddress as `0x${string}`,
            data: encodeFunctionData({
              abi: VendingMachineAbi,
              functionName: "purchase",
              args: [selectedTier!],
            }),
          },
        ],
      });
    } catch (error: any) {
      const errorMsg = parseContractError(error);
      showError(errorMsg.title, errorMsg.message, errorMsg.action);
    }
  };

  // Fallback for wallets that don't support batch calls
  const handleApprove = async () => {
    if (!selectedTier) return;
    const tier = tiers.find((t) => t.id === selectedTier);
    if (!tier) return;

    try {
      writeApproval({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [VendingMachineAddress as `0x${string}`, tier.price * BigInt(10)],
      });
    } catch (error: any) {
      const errorMsg = parseContractError(error);
      showError(errorMsg.title, errorMsg.message, errorMsg.action);
    }
  };

  // Handle price input for tier selection
  const handleCodeInput = (key: string) => {
    setCodeInput(key);
    setMessage(`🪙 ${key} USDC INSERTED 🪙`);

    // Trigger coin animation
    setShowCoinAnimation(true);
    setTimeout(() => setShowCoinAnimation(false), 800);
  };

  // Clear code input
  const handleClear = () => {
    setCodeInput("");
    setSelectedTier(null);
    setMessage(" INSERT COIN 🪙");
  };

  // Handle purchase with price selection
  const handleSpinNow = () => {
    if (!codeInput) {
      setMessage("⚠️ INSERT COIN FIRST ⚠️");
      setTimeout(() => setMessage("🪙 INSERT COIN 🪙"), 2000);
      return;
    }

    const priceValue = Number(codeInput);
    const tier = tiers.find(
      (t) => Number(formatUnits(t.price, 6)) === priceValue
    );
    if (!tier) {
      setMessage("❌ INVALID AMOUNT ❌");
      setTimeout(() => {
        setCodeInput("");
        setMessage(" INSERT COIN 🪙");
      }, 2000);
      return;
    }

    // Check if tier is fundable
    const isTierFundable = treasuryData?.tiers?.[tier.id as 1 | 2 | 3 | 4]?.fundable ?? true;
    if (!isTierFundable) {
      setMessage("❌ TIER SOLD OUT ❌");
      setTimeout(() => {
        setCodeInput("");
        setMessage("🪙 INSERT COIN 🪙");
      }, 2000);
      return;
    }

    setSelectedTier(tier.id);

    if (needsApproval) {
      setMessage(
        `💳 APPROVE & PURCHASE ${Number(formatUnits(tier.price, 6))} USDC 💳`
      );
      handleApproveAndPurchase();
    } else {
      handleApproveAndPurchase();
    }
  };

  // Connect Wallet Button Component
  const ConnectWalletButton = () => (
    <div className="space-y-2">
      <button
        onClick={() => connect({ connector: connectors[1] })}
        className="w-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 hover:from-yellow-400 hover:via-yellow-300 hover:to-yellow-400 text-black py-3 md:py-4 rounded-lg transition-all shadow-2xl hover:shadow-yellow-500/50 flex items-center justify-center gap-2 border-2 border-yellow-600 text-base md:text-lg font-bold"
      >
        <Wallet size={18} className="md:w-5 md:h-5" />
        🔌 CONNECT COINBASE WALLET 🔌
      </button>
      <button
        onClick={() => connect({ connector: connectors[2] })}
        className="w-full bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 hover:from-orange-400 hover:via-orange-300 hover:to-orange-400 text-white py-3 md:py-4 rounded-lg transition-all shadow-2xl hover:shadow-orange-500/50 flex items-center justify-center gap-2 border-2 border-orange-600 text-base md:text-lg font-bold"
      >
        <Wallet size={18} className="md:w-5 md:h-5" />
        🦊 CONNECT METAMASK 🦊
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Vending Machine Frame */}
      <div className="bg-gradient-to-b from-red-600 via-red-700 to-red-950 rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-2xl border-4 md:border-8 border-yellow-500 relative overflow-hidden">
        {/* Animated background lights */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400 animate-pulse"></div>
        </div>

        {/* Corner decorations */}
        <div className="absolute top-2 md:top-4 left-2 md:left-4 text-yellow-400 animate-pulse">
          <Star className="w-4 h-4 md:w-8 md:h-8 fill-yellow-400" />
        </div>
        <div className="absolute top-2 md:top-4 right-2 md:right-4 text-yellow-400 animate-pulse">
          <Star className="w-4 h-4 md:w-8 md:h-8 fill-yellow-400" />
        </div>

        {/* Top Sign */}
        <div className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 text-red-900 text-center py-3 md:py-4 rounded-lg md:rounded-xl mb-4 md:mb-6 shadow-2xl border-2 md:border-4 border-yellow-500 relative animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
          <h1 className="tracking-widest text-xl md:text-3xl relative z-10">
            🎰 VENDYZ 🎰
          </h1>
          <p className="text-xs md:text-sm tracking-wider relative z-10">
            ANONYMOUS WALLET CASINO
          </p>
          {isConnected && purchaseCount !== undefined && (
            <p className="text-xs mt-1 relative z-10">
              Purchases: {purchaseCount?.toString() || "0"}
            </p>
          )}
        </div>

        {/* Display Screen */}
        <div className="bg-black text-yellow-300 p-3 md:p-4 rounded-lg mb-4 md:mb-6 font-mono text-center shadow-inner border-2 md:border-4 border-red-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-transparent to-red-600/20 animate-pulse"></div>
          <div className="text-sm md:text-2xl tracking-wide relative z-10 animate-pulse">
            {message}
          </div>
        </div>

        {/* Wallet Tiers Display Area */}
        <div className="bg-gradient-to-b from-black via-red-950 to-black rounded-lg md:rounded-xl p-2 md:p-3 mb-3 md:mb-4 shadow-2xl border-2 border-yellow-500 relative">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 via-transparent to-yellow-400/30 animate-pulse"></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2 relative z-10">
            {tiers.map((tier) => {
              const priceUSDC = Number(formatUnits(tier.price, 6));
              const minValueUSDC = Number(formatUnits(tier.minValue, 6));
              const maxValueUSDC = Number(formatUnits(tier.maxValue, 6));

              // Check if tier is fundable from treasury
              const isTierFundable = treasuryData?.tiers?.[tier.id as 1 | 2 | 3 | 4]?.fundable ?? true;
              const isDisabled = !isTierFundable;

              return (
                <div
                  key={tier.id}
                  className={`bg-gradient-to-b from-red-800 via-red-900 to-black rounded-md md:rounded-lg p-1.5 md:p-2 shadow-xl border-2 flex flex-col items-center justify-center relative overflow-hidden group transition-all ${
                    isDisabled
                      ? "border-gray-600 opacity-50 cursor-not-allowed"
                      : "border-yellow-500 hover:shadow-yellow-500/50 hover:scale-105 hover:border-yellow-300"
                  }`}
                  title={isDisabled ? "Insufficient treasury balance for this tier" : ""}
                >
                  {isDisabled && (
                    <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
                      <div className="text-red-500 text-xs md:text-sm font-bold">SOLD OUT</div>
                    </div>
                  )}
                  
                  <div className={`absolute inset-0 bg-gradient-to-t from-yellow-500/20 to-transparent opacity-0 transition-opacity ${!isDisabled && "group-hover:opacity-100"}`}></div>

                  <div className="text-[9px] text-yellow-400 mb-0.5 relative z-10 font-bold">
                    {TIER_NAMES[tier.id - 1].code}
                  </div>
                  <div className="text-xl md:text-3xl mb-0.5 relative z-10">
                    {tier.emoji}
                  </div>
                  <div className="text-[10px] md:text-xs text-yellow-400 font-bold relative z-10">
                    🪙 {priceUSDC}
                  </div>
                  <div className="text-[8px] md:text-[10px] text-green-400 relative z-10 mt-0.5">
                    WIN ${minValueUSDC}-${maxValueUSDC}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 relative z-10">
          {/* Left Side - Keypad & Controls */}
          <div className="space-y-3 md:space-y-4">
            {/* Keypad */}
            <div className="bg-black rounded-lg p-2 md:p-3 border-2 border-yellow-500 shadow-xl relative overflow-hidden">
              {/* Coin insertion animation */}
              {showCoinAnimation && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                  <div className="text-6xl md:text-8xl animate-[coinDrop_0.8s_ease-in]">
                    🪙
                  </div>
                </div>
              )}

              <div className="text-yellow-400 text-[10px] md:text-xs mb-1 md:mb-2 text-center tracking-wider">
                {codeInput
                  ? `🪙 ${codeInput} USDC SELECTED 🪙`
                  : "🪙 INSERT COIN 🪙"}
              </div>

              {!codeInput ? (
                <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                  {["5", "20", "50", "100"].map((key, index) => {
                    const tierId = index + 1;
                    const isTierFundable = treasuryData?.tiers?.[tierId as 1 | 2 | 3 | 4]?.fundable ?? true;
                    
                    return (
                      <button
                        key={key}
                        onClick={() => handleCodeInput(key)}
                        disabled={!isTierFundable}
                        className={`py-2 md:py-3 rounded-lg transition-all shadow-lg border-2 text-base md:text-xl font-bold ${
                          isTierFundable
                            ? "bg-gradient-to-b from-yellow-500 to-yellow-700 hover:from-yellow-400 hover:to-yellow-600 text-black hover:shadow-yellow-500/50 border-yellow-300 cursor-pointer"
                            : "bg-gradient-to-b from-gray-500 to-gray-700 text-gray-400 border-gray-600 cursor-not-allowed opacity-50"
                        }`}
                      >
                        🪙 {key}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center py-4 md:py-6">
                  <div className="bg-gradient-to-b from-green-500 to-green-700 text-white px-6 md:px-8 py-3 md:py-4 rounded-lg border-4 border-green-300 shadow-2xl shadow-green-500/50">
                    <div className="text-3xl md:text-5xl font-bold flex items-center gap-2">
                      🪙 {codeInput}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="bg-black rounded-lg p-2 md:p-3 border-2 border-yellow-500 shadow-xl">
              <div className="space-y-1.5 md:space-y-2">
                {!isConnected ? (
                  <ConnectWalletButton />
                ) : (
                  <button
                    onClick={handleSpinNow}
                    disabled={isPurchasePending || isPurchaseConfirming}
                    className="w-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 hover:from-yellow-400 hover:via-yellow-300 hover:to-yellow-400 text-red-900 py-2 md:py-3 rounded-lg transition-all shadow-2xl hover:shadow-yellow-500/50 flex items-center justify-center gap-2 border-2 border-yellow-600 text-sm md:text-base animate-pulse"
                  >
                    {isPurchasePending || isPurchaseConfirming ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        {isPurchasePending ? "PURCHASING..." : "CONFIRMING..."}
                      </span>
                    ) : (
                      <>
                        <Wallet size={18} className="md:w-5 md:h-5" />
                        SPIN NOW!
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={handleClear}
                  className="w-full bg-gradient-to-b from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 text-white py-1.5 md:py-2 rounded-lg transition-all shadow-lg hover:shadow-orange-500/50 flex items-center justify-center gap-2 border-2 border-orange-400 text-xs md:text-sm"
                >
                  <XCircle size={14} className="md:w-4 md:h-4" />
                  CLEAR
                </button>
              </div>
            </div>
          </div>

          {/* Right Side - Status Display */}
          <div>
            <div className="bg-black rounded-lg p-3 md:p-4 border-2 md:border-4 border-yellow-500 min-h-[400px] md:min-h-[500px] shadow-2xl relative overflow-hidden">
              {/* Purchasing/Confirming */}
              {(isPurchasePending || isPurchaseConfirming) && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80">
                  <div className="text-center">
                    <div className="text-4xl md:text-6xl mb-4 animate-spin">
                      🎰
                    </div>
                    <div className="text-yellow-400 text-lg md:text-2xl animate-pulse">
                      {isPurchasePending ? "PURCHASING..." : "CONFIRMING..."}
                    </div>
                  </div>
                </div>
              )}

              {/* Preparing Wallet */}
              {walletStatus === "preparing" && (
                <div className="h-full flex flex-col items-center justify-center p-4 space-y-4">
                  <div className="relative">
                    <div className="text-6xl md:text-8xl animate-bounce">
                      🎉
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 md:w-24 md:h-24 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 className="text-yellow-400 text-xl md:text-2xl font-bold mb-1">
                      CONGRATULATIONS!
                    </h3>
                    <p className="text-yellow-300 text-sm md:text-base">
                      Preparing your rewards{preparingDots}
                    </p>
                  </div>

                  <div className="w-full max-w-sm space-y-2">
                    <div className="flex items-center gap-2 text-xs md:text-sm">
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <span className="text-green-400">Purchase confirmed</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs md:text-sm">
                      <div className="w-4 h-4 rounded-full bg-yellow-500 animate-pulse flex-shrink-0"></div>
                      <span className="text-yellow-400 font-semibold">
                        Generating wallet...
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs md:text-sm">
                      <div className="w-4 h-4 rounded-full bg-gray-600 flex-shrink-0"></div>
                      <span className="text-gray-500">Funding tokens</span>
                    </div>
                  </div>

                  <p className="text-yellow-500 text-xs">
                    ⏱️ Usually takes 30-60 seconds
                  </p>
                </div>
              )}

              {/* Wallet Ready */}
              {walletStatus === "ready" && latestRequestId && (
                <WalletPreparationModal
                  requestId={latestRequestId}
                  onClose={() => {
                    setWalletStatus("idle");
                    setLatestRequestId(null);
                    setCodeInput("");
                    setSelectedTier(null);
                  }}
                />
              )}

              {/* Error State */}
              {walletStatus === "error" && (
                <div className="h-full flex flex-col items-center justify-center p-4 space-y-4">
                  <div className="text-6xl">⚠️</div>

                  <div className="text-center">
                    <h3 className="text-red-400 text-xl md:text-2xl font-bold mb-2">
                      TAKING LONGER
                    </h3>
                    <p className="text-red-300 text-sm">
                      Your wallet is still being prepared
                    </p>
                  </div>

                  <div className="bg-yellow-900/50 border-2 border-yellow-600 rounded-lg p-4 w-full max-w-sm">
                    <p className="text-yellow-300 text-xs text-center mb-2">
                      Check the <span className="font-bold">WALLET TAB</span> in
                      a moment to retrieve your wallet
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setWalletStatus("idle");
                      setLatestRequestId(null);
                    }}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-bold"
                  >
                    CLOSE
                  </button>
                </div>
              )}

              {/* Idle State */}
              {walletStatus === "idle" &&
                !isPurchasePending &&
                !isPurchaseConfirming && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-gray-600 text-center">
                      <div className="text-4xl md:text-6xl mb-4 opacity-30">
                        🎰
                      </div>
                      <div className="text-xs">
                        STATUS
                        <br />
                        DISPLAY
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400 animate-pulse"></div>
      </div>
    </div>
  );
}
