"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import {
  VendingMachineAbi,
  VendingMachineAddress,
  SponsorAunctionAbi,
  SponsorAunctionAddress,
  RaffleManagerAbi,
  RaffleManagerAddress,
} from "~/lib/constants";
import { Button } from "./ui/Button";

export function AdminDashboard() {
  const { address, isConnected } = useAccount();
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<"vending" | "auction" | "raffle">(
    "vending"
  );

  // Tier parameters state
  const [selectedTier, setSelectedTier] = useState(1);
  const [tierPrice, setTierPrice] = useState("");
  const [tierMinValue, setTierMinValue] = useState("");
  const [tierMaxValue, setTierMaxValue] = useState("");
  const [tierActive, setTierActive] = useState(true);

  // Read owner addresses
  const { data: vendingOwner } = useReadContract({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    functionName: "owner",
  });

  const { data: auctionOwner } = useReadContract({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    functionName: "owner",
  });

  const { data: raffleOwner } = useReadContract({
    address: RaffleManagerAddress as `0x${string}`,
    abi: RaffleManagerAbi,
    functionName: "owner",
  });

  // Read VendingMachine stats
  const { data: totalPurchases } = useReadContract({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    functionName: "totalPurchases",
  });

  const { data: totalRevenue } = useReadContract({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    functionName: "totalRevenue",
  });

  const { data: usdcBalance } = useReadContract({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    functionName: "getUSDCBalance",
  });

  const { data: vendingPaused } = useReadContract({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    functionName: "paused",
  });

  // Read RaffleManager stats
  const { data: totalRaffles } = useReadContract({
    address: RaffleManagerAddress as `0x${string}`,
    abi: RaffleManagerAbi,
    functionName: "totalRaffles",
  });

  const { data: houseFeePercent } = useReadContract({
    address: RaffleManagerAddress as `0x${string}`,
    abi: RaffleManagerAbi,
    functionName: "houseFeePercent",
  });

  const { data: rafflePaused } = useReadContract({
    address: RaffleManagerAddress as `0x${string}`,
    abi: RaffleManagerAbi,
    functionName: "paused",
  });

  // Read SponsorAuction stats
  const { data: totalAuctions } = useReadContract({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    functionName: "totalAuctions",
  });

  const { data: auctionPaused } = useReadContract({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    functionName: "paused",
  });

  // Contract write hooks
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Check if user is owner of any contract
  useEffect(() => {
    if (!address) {
      setIsOwner(false);
      return;
    }

    const ownerCheck =
      address.toLowerCase() === (vendingOwner as string)?.toLowerCase() ||
      address.toLowerCase() === (auctionOwner as string)?.toLowerCase() ||
      address.toLowerCase() === (raffleOwner as string)?.toLowerCase();

    setIsOwner(ownerCheck);
  }, [address, vendingOwner, auctionOwner, raffleOwner]);

  const handleSetTierParameters = () => {
    if (!tierPrice || !tierMinValue || !tierMaxValue) return;

    try {
      writeContract({
        address: VendingMachineAddress as `0x${string}`,
        abi: VendingMachineAbi,
        functionName: "setTierParameters",
        args: [
          selectedTier,
          parseUnits(tierPrice, 6),
          parseUnits(tierMinValue, 6),
          parseUnits(tierMaxValue, 6),
          tierActive,
        ],
      });
    } catch (error) {
      console.error("Set tier parameters failed:", error);
    }
  };

  const handlePauseVending = () => {
    try {
      writeContract({
        address: VendingMachineAddress as `0x${string}`,
        abi: VendingMachineAbi,
        functionName: vendingPaused ? "unpause" : "pause",
      });
    } catch (error) {
      console.error("Pause/unpause failed:", error);
    }
  };

  const handlePauseRaffle = () => {
    try {
      writeContract({
        address: RaffleManagerAddress as `0x${string}`,
        abi: RaffleManagerAbi,
        functionName: rafflePaused ? "unpause" : "pause",
      });
    } catch (error) {
      console.error("Pause/unpause failed:", error);
    }
  };

  const handlePauseAuction = () => {
    try {
      writeContract({
        address: SponsorAunctionAddress as `0x${string}`,
        abi: SponsorAunctionAbi,
        functionName: auctionPaused ? "unpause" : "pause",
      });
    } catch (error) {
      console.error("Pause/unpause failed:", error);
    }
  };

  const handleWithdrawRevenue = () => {
    if (!usdcBalance) return;

    try {
      writeContract({
        address: VendingMachineAddress as `0x${string}`,
        abi: VendingMachineAbi,
        functionName: "withdrawRevenue",
        args: [usdcBalance],
      });
    } catch (error) {
      console.error("Withdraw revenue failed:", error);
    }
  };

  if (!isConnected) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">
            Connect your wallet to access admin panel
          </p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">
            You are not authorized to access this panel
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Only contract owners can access this page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">⚙️ Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage contract parameters and view statistics
        </p>
      </div>

      {/* Success Message */}
      {isSuccess && (
        <div className="mb-6 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 px-4 py-3 rounded">
          <p className="font-bold">Operation Successful! ✅</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("vending")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === "vending"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          🎰 Vending Machine
        </button>
        <button
          onClick={() => setActiveTab("auction")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === "auction"
              ? "bg-orange-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          🏆 Auction
        </button>
        <button
          onClick={() => setActiveTab("raffle")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === "raffle"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          🎟️ Raffle
        </button>
      </div>

      {/* Vending Machine Tab */}
      {activeTab === "vending" && (
        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                Total Purchases
              </p>
              <p className="text-3xl font-bold">
                {totalPurchases?.toString() || "0"}
              </p>
            </div>
            <div className="p-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400 mb-1">
                Total Revenue
              </p>
              <p className="text-3xl font-bold">
                $
                {totalRevenue && typeof totalRevenue === "bigint"
                  ? Number(formatUnits(totalRevenue, 6)).toFixed(2)
                  : "0"}
              </p>
            </div>
            <div className="p-6 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg">
              <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">
                USDC Balance
              </p>
              <p className="text-3xl font-bold">
                $
                {usdcBalance && typeof usdcBalance === "bigint"
                  ? Number(formatUnits(usdcBalance, 6)).toFixed(2)
                  : "0"}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="text-xl font-bold mb-4">Contract Controls</h3>
            <div className="flex gap-3">
              <Button
                onClick={handlePauseVending}
                disabled={isPending || isConfirming}
                className={
                  vendingPaused
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }
              >
                {vendingPaused ? "▶️ Unpause" : "⏸️ Pause"}
              </Button>
              <Button
                onClick={handleWithdrawRevenue}
                disabled={
                  isPending ||
                  isConfirming ||
                  !usdcBalance ||
                  usdcBalance === BigInt(0)
                }
              >
                💰 Withdraw Revenue
              </Button>
            </div>
          </div>

          {/* Tier Configuration */}
          <div className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="text-xl font-bold mb-4">
              Configure Tier Parameters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tier</label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(Number(e.target.value))}
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800"
                >
                  <option value={1}>Tier 1 (Bronze)</option>
                  <option value={2}>Tier 2 (Silver)</option>
                  <option value={3}>Tier 3 (Gold)</option>
                  <option value={4}>Tier 4 (Diamond)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Price (USDC)
                </label>
                <input
                  type="number"
                  value={tierPrice}
                  onChange={(e) => setTierPrice(e.target.value)}
                  placeholder="5"
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Min Value (USDC)
                </label>
                <input
                  type="number"
                  value={tierMinValue}
                  onChange={(e) => setTierMinValue(e.target.value)}
                  placeholder="1"
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Value (USDC)
                </label>
                <input
                  type="number"
                  value={tierMaxValue}
                  onChange={(e) => setTierMaxValue(e.target.value)}
                  placeholder="10"
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                checked={tierActive}
                onChange={(e) => setTierActive(e.target.checked)}
                className="w-5 h-5"
              />
              <label className="text-sm font-medium">Tier Active</label>
            </div>
            <Button
              onClick={handleSetTierParameters}
              disabled={
                isPending ||
                isConfirming ||
                !tierPrice ||
                !tierMinValue ||
                !tierMaxValue
              }
            >
              {isPending || isConfirming ? "Updating..." : "Update Tier"}
            </Button>
          </div>
        </div>
      )}

      {/* Auction Tab */}
      {activeTab === "auction" && (
        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">
                Total Auctions
              </p>
              <p className="text-3xl font-bold">
                {totalAuctions?.toString() || "0"}
              </p>
            </div>
            <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">
                Status
              </p>
              <p className="text-2xl font-bold">
                {auctionPaused ? "⏸️ Paused" : "▶️ Active"}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="text-xl font-bold mb-4">Contract Controls</h3>
            <Button
              onClick={handlePauseAuction}
              disabled={isPending || isConfirming}
              className={
                auctionPaused
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {auctionPaused ? "▶️ Unpause" : "⏸️ Pause"}
            </Button>
          </div>
        </div>
      )}

      {/* Raffle Tab */}
      {activeTab === "raffle" && (
        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg">
              <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">
                Total Raffles
              </p>
              <p className="text-3xl font-bold">
                {totalRaffles?.toString() || "0"}
              </p>
            </div>
            <div className="p-6 bg-pink-50 dark:bg-pink-900/20 border-2 border-pink-200 dark:border-pink-800 rounded-lg">
              <p className="text-sm text-pink-600 dark:text-pink-400 mb-1">
                House Fee
              </p>
              <p className="text-3xl font-bold">
                {houseFeePercent?.toString() || "0"}%
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="text-xl font-bold mb-4">Contract Controls</h3>
            <Button
              onClick={handlePauseRaffle}
              disabled={isPending || isConfirming}
              className={
                rafflePaused
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {rafflePaused ? "▶️ Unpause" : "⏸️ Pause"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
