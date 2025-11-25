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
        className="w-full p-6 rounded-lg border-2"
        style={{
          backgroundColor: "#EEFFBE",
          borderColor: "#c8d99a",
          color: "#000000",
        }}
      >
        <div className="animate-pulse">Loading raffle...</div>
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
      className="w-full p-6 rounded-lg border-2"
      style={{
        backgroundColor: "#EEFFBE",
        borderColor: "#c8d99a",
        color: "#000000",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          🎟️ Active Raffle
        </h2>
        <span className="text-sm font-semibold px-3 py-1 bg-purple-600 text-white rounded-full">
          #{raffle.raffleId.toString()}
        </span>
      </div>

      {/* Prize Pool */}
      <div
        className="mb-4 p-4 rounded-lg"
        style={{ backgroundColor: "#f5ffdb", color: "#000000" }}
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Prize Pool
        </p>
        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
          ${prizePoolUSDC} USDC
        </p>
        <p className="text-xs text-gray-500 mt-1">90% goes to winner</p>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">Tickets Sold</span>
          <span className="font-semibold">
            {raffle.ticketsSold.toString()} / {raffle.maxTickets.toString()}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Ticket Info */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div
          className="p-3 rounded"
          style={{ backgroundColor: "#f5ffdb", color: "#000000" }}
        >
          <p className="text-gray-600 dark:text-gray-400 mb-1">Ticket Price</p>
          <p className="font-bold">$1 USDC</p>
        </div>
        <div
          className="p-3 rounded"
          style={{ backgroundColor: "#f5ffdb", color: "#000000" }}
        >
          <p className="text-gray-600 dark:text-gray-400 mb-1">Max Per User</p>
          <p className="font-bold">5 tickets</p>
        </div>
      </div>

      <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
        Buy Tickets 🎫
      </Button>
    </div>
  );
}
