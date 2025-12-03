"use client";

import { useEffect, useState } from "react";
import { useWatchContractEvent } from "wagmi";
import {
  VendingMachineAbi,
  VendingMachineAddress,
  SponsorAunctionAbi,
  SponsorAunctionAddress,
  RaffleManagerAbi,
  RaffleManagerAddress,
} from "~/lib/constants";

interface Notification {
  id: string;
  type: "success" | "info" | "warning";
  title: string;
  message: string;
  timestamp: number;
}

export function EventListener() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const addNotification = (
    type: "success" | "info" | "warning",
    title: string,
    message: string
  ) => {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: Date.now(),
    };

    setNotifications((prev) => [notification, ...prev].slice(0, 5)); // Keep last 5

    // Auto-remove after 10 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }, 10000);
  };

  // VendingMachine Events
  useWatchContractEvent({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    eventName: "WalletReady",
    enabled: isOnline,
    pollingInterval: 4000, // Poll every 4 seconds instead of default 1s
    onLogs(logs) {
      logs.forEach((log) => {
        const args = (log as any).args as { requestId: bigint };
        addNotification(
          "success",
          "Wallet Ready! 🎉",
          `Your purchased wallet is ready to retrieve! Request ID: ${args.requestId}`
        );
      });
    },
    onError(error) {
      console.warn(
        "EventListener: Network error, will retry when online",
        error.message
      );
    },
  });

  useWatchContractEvent({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    eventName: "PurchaseInitiated",
    enabled: isOnline,
    pollingInterval: 4000,
    onLogs(logs) {
      logs.forEach((log) => {
        addNotification(
          "info",
          "Purchase Initiated ⏳",
          `Wallet purchase started! Waiting for Chainlink VRF...`
        );
      });
    },
    onError(error) {
      console.warn(
        "EventListener: Network error, will retry when online",
        error.message
      );
    },
  });

  useWatchContractEvent({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    eventName: "PurchaseRefunded",
    enabled: isOnline,
    pollingInterval: 4000,
    onLogs(logs) {
      logs.forEach((log) => {
        const args = (log as any).args as { requestId: bigint };
        addNotification(
          "warning",
          "Purchase Refunded",
          `Your purchase was refunded. Request ID: ${args.requestId}`
        );
      });
    },
    onError(error) {
      console.warn(
        "EventListener: Network error, will retry when online",
        error.message
      );
    },
  });

  // SponsorAuction Events
  useWatchContractEvent({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    eventName: "AuctionFinalized",
    enabled: isOnline,
    pollingInterval: 8000, // Less frequent for auction events (8s)
    onLogs(logs) {
      logs.forEach((log) => {
        const args = (log as any).args as { auctionId: bigint };
        addNotification(
          "info",
          "Auction Finalized 🏆",
          `Auction #${args.auctionId} has been finalized! Check the winners!`
        );
      });
    },
    onError(error) {
      console.warn(
        "EventListener: Network error, will retry when online",
        error.message
      );
    },
  });

  useWatchContractEvent({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    eventName: "BidPlaced",
    enabled: isOnline,
    pollingInterval: 8000,
    onLogs(logs) {
      logs.forEach((log) => {
        addNotification(
          "info",
          "New Bid Placed 💰",
          `A new bid was placed in the auction!`
        );
      });
    },
    onError(error) {
      console.warn(
        "EventListener: Network error, will retry when online",
        error.message
      );
    },
  });

  useWatchContractEvent({
    address: SponsorAunctionAddress as `0x${string}`,
    abi: SponsorAunctionAbi,
    eventName: "SponsorAdded",
    enabled: isOnline,
    pollingInterval: 8000,
    onLogs(logs) {
      logs.forEach((log) => {
        addNotification(
          "success",
          "New Sponsor Added! 🎯",
          `A new token is now being included in wallets!`
        );
      });
    },
    onError(error) {
      console.warn(
        "EventListener: Network error, will retry when online",
        error.message
      );
    },
  });

  // RaffleManager Events
  useWatchContractEvent({
    address: RaffleManagerAddress as `0x${string}`,
    abi: RaffleManagerAbi,
    eventName: "RaffleCreated",
    enabled: isOnline,
    pollingInterval: 10000, // Raffle events are less frequent (10s)
    onLogs(logs) {
      logs.forEach((log) => {
        const args = (log as any).args as { raffleId: bigint };
        addNotification(
          "info",
          "New Raffle Created! 🎟️",
          `Raffle #${args.raffleId} is now live! Buy tickets to win!`
        );
      });
    },
    onError(error) {
      console.warn(
        "EventListener: Network error, will retry when online",
        error.message
      );
    },
  });

  useWatchContractEvent({
    address: RaffleManagerAddress as `0x${string}`,
    abi: RaffleManagerAbi,
    eventName: "WinnerSelected",
    enabled: isOnline,
    pollingInterval: 10000,
    onLogs(logs) {
      logs.forEach((log) => {
        const args = (log as any).args as { raffleId: bigint };
        addNotification(
          "success",
          "Winner Selected! 🏆",
          `Raffle #${args.raffleId} has a winner! Check if it's you!`
        );
      });
    },
    onError(error) {
      console.warn(
        "EventListener: Network error, will retry when online",
        error.message
      );
    },
  });

  useWatchContractEvent({
    address: RaffleManagerAddress as `0x${string}`,
    abi: RaffleManagerAbi,
    eventName: "TicketsPurchased",
    enabled: isOnline,
    pollingInterval: 10000,
    onLogs(logs) {
      logs.forEach((log) => {
        const args = (log as any).args as { raffleId: bigint; amount: bigint };
        addNotification(
          "info",
          "Tickets Purchased 🎫",
          `Someone bought ${args.amount} tickets for Raffle #${args.raffleId}!`
        );
      });
    },
    onError(error) {
      console.warn(
        "EventListener: Network error, will retry when online",
        error.message
      );
    },
  });

  useWatchContractEvent({
    address: RaffleManagerAddress as `0x${string}`,
    abi: RaffleManagerAbi,
    eventName: "RaffleFilled",
    enabled: isOnline,
    pollingInterval: 10000,
    onLogs(logs) {
      logs.forEach((log) => {
        const args = (log as any).args as { raffleId: bigint };
        addNotification(
          "warning",
          "Raffle Full! 📢",
          `Raffle #${args.raffleId} is now full! Winner will be selected soon.`
        );
      });
    },
    onError(error) {
      console.warn(
        "EventListener: Network error, will retry when online",
        error.message
      );
    },
  });

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg shadow-lg border-2 animate-slide-in ${
            notification.type === "success"
              ? "bg-green-100 dark:bg-green-900 border-green-400 dark:border-green-600 text-green-800 dark:text-green-200"
              : notification.type === "warning"
                ? "bg-yellow-100 dark:bg-yellow-900 border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200"
                : "bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-200"
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <p className="font-bold text-sm">{notification.title}</p>
            <button
              onClick={() =>
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== notification.id)
                )
              }
              className="text-lg leading-none hover:opacity-70"
            >
              ×
            </button>
          </div>
          <p className="text-xs">{notification.message}</p>
        </div>
      ))}
    </div>
  );
}
