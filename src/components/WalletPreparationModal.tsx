"use client";

import { useState, useEffect } from "react";
import { WalletExport } from "./WalletExport";

interface WalletPreparationModalProps {
  requestId: string;
  onClose: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function WalletPreparationModal({
  requestId,
  onClose,
}: WalletPreparationModalProps) {
  const [status, setStatus] = useState<"preparing" | "ready" | "error">(
    "preparing"
  );
  const [error, setError] = useState<string | null>(null);
  const [dots, setDots] = useState("");

  // Animated dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Poll backend to check if wallet is ready
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes (60 * 2 seconds)

    const checkWalletStatus = async () => {
      attempts++;

      // Stop after max attempts
      if (attempts > maxAttempts) {
        setStatus("error");
        setError(
          "Wallet preparation is taking longer than expected. Please check back in a moment using the Wallet tab with your Request ID."
        );
        clearInterval(pollInterval);
        return;
      }

      try {
        // Simple check: try to fetch wallet status
        const response = await fetch(
          `${API_URL}/api/wallet/${requestId}/status`
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.ready) {
            setStatus("ready");
            clearInterval(pollInterval);
          } else {
            // Wallet not ready yet, continue polling
            console.log(
              `Wallet not ready yet (attempt ${attempts}/${maxAttempts})...`
            );
          }
        } else if (response.status === 404) {
          // Wallet not ready yet, continue polling
          console.log(
            `Wallet not ready yet (attempt ${attempts}/${maxAttempts})...`
          );
        } else {
          // Other error
          console.error("Error checking wallet status:", response.status);
        }
      } catch (err) {
        console.error("Error polling wallet status:", err);
      }
    };

    // Start polling every 2 seconds
    pollInterval = setInterval(checkWalletStatus, 2000);
    checkWalletStatus(); // Check immediately

    return () => clearInterval(pollInterval);
  }, [requestId]);

  if (status === "ready") {
    return <WalletExport requestId={requestId} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-8">
        {status === "preparing" && (
          <div className="text-center space-y-6">
            {/* Animated Icon */}
            <div className="relative">
              <div className="text-8xl animate-bounce">🎉</div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-3xl font-bold mb-2">Congratulations!</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Preparing your rewards{dots}
              </p>
            </div>

            {/* Status Steps */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-left space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
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
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Purchase confirmed
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 animate-pulse flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
                  Generating your wallet...
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Selecting tokens
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Funding wallet
                </span>
              </div>
            </div>

            {/* Request ID */}
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Request ID:
              </p>
              <p className="font-mono text-sm font-semibold break-all">
                {requestId}
              </p>
            </div>

            {/* Info */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ⏱️ This usually takes 30-60 seconds
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center space-y-6">
            <div className="text-6xl">⚠️</div>
            <div>
              <h2 className="text-2xl font-bold mb-2 text-red-900 dark:text-red-300">
                Taking Longer Than Expected
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{error}</p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                <strong>Your Request ID:</strong>
              </p>
              <p className="font-mono text-sm font-semibold mt-1 break-all">
                {requestId}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-2">
                Use this ID in the Wallet tab to retrieve your wallet once it's
                ready.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
