"use client";

import { useReadContract } from "wagmi";
import { RaffleManagerAbi, RaffleManagerAddress } from "~/lib/constants";
import { formatUnits } from "viem";
import { Button } from "./ui/Button";

export function RaffleCard() {
  // Read active raffle IDs
  const { data: activeRaffleIds, isLoading: isLoadingIds } = useReadContract({
    address: RaffleManagerAddress as `0x${string}`,
    abi: RaffleManagerAbi,
    functionName: "getActiveRaffles",
  });

  const latestRaffleId =
    activeRaffleIds &&
    Array.isArray(activeRaffleIds) &&
    activeRaffleIds.length > 0
      ? activeRaffleIds[activeRaffleIds.length - 1]
      : undefined;

  // Read current raffle
  const { data: currentRaffle, isLoading: isLoadingRaffle } = useReadContract({
    address: RaffleManagerAddress as `0x${string}`,
    abi: RaffleManagerAbi,
    functionName: "getRaffle",
    args: latestRaffleId ? [latestRaffleId] : undefined,
    query: {
      enabled: !!latestRaffleId,
    },
  });

  const isLoading = isLoadingIds || (!!latestRaffleId && isLoadingRaffle);

  if (isLoading) {
    return (
      <div
        className="w-full p-4 rounded-lg border-2"
        style={{
          backgroundColor: "#f0fdf4",
          borderColor: "#16a34a",
          color: "#000000",
        }}
      >
        <div className="animate-pulse text-sm">Loading raffle...</div>
      </div>
    );
  }

  if (!currentRaffle) {
    return (
      <div
        className="w-full p-4 rounded-lg border-2"
        style={{
          backgroundColor: "#f0fdf4",
          borderColor: "#16a34a",
          color: "#000000",
        }}
      >
        <div className="text-center text-sm font-bold">
          No active raffle at the moment. Check back later! 🎄
        </div>
      </div>
    );
  }

  const raffle = currentRaffle as {
    raffleId: bigint;
    ticketPrice: bigint;
    maxTickets: bigint;
    ticketsSold: bigint;
    prizePool: bigint;
    winner: string;
    completed: boolean;
    startTime: bigint;
    endTime: bigint;
  };

  const progress =
    (Number(raffle.ticketsSold) / Number(raffle.maxTickets)) * 100;
  const prizePoolUSDC = formatUnits(raffle.prizePool || BigInt(0), 6);

  return (
    <div
      className="w-full p-8 rounded-3xl border-4 shadow-xl transform hover:scale-[1.02] transition-all duration-300"
      style={{
        backgroundColor: "#f0fdf4",
        borderColor: "#16a34a",
        color: "#000000",
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-black flex items-center gap-3 tracking-tight">
          🎄 Holiday Raffle
        </h2>
        <span className="text-sm font-bold px-4 py-1.5 bg-red-600 text-white rounded-full shadow-lg shadow-red-600/20">
          #{raffle.raffleId.toString()}
        </span>
      </div>

      {/* Prize Pool */}
      <div
        className="mb-8 p-6 rounded-2xl border-2 border-green-200 shadow-inner"
        style={{ backgroundColor: "#dcfce7", color: "#000000" }}
      >
        <p className="text-sm font-bold text-green-800 uppercase tracking-wider mb-2">
          Current Prize Pool
        </p>
        <p className="text-5xl font-black text-red-600 dark:text-red-500 tracking-tighter mb-2">
          ${prizePoolUSDC} <span className="text-2xl text-red-400">USDC</span>
        </p>
        <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-100 w-fit px-3 py-1 rounded-full">
          <span>✨ 90% to Winner</span>
          <span>•</span>
          <span>🏠 10% House Fee</span>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm font-bold mb-3">
          <span className="text-gray-600">Tickets Sold</span>
          <span className="text-green-700">
            {raffle.ticketsSold.toString()} / {raffle.maxTickets.toString()}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-6 shadow-inner overflow-hidden border border-gray-300">
          <div
            className="bg-gradient-to-r from-red-500 via-orange-500 to-green-500 h-full transition-all duration-500 ease-out relative"
            style={{ width: `${Math.max(5, progress)}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>
        <div className="mt-2 text-right text-xs font-bold text-green-600">
          {progress.toFixed(1)}% Filled
        </div>
      </div>

      {/* Ticket Info */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div
          className="p-4 rounded-2xl border border-green-200"
          style={{ backgroundColor: "#dcfce7", color: "#000000" }}
        >
          <p className="text-xs font-bold text-green-800 uppercase mb-1">
            Ticket Price
          </p>
          <p className="text-2xl font-black">$1 USDC</p>
        </div>
        <div
          className="p-4 rounded-2xl border border-green-200"
          style={{ backgroundColor: "#dcfce7", color: "#000000" }}
        >
          <p className="text-xs font-bold text-green-800 uppercase mb-1">
            Max Per User
          </p>
          <p className="text-2xl font-black">100 Tickets</p>
        </div>
      </div>

      <Button className="w-full bg-gradient-to-r from-red-600 to-green-600 hover:from-red-700 hover:to-green-700 text-xl font-black py-6 rounded-2xl shadow-xl shadow-green-600/20 transform active:scale-95 transition-all">
        Buy Tickets 🎫
      </Button>
    </div>
  );
}
