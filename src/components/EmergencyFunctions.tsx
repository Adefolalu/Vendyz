"use client";

import { useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits } from "viem";
import {
  VendingMachineAbi,
  VendingMachineAddress,
  RaffleManagerAbi,
  RaffleManagerAddress,
} from "~/lib/constants";

export function EmergencyFunctions() {
  const { address } = useAccount();
  const [selectedTab, setSelectedTab] = useState<"vending" | "raffle">(
    "vending"
  );

  // Check ownership
  const { data: vmOwner } = useReadContract({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    functionName: "owner",
  });

  const { data: raffleOwner } = useReadContract({
    address: RaffleManagerAddress as `0x${string}`,
    abi: RaffleManagerAbi,
    functionName: "owner",
  });

  const isVmOwner =
    address &&
    vmOwner &&
    address.toLowerCase() === (vmOwner as string).toLowerCase();
  const isRaffleOwner =
    address &&
    raffleOwner &&
    address.toLowerCase() === (raffleOwner as string).toLowerCase();

  // VendingMachine emergency state
  const [purchaseIdForFulfill, setPurchaseIdForFulfill] = useState("");
  const [purchaseIdForRefund, setPurchaseIdForRefund] = useState("");
  const [walletAddressForFulfill, setWalletAddressForFulfill] = useState("");
  const [privateKeyForFulfill, setPrivateKeyForFulfill] = useState("");

  // RaffleManager emergency state
  const [raffleIdForWinner, setRaffleIdForWinner] = useState("");
  const [raffleIdForRefund, setRaffleIdForRefund] = useState("");
  const [winnerAddressForRaffle, setWinnerAddressForRaffle] = useState("");

  // Get purchase info for timeout check
  const { data: purchaseInfo } = useReadContract({
    address: VendingMachineAddress as `0x${string}`,
    abi: VendingMachineAbi,
    functionName: "purchases",
    args: purchaseIdForFulfill ? [BigInt(purchaseIdForFulfill)] : undefined,
  });

  const purchaseData = purchaseInfo as
    | {
        buyer: string;
        tierId: bigint;
        usdcAmount: bigint;
        requestId: bigint;
        vrfRequestTimestamp: bigint;
        fulfilled: boolean;
        walletAddress: string;
      }
    | undefined;

  // Calculate timeout status
  const VRF_CALLBACK_TIMEOUT = 3600; // 1 hour in seconds
  const currentTime = Math.floor(Date.now() / 1000);
  const isTimedOut =
    purchaseData &&
    purchaseData.vrfRequestTimestamp > 0n &&
    !purchaseData.fulfilled &&
    currentTime - Number(purchaseData.vrfRequestTimestamp) >
      VRF_CALLBACK_TIMEOUT;

  // Emergency fulfill purchase
  const {
    writeContract: emergencyFulfillPurchase,
    data: fulfillHash,
    isPending: isFulfillPending,
  } = useWriteContract();

  const { isLoading: isFulfillConfirming, isSuccess: isFulfillSuccess } =
    useWaitForTransactionReceipt({ hash: fulfillHash });

  // Emergency refund purchase
  const {
    writeContract: emergencyRefundPurchase,
    data: refundHash,
    isPending: isRefundPending,
  } = useWriteContract();

  const { isLoading: isRefundConfirming, isSuccess: isRefundSuccess } =
    useWaitForTransactionReceipt({ hash: refundHash });

  // Emergency set winner
  const {
    writeContract: emergencySetWinner,
    data: setWinnerHash,
    isPending: isSetWinnerPending,
  } = useWriteContract();

  const { isLoading: isSetWinnerConfirming, isSuccess: isSetWinnerSuccess } =
    useWaitForTransactionReceipt({ hash: setWinnerHash });

  // Emergency refund raffle
  const {
    writeContract: emergencyRefundRaffle,
    data: refundRaffleHash,
    isPending: isRefundRafflePending,
  } = useWriteContract();

  const {
    isLoading: isRefundRaffleConfirming,
    isSuccess: isRefundRaffleSuccess,
  } = useWaitForTransactionReceipt({ hash: refundRaffleHash });

  const handleEmergencyFulfill = () => {
    if (
      !isVmOwner ||
      !purchaseIdForFulfill ||
      !walletAddressForFulfill ||
      !privateKeyForFulfill
    )
      return;

    emergencyFulfillPurchase({
      address: VendingMachineAddress as `0x${string}`,
      abi: VendingMachineAbi,
      functionName: "emergencyFulfillPurchase",
      args: [
        BigInt(purchaseIdForFulfill),
        walletAddressForFulfill,
        privateKeyForFulfill,
      ],
    });
  };

  const handleEmergencyRefund = () => {
    if (!isVmOwner || !purchaseIdForRefund) return;

    emergencyRefundPurchase({
      address: VendingMachineAddress as `0x${string}`,
      abi: VendingMachineAbi,
      functionName: "emergencyRefundPurchase",
      args: [BigInt(purchaseIdForRefund)],
    });
  };

  const handleEmergencySetWinner = () => {
    if (!isRaffleOwner || !raffleIdForWinner || !winnerAddressForRaffle) return;

    emergencySetWinner({
      address: RaffleManagerAddress as `0x${string}`,
      abi: RaffleManagerAbi,
      functionName: "emergencySetWinner",
      args: [
        BigInt(raffleIdForWinner),
        winnerAddressForRaffle as `0x${string}`,
      ],
    });
  };

  const handleEmergencyRefundRaffle = () => {
    if (!isRaffleOwner || !raffleIdForRefund) return;

    emergencyRefundRaffle({
      address: RaffleManagerAddress as `0x${string}`,
      abi: RaffleManagerAbi,
      functionName: "emergencyRefundRaffle",
      args: [BigInt(raffleIdForRefund)],
    });
  };

  if (!isVmOwner && !isRaffleOwner) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="p-8 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-lg text-center">
          <span className="text-5xl mb-4 block">🚫</span>
          <h2 className="text-2xl font-bold text-red-900 dark:text-red-300 mb-2">
            Access Denied
          </h2>
          <p className="text-red-700 dark:text-red-400">
            Only contract owners can access emergency functions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          🚨 Emergency Functions
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manual intervention for VRF timeouts and failed randomness callbacks
        </p>
      </div>

      {/* Warning Banner */}
      <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-900 dark:text-yellow-300">
          <strong>⚠️ WARNING:</strong> These functions bypass Chainlink VRF and
          should only be used when VRF callback fails after the 1-hour timeout
          period. All actions are logged on-chain and can be audited.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setSelectedTab("vending")}
          className={`px-4 py-2 font-semibold transition-colors ${
            selectedTab === "vending"
              ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          🎰 Vending Machine
        </button>
        <button
          onClick={() => setSelectedTab("raffle")}
          className={`px-4 py-2 font-semibold transition-colors ${
            selectedTab === "raffle"
              ? "border-b-2 border-purple-600 text-purple-600 dark:text-purple-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          🎟️ Raffle Manager
        </button>
      </div>

      {/* Vending Machine Tab */}
      {selectedTab === "vending" && (
        <div className="space-y-6">
          {/* Emergency Fulfill Purchase */}
          <div className="p-6 border-2 border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              ✅ Emergency Fulfill Purchase
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Manually complete a purchase when VRF callback fails. Requires
              purchase ID, wallet address, and private key from secure storage.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Purchase ID
                </label>
                <input
                  type="number"
                  value={purchaseIdForFulfill}
                  onChange={(e) => setPurchaseIdForFulfill(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="1"
                />
              </div>

              {purchaseData && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold mb-2">Purchase Status:</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Buyer</p>
                      <p className="font-mono text-xs">
                        {purchaseData.buyer.slice(0, 10)}...
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Amount</p>
                      <p className="font-bold">
                        ${formatUnits(purchaseData.usdcAmount, 6)} USDC
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Fulfilled</p>
                      <p
                        className={
                          purchaseData.fulfilled
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {purchaseData.fulfilled ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Timeout Status</p>
                      <p
                        className={
                          isTimedOut
                            ? "text-red-600 font-bold"
                            : "text-green-600"
                        }
                      >
                        {isTimedOut ? "⏰ TIMED OUT" : "⏳ Active"}
                      </p>
                    </div>
                  </div>
                  {purchaseData.vrfRequestTimestamp > 0n && (
                    <p className="text-xs text-gray-500 mt-2">
                      Request time:{" "}
                      {new Date(
                        Number(purchaseData.vrfRequestTimestamp) * 1000
                      ).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={walletAddressForFulfill}
                  onChange={(e) => setWalletAddressForFulfill(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 font-mono"
                  placeholder="0x..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Private Key
                </label>
                <input
                  type="password"
                  value={privateKeyForFulfill}
                  onChange={(e) => setPrivateKeyForFulfill(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 font-mono"
                  placeholder="0x..."
                />
              </div>

              <button
                onClick={handleEmergencyFulfill}
                disabled={
                  !isVmOwner ||
                  !purchaseIdForFulfill ||
                  !walletAddressForFulfill ||
                  !privateKeyForFulfill ||
                  !isTimedOut ||
                  isFulfillPending ||
                  isFulfillConfirming
                }
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors"
              >
                {isFulfillPending || isFulfillConfirming
                  ? "Processing..."
                  : "Emergency Fulfill Purchase"}
              </button>

              {isFulfillSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800 rounded-lg text-green-800 dark:text-green-300 text-sm">
                  ✅ Purchase fulfilled successfully!
                </div>
              )}
            </div>
          </div>

          {/* Emergency Refund Purchase */}
          <div className="p-6 border-2 border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              🔙 Emergency Refund Purchase
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Refund a purchase when VRF fails and cannot be fulfilled. Returns
              USDC to buyer.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Purchase ID
                </label>
                <input
                  type="number"
                  value={purchaseIdForRefund}
                  onChange={(e) => setPurchaseIdForRefund(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="1"
                />
              </div>

              <button
                onClick={handleEmergencyRefund}
                disabled={
                  !isVmOwner ||
                  !purchaseIdForRefund ||
                  isRefundPending ||
                  isRefundConfirming
                }
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors"
              >
                {isRefundPending || isRefundConfirming
                  ? "Processing..."
                  : "Emergency Refund Purchase"}
              </button>

              {isRefundSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800 rounded-lg text-green-800 dark:text-green-300 text-sm">
                  ✅ Purchase refunded successfully!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Raffle Manager Tab */}
      {selectedTab === "raffle" && (
        <div className="space-y-6">
          {/* Emergency Set Winner */}
          <div className="p-6 border-2 border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50 dark:bg-purple-900/20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              🏆 Emergency Set Winner
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Manually select a winner when VRF callback fails. Requires raffle
              ID and winner address (must be a ticket holder).
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Raffle ID
                </label>
                <input
                  type="number"
                  value={raffleIdForWinner}
                  onChange={(e) => setRaffleIdForWinner(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Winner Address
                </label>
                <input
                  type="text"
                  value={winnerAddressForRaffle}
                  onChange={(e) => setWinnerAddressForRaffle(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 font-mono"
                  placeholder="0x..."
                />
              </div>

              <button
                onClick={handleEmergencySetWinner}
                disabled={
                  !isRaffleOwner ||
                  !raffleIdForWinner ||
                  !winnerAddressForRaffle ||
                  isSetWinnerPending ||
                  isSetWinnerConfirming
                }
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors"
              >
                {isSetWinnerPending || isSetWinnerConfirming
                  ? "Processing..."
                  : "Emergency Set Winner"}
              </button>

              {isSetWinnerSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800 rounded-lg text-green-800 dark:text-green-300 text-sm">
                  ✅ Winner set successfully!
                </div>
              )}
            </div>
          </div>

          {/* Emergency Refund Raffle */}
          <div className="p-6 border-2 border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              🔙 Emergency Refund Raffle
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Refund all participants when VRF fails. Returns ticket payments to
              all buyers.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Raffle ID
                </label>
                <input
                  type="number"
                  value={raffleIdForRefund}
                  onChange={(e) => setRaffleIdForRefund(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="1"
                />
              </div>

              <button
                onClick={handleEmergencyRefundRaffle}
                disabled={
                  !isRaffleOwner ||
                  !raffleIdForRefund ||
                  isRefundRafflePending ||
                  isRefundRaffleConfirming
                }
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors"
              >
                {isRefundRafflePending || isRefundRaffleConfirming
                  ? "Processing..."
                  : "Emergency Refund Raffle"}
              </button>

              {isRefundRaffleSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800 rounded-lg text-green-800 dark:text-green-300 text-sm">
                  ✅ Raffle refunded successfully!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>ℹ️ Timeout Period:</strong> VRF callback timeout is set to 1
          hour (3600 seconds). Emergency functions should only be used after
          this period has elapsed and the VRF has confirmed failure. All
          emergency actions emit events for transparency.
        </p>
      </div>
    </div>
  );
}
