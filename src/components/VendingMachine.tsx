"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { VendingMachineAbi, VendingMachineAddress } from "~/lib/constants";
import { Button } from "./ui/Button";
import { parseContractError, validatePurchase } from "~/lib/errorHandler";
import { showError } from "~/components/ErrorToast";
import {
  trackTransaction,
  updateTransactionStatus,
} from "~/components/TransactionTracker";
import { TierCardSkeleton } from "~/components/LoadingSkeletons";

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
  { name: "Bronze", emoji: "🥉" },
  { name: "Silver", emoji: "🥈" },
  { name: "Gold", emoji: "🥇" },
  { name: "Diamond", emoji: "💎" },
];

export function VendingMachine() {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [tiers, setTiers] = useState<TierDisplay[]>([]);
  const { address, isConnected } = useAccount();

  // Contract write hooks
  const {
    data: purchaseHash,
    writeContract: writePurchase,
    isPending: isPurchasePending,
  } = useWriteContract();
  const {
    data: approvalHash,
    writeContract: writeApproval,
    isPending: isApprovalPending,
  } = useWriteContract();

  const { isLoading: isPurchaseConfirming, isSuccess: isPurchaseSuccess } =
    useWaitForTransactionReceipt({
      hash: purchaseHash,
    });

  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } =
    useWaitForTransactionReceipt({
      hash: approvalHash,
    });

  // Track approval transaction status
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

  // Track purchase transaction status
  useEffect(() => {
    if (purchaseHash) {
      const tier = tiers.find((t) => t.id === selectedTier);
      if (!isPurchaseConfirming && !isPurchaseSuccess) {
        trackTransaction(purchaseHash, `Purchase ${tier?.name || "Wallet"} Tier`);
      } else if (isPurchaseConfirming) {
        updateTransactionStatus(purchaseHash, "confirming");
      } else if (isPurchaseSuccess) {
        updateTransactionStatus(purchaseHash, "success");
      }
    }
  }, [purchaseHash, isPurchaseConfirming, isPurchaseSuccess, selectedTier, tiers]);

  // Read user purchase count
  const { data: purchaseCount } = useReadContract({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    functionName: "getUserPurchaseCount",
    args: address ? [address] : undefined,
  });

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
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
    if (selectedTier && usdcBalance !== undefined) {
      const tier = tiers.find((t) => t.id === selectedTier);
      if (tier) {
        setNeedsApproval(usdcBalance < tier.price);
      }
    }
  }, [selectedTier, usdcBalance, tiers]);

  // Reset approval state after successful approval
  useEffect(() => {
    if (isApprovalSuccess) {
      setNeedsApproval(false);
    }
  }, [isApprovalSuccess]);

  const handleApprove = async () => {
    if (!selectedTier) return;
    const tier = tiers.find((t) => t.id === selectedTier);
    if (!tier) return;

    try {
      writeApproval({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [VendingMachineAddress as `0x${string}`, tier.price * BigInt(10)], // Approve 10x for future purchases
      });
    } catch (error: any) {
      const errorMsg = parseContractError(error);
      showError(errorMsg.title, errorMsg.message, errorMsg.action);
    }
  };

  const handlePurchase = async () => {
    // Client-side validation
    const tier = tiers.find((t) => t.id === selectedTier);
    const validationError = validatePurchase(
      selectedTier,
      isConnected,
      usdcBalance as bigint | undefined,
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
      writePurchase({
        address: VendingMachineAddress as `0x${string}`,
        abi: VendingMachineAbi,
        functionName: "purchase",
        args: [selectedTier!],
      });
    } catch (error: any) {
      const errorMsg = parseContractError(error);
      showError(errorMsg.title, errorMsg.message, errorMsg.action);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2" style={{ color: "#000000" }}>
          🎰 Vendyz
        </h1>
        <p style={{ color: "#000000", opacity: 0.7 }}>
          Anonymous Wallet Vending Machine
        </p>
        {isConnected &&
          purchaseCount !== undefined &&
          purchaseCount !== null && (
            <p className="text-sm text-gray-500 mt-2">
              Your purchases: {purchaseCount.toString()}
            </p>
          )}
      </div>

      {/* Success Messages */}
      {isPurchaseSuccess && (
        <div
          className="px-4 py-3 rounded mb-6"
          style={{
            backgroundColor: "#d4e7a0",
            border: "2px solid #b8d47a",
            color: "#000000",
          }}
        >
          <p className="font-bold">Purchase Successful! 🎉</p>
          <p className="text-sm">
            Your wallet is being prepared by Chainlink VRF. Check the History
            tab!
          </p>
        </div>
      )}
      {isApprovalSuccess && (
        <div
          className="px-4 py-3 rounded mb-6"
          style={{
            backgroundColor: "#e8f5d0",
            border: "2px solid #d4e7a0",
            color: "#000000",
          }}
        >
          <p className="font-bold">Approval Successful! ✅</p>
          <p className="text-sm">
            You can now purchase wallets. Click the purchase button below.
          </p>
        </div>
      )}

      {/* Tier Cards */}
      {tiers.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <TierCardSkeleton />
          <TierCardSkeleton />
          <TierCardSkeleton />
          <TierCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {tiers.map((tier) => {
            const priceUSDC = Number(formatUnits(tier.price, 6));
            const minValueUSDC = Number(formatUnits(tier.minValue, 6));
            const maxValueUSDC = Number(formatUnits(tier.maxValue, 6));
            const avgValue = (minValueUSDC + maxValueUSDC) / 2;
            const edge = ((avgValue / priceUSDC - 1) * 100).toFixed(0);

            return (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                disabled={!tier.active}
                className={`p-6 rounded-lg border-2 transition-all duration-200 text-left ${
                  !tier.active ? "opacity-50 cursor-not-allowed" : ""
                }`}
                style={{
                  backgroundColor:
                    selectedTier === tier.id ? "#f5ffdb" : "#EEFFBE",
                  borderColor: selectedTier === tier.id ? "#d4e7a0" : "#c8d99a",
                  color: "#000000",
                  transform:
                    selectedTier === tier.id ? "scale(1.05)" : "scale(1)",
                  boxShadow:
                    selectedTier === tier.id
                      ? "0 10px 15px -3px rgba(0,0,0,0.1)"
                      : "none",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{tier.emoji}</span>
                    <h3 className="text-xl font-bold">{tier.name}</h3>
                  </div>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ${priceUSDC}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    💰 Wallet value: ${minValueUSDC} - ${maxValueUSDC} USDC
                  </p>
                  <p>📊 Expected return: ${avgValue.toFixed(1)} USDC</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    ~{edge}% house edge
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      {selectedTier && (
        <div className="text-center space-y-3">
          {!isConnected ? (
            <p className="text-gray-500">
              Please connect your wallet to continue
            </p>
          ) : needsApproval ? (
            <Button
              onClick={handleApprove}
              disabled={isApprovalPending || isApprovalConfirming}
              className="w-full md:w-auto px-8 py-4 text-lg font-semibold"
            >
              {isApprovalPending || isApprovalConfirming ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  {isApprovalPending ? "Approving..." : "Confirming..."}
                </span>
              ) : (
                `Approve USDC`
              )}
            </Button>
          ) : (
            <Button
              onClick={handlePurchase}
              disabled={isPurchasePending || isPurchaseConfirming}
              className="w-full md:w-auto px-8 py-4 text-lg font-semibold"
            >
              {isPurchasePending || isPurchaseConfirming ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  {isPurchasePending ? "Purchasing..." : "Confirming..."}
                </span>
              ) : (
                `Purchase ${tiers.find((t) => t.id === selectedTier)?.name} for $${Number(formatUnits(tiers.find((t) => t.id === selectedTier)?.price || BigInt(0), 6))}`
              )}
            </Button>
          )}
        </div>
      )}

      {/* How it Works */}
      <div
        className="mt-12 p-6 rounded-lg"
        style={{ backgroundColor: "#f5ffdb", color: "#000000" }}
      >
        <h2 className="text-2xl font-bold mb-4" style={{ color: "#000000" }}>
          🎯 How It Works
        </h2>
        <ol className="space-y-3" style={{ color: "#000000", opacity: 0.9 }}>
          <li className="flex gap-3">
            <span className="font-bold text-blue-600">1.</span>
            <span>Choose your tier and pay with USDC</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-600">2.</span>
            <span>Chainlink VRF generates provably fair randomness</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-600">3.</span>
            <span>Receive a pre-funded anonymous Ethereum wallet</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-600">4.</span>
            <span>Wallet contains random amount of USDC + bonus tokens</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
