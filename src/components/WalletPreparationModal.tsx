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
    // eslint-disable-next-line prefer-const
    let pollInterval: NodeJS.Timeout | undefined;
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
        if (pollInterval) clearInterval(pollInterval);
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
            if (pollInterval) clearInterval(pollInterval);
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

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [requestId]);

  if (status === "ready") {
    return <WalletExport requestId={requestId} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-white/30 rounded-xl shadow-2xl max-w-sm w-full p-4 md:p-6 relative overflow-hidden">
        {/* Snow texture overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        ></div>

        {status === "preparing" && (
          <div className="text-center space-y-4 relative z-10">
            {/* Animated Icon */}
            <div className="relative">
              <div className="text-6xl md:text-7xl animate-bounce">🎁</div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 md:w-20 md:h-20 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-1 text-green-400">
                HO HO HO!
              </h2>
              <p className="text-sm md:text-base text-green-200">
                Wrapping your gift{dots}
              </p>
            </div>

            {/* Status Steps */}
            <div className="bg-slate-800/50 rounded-lg p-3 text-left space-y-2 border border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
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
                <span className="text-xs md:text-sm text-green-300">
                  Purchase confirmed
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-red-500 animate-pulse flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
                <span className="text-xs md:text-sm text-red-300 font-semibold">
                  Generating wallet...
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-600"></div>
                <span className="text-xs md:text-sm text-slate-400">
                  Selecting tokens
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-600"></div>
                <span className="text-xs md:text-sm text-slate-400">
                  Funding wallet
                </span>
              </div>
            </div>

            {/* Request ID */}
            <div className="bg-slate-800 rounded-lg p-2 border border-white/10">
              <p className="text-[10px] text-slate-400 mb-0.5">Request ID:</p>
              <p className="font-mono text-xs font-semibold break-all text-cyan-300">
                {requestId}
              </p>
            </div>

            {/* Info */}
            <p className="text-[10px] text-slate-400">
              ⏱️ This usually takes 30-60 seconds
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center space-y-4 relative z-10">
            <div className="text-5xl">⚠️</div>
            <div>
              <h2 className="text-xl font-bold mb-1 text-red-400">
                Taking Longer Than Expected
              </h2>
              <p className="text-sm text-red-200">{error}</p>
            </div>

            <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3">
              <p className="text-xs text-yellow-400">
                <strong>Your Request ID:</strong>
              </p>
              <p className="font-mono text-xs font-semibold mt-1 break-all text-yellow-200">
                {requestId}
              </p>
              <p className="text-[10px] text-yellow-500 mt-2">
                Use this ID in the Wallet tab to retrieve your wallet once
                it&apos;s ready.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors text-sm border border-slate-500"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
