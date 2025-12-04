"use client";

import { useReadContract } from "wagmi";
import { RaffleManagerAbi, RaffleManagerAddress } from "~/lib/constants";
import { formatUnits } from "viem";
import { Button } from "./ui/Button";

export function RaffleCard() {
  // Read current raffle
  const { data: currentRaffle, isLoading } = useReadContract({
    address: RaffleManagerAddress as `0x${string}`,
    abi: RaffleManagerAbi,
    functionName: "getCurrentRaffle",
  });

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

  if (!currentRaffle) return null;

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
      className="w-full p-4 rounded-lg border-2"
      style={{
        backgroundColor: "#f0fdf4",
        borderColor: "#16a34a",
        color: "#000000",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          🎄 Holiday Raffle
        </h2>
        <span className="text-xs font-semibold px-2 py-0.5 bg-red-600 text-white rounded-full">
          #{raffle.raffleId.toString()}
        </span>
      </div>

      {/* Prize Pool */}
      <div
        className="mb-3 p-3 rounded-lg"
        style={{ backgroundColor: "#dcfce7", color: "#000000" }}
      >
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          Prize Pool
        </p>
        <p className="text-2xl font-bold text-red-600 dark:text-red-500">
          ${prizePoolUSDC} USDC
        </p>
        <p className="text-[10px] text-gray-500 mt-1">90% goes to winner</p>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600 dark:text-gray-400">Tickets Sold</span>
          <span className="font-semibold">
            {raffle.ticketsSold.toString()} / {raffle.maxTickets.toString()}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-red-500 to-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Ticket Info */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div
          className="p-2 rounded"
          style={{ backgroundColor: "#dcfce7", color: "#000000" }}
        >
          <p className="text-gray-600 dark:text-gray-400 mb-1">Ticket Price</p>
          <p className="font-bold">$1 USDC</p>
        </div>
        <div
          className="p-2 rounded"
          style={{ backgroundColor: "#dcfce7", color: "#000000" }}
        >
          <p className="text-gray-600 dark:text-gray-400 mb-1">Max Per User</p>
          <p className="font-bold">5 tickets</p>
        </div>
      </div>

      <Button className="w-full bg-gradient-to-r from-red-600 to-green-600 hover:from-red-700 hover:to-green-700 text-sm py-2">
        Buy Tickets 🎫
      </Button>
    </div>
  );
}
