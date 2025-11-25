"use client";

import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import {
  VendingMachineAbi,
  VendingMachineAddress,
  SponsorAunctionAbi,
  SponsorAunctionAddress,
  RaffleManagerAbi,
  RaffleManagerAddress,
} from "~/lib/constants";

export function Analytics() {
  // VendingMachine stats
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

  const { data: allPurchaseIds } = useReadContract({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    functionName: "getAllPurchaseIds",
  });

  // RaffleManager stats
  const { data: totalRaffles } = useReadContract({
    address: RaffleManagerAddress as `0x${string}`,
    abi: RaffleManagerAbi,
    functionName: "totalRaffles",
  });

  const { data: activeRaffleIds } = useReadContract({
    address: RaffleManagerAddress as `0x${string}`,
    abi: RaffleManagerAbi,
    functionName: "getActiveRaffles",
  });

  const { data: houseFeePercent } = useReadContract({
    address: RaffleManagerAddress as `0x${string}`,
    abi: RaffleManagerAbi,
    functionName: "houseFeePercent",
  });

  // SponsorAuction stats
  const { data: totalAuctions } = useReadContract({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    functionName: "totalAuctions",
  });

  const { data: activeSponsors } = useReadContract({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    functionName: "getActiveSponsors",
  });

  const { data: currentAuction } = useReadContract({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    functionName: "getCurrentAuction",
  });

  const activeSponsorCount = Array.isArray(activeSponsors)
    ? activeSponsors.length
    : 0;
  const activeRaffleCount = Array.isArray(activeRaffleIds)
    ? activeRaffleIds.length
    : 0;

  const currentAuctionData = currentAuction as
    | {
        auctionId: bigint;
        startTime: bigint;
        endTime: bigint;
        availableSlots: bigint;
        winners: string[];
        winningBids: bigint[];
        finalized: boolean;
      }
    | undefined;

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">📊 Platform Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time statistics and insights
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Vending Machine Stats */}
        <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🎰</span>
            <span className="text-xs font-semibold px-2 py-1 bg-blue-600 text-white rounded-full">
              Vending
            </span>
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-300 mb-1">
            {totalPurchases?.toString() || "0"}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Total Purchases
          </p>
        </div>

        <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-2 border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">💰</span>
            <span className="text-xs font-semibold px-2 py-1 bg-green-600 text-white rounded-full">
              Revenue
            </span>
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-300 mb-1">
            $
            {totalRevenue && typeof totalRevenue === "bigint"
              ? Number(formatUnits(totalRevenue, 6)).toFixed(0)
              : "0"}
          </p>
          <p className="text-sm text-green-700 dark:text-green-400">
            Total USDC
          </p>
        </div>

        <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-2 border-purple-200 dark:border-purple-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🎟️</span>
            <span className="text-xs font-semibold px-2 py-1 bg-purple-600 text-white rounded-full">
              Raffles
            </span>
          </div>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-300 mb-1">
            {activeRaffleCount}
          </p>
          <p className="text-sm text-purple-700 dark:text-purple-400">
            Active ({totalRaffles?.toString() || "0"} total)
          </p>
        </div>

        <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-2 border-orange-200 dark:border-orange-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🏆</span>
            <span className="text-xs font-semibold px-2 py-1 bg-orange-600 text-white rounded-full">
              Sponsors
            </span>
          </div>
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-300 mb-1">
            {activeSponsorCount}
          </p>
          <p className="text-sm text-orange-700 dark:text-orange-400">
            Active Slots (of 5)
          </p>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Vending Machine Details */}
        <div className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            🎰 Vending Machine
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Total Purchases
              </span>
              <span className="font-bold">
                {totalPurchases?.toString() || "0"}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Total Revenue
              </span>
              <span className="font-bold">
                $
                {totalRevenue && typeof totalRevenue === "bigint"
                  ? Number(formatUnits(totalRevenue, 6)).toFixed(2)
                  : "0"}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Avg. Purchase Value
              </span>
              <span className="font-bold">
                $
                {totalPurchases &&
                typeof totalPurchases === "bigint" &&
                totalRevenue &&
                typeof totalRevenue === "bigint" &&
                Number(totalPurchases) > 0
                  ? (
                      Number(formatUnits(totalRevenue, 6)) /
                      Number(totalPurchases)
                    ).toFixed(2)
                  : "0"}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Unique Purchase IDs
              </span>
              <span className="font-bold">
                {Array.isArray(allPurchaseIds) ? allPurchaseIds.length : "0"}
              </span>
            </div>
          </div>
        </div>

        {/* Raffle Details */}
        <div className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            🎟️ Raffle System
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Total Raffles Created
              </span>
              <span className="font-bold">
                {totalRaffles?.toString() || "0"}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Currently Active
              </span>
              <span className="font-bold">{activeRaffleCount}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                House Fee
              </span>
              <span className="font-bold">
                {houseFeePercent?.toString() || "0"}%
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Completed Raffles
              </span>
              <span className="font-bold">
                {totalRaffles
                  ? (Number(totalRaffles) - activeRaffleCount).toString()
                  : "0"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Auction Section */}
      <div className="p-6 border-2 border-orange-200 dark:border-orange-800 rounded-lg bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          🏆 Sponsor Auction
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Total Auctions
            </p>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">
              {totalAuctions?.toString() || "0"}
            </p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Active Sponsors
            </p>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">
              {activeSponsorCount} / 5
            </p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Current Auction
            </p>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">
              #{currentAuctionData?.auctionId.toString() || "N/A"}
            </p>
          </div>
        </div>

        {currentAuctionData && (
          <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700">
            <p className="text-sm font-semibold mb-2">
              Current Auction Details:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Available Slots</p>
                <p className="font-bold">
                  {currentAuctionData.availableSlots.toString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Winners</p>
                <p className="font-bold">{currentAuctionData.winners.length}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Status</p>
                <p className="font-bold">
                  {currentAuctionData.finalized ? "Finalized" : "Active"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">End Time</p>
                <p className="font-bold text-xs">
                  {new Date(
                    Number(currentAuctionData.endTime) * 1000
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Platform Overview */}
      <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
        <h2 className="text-xl font-bold mb-4">📈 Platform Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {totalPurchases?.toString() || "0"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Wallets Sold
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
              $
              {totalRevenue && typeof totalRevenue === "bigint"
                ? Number(formatUnits(totalRevenue, 6)).toFixed(0)
                : "0"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Volume (USDC)
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              {totalRaffles?.toString() || "0"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Raffles Created
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
              {totalAuctions?.toString() || "0"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Auctions Held
            </p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>ℹ️ Note:</strong> All statistics are fetched in real-time from
          the blockchain. Data updates automatically as transactions are
          confirmed.
        </p>
      </div>
    </div>
  );
}
