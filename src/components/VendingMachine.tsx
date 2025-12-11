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
import { useTreasuryBalance } from "~/hooks/useTreasuryBalance";
import { Wallet, XCircle, Snowflake } from "lucide-react";

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
  { name: "Cookie", emoji: "🍪", code: "T1" },
  { name: "Reindeer", emoji: "🦌", code: "T2" },
  { name: "Sleigh", emoji: "🛷", code: "T3" },
  { name: "Santa", emoji: "🎅", code: "T4" },
];

export function VendingMachine() {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [tiers, setTiers] = useState<TierDisplay[]>([]);
  const [latestRequestId, setLatestRequestId] = useState<string | null>(null);
  const [walletStatus, setWalletStatus] = useState<
    "idle" | "preparing" | "ready" | "error"
  >("idle");
  const [_walletData, _setWalletData] = useState<any>(null);
  const [preparingDots, setPreparingDots] = useState("");
  const [codeInput, setCodeInput] = useState<string>("");
  const [message, setMessage] = useState<string>("🎅 HO HO HO! WELCOME! 🎅");
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);
  const { address, isConnected } = useAccount();
  const _publicClient = usePublicClient();
  const { connect, connectors } = useConnect();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Treasury balance hook
  const { data: treasuryData, loading: _treasuryLoading } =
    useTreasuryBalance();

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
    isPending: _isApprovalPending,
  } = useWriteContract();

  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } =
    useWaitForTransactionReceipt({
      hash: approvalHash,
    });

  // Track approval transaction status (fallback)
  // useEffect(() => {
  //   if (approvalHash) {
  //     if (!isApprovalConfirming && !isApprovalSuccess) {
  //       trackTransaction(approvalHash, "USDC Approval");
  //     } else if (isApprovalConfirming) {
  //       updateTransactionStatus(approvalHash, "confirming");
  //     } else if (isApprovalSuccess) {
  //       updateTransactionStatus(approvalHash, "success");
  //     }
  //   }
  // }, [approvalHash, isApprovalConfirming, isApprovalSuccess]);

  // Track batch transaction status and extract requestId
  useEffect(() => {
    if (callsId && isPurchaseSuccess && callsStatus?.receipts?.[0]) {
      // const tier = tiers.find((t) => t.id === selectedTier);
      // trackTransaction(
      //   callsStatus.receipts[0].transactionHash,
      //   `Purchase ${tier?.name || "Wallet"} Tier`
      // );
      // Extract requestId from transaction receipt
      extractRequestIdFromReceipt(callsStatus.receipts[0].logs);
    }
  }, [callsId, isPurchaseSuccess, callsStatus, selectedTier, tiers]);

  // Poll wallet status after purchase
  useEffect(() => {
    if (!latestRequestId || walletStatus !== "preparing") return;
    // eslint-disable-next-line prefer-const
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
        } catch (_e) {
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
  const _handleApprove = async () => {
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
    const isTierFundable =
      treasuryData?.tiers?.[tier.id as 1 | 2 | 3 | 4]?.fundable ?? true;
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
        className="w-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 hover:from-yellow-400 hover:via-yellow-300 hover:to-yellow-400 text-black py-2 md:py-3 rounded-lg transition-all shadow-2xl hover:shadow-yellow-500/50 flex items-center justify-center gap-2 border-2 border-yellow-600 text-sm md:text-base font-bold"
      >
        <Wallet size={16} className="md:w-4 md:h-4" />
        🔌 CONNECT COINBASE WALLET 🔌
      </button>
      <button
        onClick={() => connect({ connector: connectors[2] })}
        className="w-full bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 hover:from-orange-400 hover:via-orange-300 hover:to-orange-400 text-white py-2 md:py-3 rounded-lg transition-all shadow-2xl hover:shadow-orange-500/50 flex items-center justify-center gap-2 border-2 border-orange-600 text-sm md:text-base font-bold"
      >
        <Wallet size={16} className="md:w-4 md:h-4" />
        🦊 CONNECT METAMASK 🦊
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Vending Machine Frame - Santa Theme */}
      <div className="bg-gradient-to-b from-red-700 via-red-600 to-red-800 rounded-2xl md:rounded-3xl p-3 md:p-5 shadow-2xl border-2 md:border-4 border-white relative overflow-hidden">
        {/* Snow texture overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        ></div>

        {/* Animated background lights - Christmas colors */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-red-500 to-green-400 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-red-500 to-green-400 animate-pulse"></div>
        </div>

        {/* Corner decorations - Snowflakes */}
        <div className="absolute top-2 md:top-4 left-2 md:left-4 text-white animate-pulse">
          <Snowflake className="w-3 h-3 md:w-6 md:h-6" />
        </div>
        <div className="absolute top-2 md:top-4 right-2 md:right-4 text-white animate-pulse">
          <Snowflake className="w-3 h-3 md:w-6 md:h-6" />
        </div>

        {/* Top Sign */}
        <div className="bg-gradient-to-r from-green-700 via-green-600 to-green-700 text-white text-center py-2 md:py-3 rounded-lg md:rounded-xl mb-2 md:mb-3 shadow-2xl border-2 md:border-4 border-red-500 relative animate-pulse">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/snow.png')] opacity-30"></div>
          <h1 className="tracking-widest text-lg md:text-2xl relative z-10 font-bold drop-shadow-md">
            🎄 VENDYZ 🎄
          </h1>
          <p className="text-[10px] md:text-xs tracking-wider relative z-10 text-green-100">
            FESTIVE WALLET WORKSHOP
          </p>
          {isConnected && purchaseCount !== undefined && (
            <p className="text-[10px] mt-0.5 relative z-10">
              Purchases: {purchaseCount?.toString() || "0"}
            </p>
          )}
        </div>

        {/* Display Screen */}
        <div className="bg-slate-900 text-cyan-300 p-2 md:p-2.5 rounded-lg mb-2 md:mb-3 font-mono text-center shadow-inner border-2 md:border-4 border-slate-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-cyan-500/10 animate-pulse"></div>
          <div className="text-xs md:text-lg tracking-wide relative z-10 animate-pulse drop-shadow-[0_0_5px_rgba(103,232,249,0.8)]">
            {message}
          </div>
        </div>

        {/* Wallet Tiers Display Area */}
        <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-lg md:rounded-xl p-1.5 md:p-2 mb-2 md:mb-3 shadow-2xl border-2 border-white/50 relative">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/30 via-transparent to-green-400/30 animate-pulse"></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2 relative z-10">
            {tiers.map((tier) => {
              const priceUSDC = Number(formatUnits(tier.price, 6));
              const minValueUSDC = Number(formatUnits(tier.minValue, 6));
              const maxValueUSDC = Number(formatUnits(tier.maxValue, 6));

              // Check if tier is fundable from treasury
              const isTierFundable =
                treasuryData?.tiers?.[tier.id as 1 | 2 | 3 | 4]?.fundable ??
                true;
              const isDisabled = !isTierFundable;

              return (
                <div
                  key={tier.id}
                  className={`bg-gradient-to-b from-green-800 via-green-900 to-slate-900 rounded-md md:rounded-lg p-1 md:p-1.5 shadow-xl border-2 flex flex-col items-center justify-center relative overflow-hidden group transition-all ${
                    isDisabled
                      ? "border-slate-700 opacity-50 cursor-not-allowed grayscale"
                      : "border-red-500 hover:shadow-red-500/50 hover:scale-105 hover:border-green-400"
                  }`}
                  title={
                    isDisabled
                      ? "Insufficient treasury balance for this tier"
                      : ""
                  }
                >
                  {isDisabled && (
                    <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
                      <div className="text-red-500 text-[8px] md:text-[10px] font-bold">
                        SOLD OUT
                      </div>
                    </div>
                  )}

                  <div
                    className={`absolute inset-0 bg-gradient-to-t from-green-500/20 to-transparent opacity-0 transition-opacity ${!isDisabled && "group-hover:opacity-100"}`}
                  ></div>

                  <div className="text-[8px] text-green-300 mb-0.5 relative z-10 font-bold">
                    {TIER_NAMES[tier.id - 1].code}
                  </div>
                  <div className="text-lg md:text-2xl mb-0.5 relative z-10">
                    {tier.emoji}
                  </div>
                  <div className="text-[9px] md:text-[11px] text-white font-bold relative z-10">
                    🪙 {priceUSDC}
                  </div>
                  <div className="text-[7px] md:text-[9px] text-yellow-300 relative z-10 mt-0.5">
                    WIN ${minValueUSDC}-${maxValueUSDC}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-4 relative z-10">
          {/* Left Side - Keypad & Controls */}
          <div className="space-y-2 md:space-y-3">
            {/* Keypad */}
            <div className="bg-slate-900 rounded-lg p-1.5 md:p-2 border-2 border-white/30 shadow-xl relative overflow-hidden">
              {/* Coin insertion animation */}
              {showCoinAnimation && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                  <div className="text-4xl md:text-6xl animate-[coinDrop_0.8s_ease-in]">
                    ❄️
                  </div>
                </div>
              )}

              <div className="text-cyan-300 text-[9px] md:text-[11px] mb-1 md:mb-2 text-center tracking-wider font-mono">
                {codeInput
                  ? `❄️ ${codeInput} USDC SELECTED ❄️`
                  : "❄️ INSERT COIN ❄️"}
              </div>

              {!codeInput ? (
                <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                  {["5", "20", "50", "100"].map((key, index) => {
                    const tierId = index + 1;
                    const isTierFundable =
                      treasuryData?.tiers?.[tierId as 1 | 2 | 3 | 4]
                        ?.fundable ?? true;

                    return (
                      <button
                        key={key}
                        onClick={() => handleCodeInput(key)}
                        disabled={!isTierFundable}
                        className={`py-1.5 md:py-2 rounded-lg transition-all shadow-lg border-2 text-sm md:text-lg font-bold ${
                          isTierFundable
                            ? "bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white hover:shadow-red-500/50 border-red-300 cursor-pointer"
                            : "bg-gradient-to-b from-slate-700 to-slate-800 text-slate-500 border-slate-600 cursor-not-allowed opacity-50"
                        }`}
                      >
                        🪙 {key}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center py-2 md:py-3">
                  <div className="bg-gradient-to-b from-green-500 to-green-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg border-4 border-green-300 shadow-2xl shadow-green-500/50">
                    <div className="text-2xl md:text-4xl font-bold flex items-center gap-2">
                      🪙 {codeInput}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="bg-slate-900 rounded-lg p-1.5 md:p-2 border-2 border-white/30 shadow-xl">
              <div className="space-y-1.5 md:space-y-2">
                {!isConnected ? (
                  <ConnectWalletButton />
                ) : (
                  <button
                    onClick={handleSpinNow}
                    disabled={isPurchasePending || isPurchaseConfirming}
                    className="w-full bg-gradient-to-r from-green-500 via-green-400 to-green-500 hover:from-green-400 hover:via-green-300 hover:to-green-400 text-white py-1.5 md:py-2 rounded-lg transition-all shadow-2xl hover:shadow-green-500/50 flex items-center justify-center gap-2 border-2 border-green-300 text-xs md:text-sm animate-pulse font-bold"
                  >
                    {isPurchasePending || isPurchaseConfirming ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        {isPurchasePending
                          ? "WRAPPING GIFT..."
                          : "CHECKING LIST..."}
                      </span>
                    ) : (
                      <>
                        <Wallet size={16} className="md:w-4 md:h-4" />
                        OPEN GIFT!
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={handleClear}
                  className="w-full bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white py-1 md:py-1.5 rounded-lg transition-all shadow-lg hover:shadow-red-500/50 flex items-center justify-center gap-2 border-2 border-red-400 text-[10px] md:text-xs"
                >
                  <XCircle size={14} className="md:w-4 md:h-4" />
                  CLEAR
                </button>
              </div>
            </div>
          </div>

          {/* Right Side - Status Display */}
          <div>
            <div className="bg-slate-900 rounded-lg p-1.5 md:p-2 border-2 border-white/30 min-h-[200px] md:min-h-[250px] shadow-xl relative overflow-hidden h-full">
              {/* Purchasing/Confirming */}
              {(isPurchasePending || isPurchaseConfirming) && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900/90">
                  <div className="text-center">
                    <div className="text-3xl md:text-5xl mb-2 animate-spin">
                      ❄️
                    </div>
                    <div className="text-cyan-300 text-sm md:text-lg animate-pulse">
                      {isPurchasePending
                        ? "WRAPPING GIFT..."
                        : "CHECKING LIST..."}
                    </div>
                  </div>
                </div>
              )}

              {/* Preparing Wallet */}
              {walletStatus === "preparing" && (
                <div className="h-full flex flex-col items-center justify-center p-2 space-y-2">
                  <div className="relative">
                    <div className="text-4xl md:text-6xl animate-bounce">
                      🎁
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 md:w-16 md:h-16 border-2 md:border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 className="text-green-400 text-sm md:text-lg font-bold mb-0.5">
                      HO HO HO!
                    </h3>
                    <p className="text-green-200 text-[10px] md:text-xs">
                      Preparing your gift{preparingDots}
                    </p>
                  </div>

                  <div className="w-full max-w-[200px] space-y-1">
                    <div className="flex items-center gap-1.5 text-[9px] md:text-[11px]">
                      <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-2 h-2 text-white"
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
                    <div className="flex items-center gap-1.5 text-[9px] md:text-[11px]">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse flex-shrink-0"></div>
                      <span className="text-red-400 font-semibold">
                        Generating wallet...
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] md:text-[11px]">
                      <div className="w-3 h-3 rounded-full bg-slate-600 flex-shrink-0"></div>
                      <span className="text-slate-400">Funding tokens</span>
                    </div>
                  </div>

                  <p className="text-cyan-300 text-[8px] md:text-[10px]">
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
                <div className="h-full flex flex-col items-center justify-center p-2 space-y-2">
                  <div className="text-4xl md:text-5xl">⚠️</div>

                  <div className="text-center">
                    <h3 className="text-red-400 text-sm md:text-lg font-bold mb-1">
                      TAKING LONGER
                    </h3>
                    <p className="text-red-300 text-[10px] md:text-xs">
                      Your wallet is still being prepared
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setWalletStatus("idle");
                      setLatestRequestId(null);
                    }}
                    className="px-4 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-[10px] md:text-xs font-bold"
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
                      <div className="text-3xl md:text-5xl mb-2 opacity-30">
                        🎰
                      </div>
                      <div className="text-[10px] md:text-xs">
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
