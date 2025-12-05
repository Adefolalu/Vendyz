"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Button } from "./ui/Button";

interface WalletCredentials {
  requestId: string;
  walletAddress: string;
  privateKey: string;
  mnemonic: string;
  tier: number;
  tokens: {
    symbol: string;
    address: string;
    amount: string;
    valueUSD: number;
  }[];
  actualValue: number;
  createdAt: string;
}

interface WalletExportProps {
  requestId: string;
  onClose?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function WalletExport({ requestId, onClose }: WalletExportProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [wallet, setWallet] = useState<WalletCredentials | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  // Calculate time remaining
  useEffect(() => {
    if (!wallet?.createdAt) return;

    const interval = setInterval(() => {
      const created = new Date(wallet.createdAt).getTime();
      const fiveMinutes = 5 * 60 * 1000;
      const elapsed = Date.now() - created;
      const remaining = Math.max(0, fiveMinutes - elapsed);

      setTimeRemaining(Math.floor(remaining / 1000));

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [wallet?.createdAt]);

  const retrieveWallet = useCallback(async () => {
    if (!address || !isConnected) {
      setError("Please connect your wallet");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call backend API
      const response = await fetch(`${API_URL}/api/wallet/${requestId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buyerAddress: address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to retrieve wallet");
      }

      const data = await response.json();
      // Convert private key buffer to hex if needed
      if (data.data.privateKey && typeof data.data.privateKey === "object") {
        // Convert Buffer/Uint8Array to hex string
        const bytes =
          data.data.privateKey.data || Object.values(data.data.privateKey);
        const hexString = Array.from(bytes as number[])
          .map((b: number) => b.toString(16).padStart(2, "0"))
          .join("");
        data.data.privateKey = "0x" + hexString;
      }
      setWallet(data.data);
    } catch (err) {
      console.error("Error retrieving wallet:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to retrieve wallet. It may have expired or been deleted."
      );
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, requestId, API_URL]);

  // Auto-retrieve on mount
  useEffect(() => {
    if (requestId && address && isConnected) {
      retrieveWallet();
    }
  }, [requestId, address, isConnected, retrieveWallet]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const exportAsJSON = () => {
    if (!wallet) return;

    const dataStr = JSON.stringify(
      {
        address: wallet.walletAddress,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic,
        network: "Base Mainnet",
        tokens: wallet.tokens,
        totalValue: wallet.actualValue,
        warning:
          "KEEP THIS FILE SECURE! Anyone with access to this file has full control of the wallet.",
      },
      null,
      2
    );
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vendyz-wallet-${requestId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAsText = () => {
    if (!wallet) return;

    const textContent = `
VENDYZ WALLET EXPORT
====================

⚠️  KEEP THIS FILE SECURE! Anyone with access has full control of the wallet.

Wallet Address: ${wallet.walletAddress}
Private Key: ${wallet.privateKey}
Mnemonic Phrase: ${wallet.mnemonic}

Network: Base Mainnet
Tier: ${wallet.tier}
Total Value: $${wallet.actualValue.toFixed(2)}

Tokens:
${wallet.tokens.map((t) => `- ${t.amount} ${t.symbol} ($${t.valueUSD?.toFixed(2) || "0.00"})`).join("\n")}

Created: ${new Date(wallet.createdAt).toLocaleString()}
Request ID: ${requestId}
`.trim();

    const dataBlob = new Blob([textContent], { type: "text/plain" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vendyz-wallet-${requestId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isConnected) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <div className="text-center py-8 bg-slate-900 rounded-lg border border-white/10">
          <p className="text-slate-400 text-sm">
            Connect your wallet to retrieve your purchased gift
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <div className="text-center py-8 bg-slate-900 rounded-lg border border-white/10">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-lg font-semibold text-green-400">
            Retrieving your gift...
          </p>
          <p className="text-slate-500 text-xs mt-1">Verifying ownership...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <h3 className="text-lg font-bold text-red-400 mb-1">❌ Error</h3>
          <p className="text-red-300 text-sm">{error}</p>
          <Button
            onClick={() => (onClose ? onClose() : window.history.back())}
            className="mt-3 text-xs py-1.5"
          >
            ← Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <div className="text-center py-8 bg-slate-900 rounded-lg border border-white/10">
          <p className="text-slate-400 text-sm">No gift data available</p>
        </div>
      </div>
    );
  }

  const isExpired = timeRemaining === 0;
  const isExpiringSoon = timeRemaining !== null && timeRemaining < 60;

  return (
    <div className="h-full flex flex-col p-2 space-y-2 overflow-y-auto">
      {/* CRITICAL WARNING BANNER */}
      <div
        className={`p-2 border rounded ${
          isExpiringSoon
            ? "bg-red-900/30 border-red-500 animate-pulse"
            : "bg-yellow-900/30 border-yellow-500"
        }`}
      >
        <div className="flex items-center gap-2 justify-between">
          <div>
            <p
              className={`font-bold text-[10px] ${
                isExpiringSoon ? "text-red-300" : "text-yellow-300"
              }`}
            >
              ⚠️ Auto-deletes in:
            </p>
          </div>
          <div
            className={`text-xl font-mono font-bold ${
              isExpiringSoon ? "text-red-400" : "text-yellow-400"
            }`}
          >
            {timeRemaining !== null ? formatTime(timeRemaining) : "..."}
          </div>
        </div>
      </div>

      {/* Wallet Address */}
      <div className="p-2 border border-white/10 rounded bg-slate-900">
        <h3 className="font-bold text-[10px] mb-1 text-cyan-300">📍 Address</h3>
        <div className="flex gap-1">
          <input
            type="text"
            value={wallet.walletAddress}
            readOnly
            className="flex-1 px-2 py-1 border border-slate-700 rounded bg-slate-950 font-mono text-[9px] text-slate-300"
          />
          <button
            onClick={() =>
              copyToClipboard(wallet.walletAddress, "Wallet Address")
            }
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[9px]"
          >
            {copied === "Wallet Address" ? "✓" : "📋"}
          </button>
        </div>
      </div>

      {/* Private Key */}
      <div className="p-2 border-2 border-red-500 rounded bg-red-900/10">
        <h3 className="font-bold text-[10px] text-red-400 mb-1">
          🔑 Private Key
        </h3>
        <div className="space-y-1">
          <div className="flex gap-1">
            <input
              type={showPrivateKey ? "text" : "password"}
              value={wallet.privateKey}
              readOnly
              className="flex-1 px-2 py-1 border border-red-500/50 rounded bg-slate-950 font-mono text-[9px] text-red-200"
            />
            <button
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-[9px]"
            >
              {showPrivateKey ? "👁️" : "👁️"}
            </button>
            <button
              onClick={() => copyToClipboard(wallet.privateKey, "Private Key")}
              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[9px]"
            >
              {copied === "Private Key" ? "✓" : "📋"}
            </button>
          </div>
        </div>
      </div>

      {/* Mnemonic Phrase */}
      <div className="p-2 border-2 border-orange-500 rounded bg-orange-900/10">
        <h3 className="font-bold text-[10px] text-orange-400 mb-1">
          📝 Seed Phrase
        </h3>
        <div className="space-y-1">
          <div className="flex gap-1">
            <input
              type={showMnemonic ? "text" : "password"}
              value={wallet.mnemonic}
              readOnly
              className="flex-1 px-2 py-1 border border-orange-500/50 rounded bg-slate-950 font-mono text-[9px] text-orange-200"
            />
            <button
              onClick={() => setShowMnemonic(!showMnemonic)}
              className="px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-[9px]"
            >
              {showMnemonic ? "👁️" : "👁️"}
            </button>
            <button
              onClick={() => copyToClipboard(wallet.mnemonic, "Mnemonic")}
              className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-[9px]"
            >
              {copied === "Mnemonic" ? "✓" : "📋"}
            </button>
          </div>
        </div>
      </div>

      {/* Token Holdings */}
      <div className="p-2 border border-white/10 rounded bg-slate-900">
        <h3 className="font-bold text-[10px] mb-1 text-green-400">💰 Tokens</h3>
        <div className="space-y-1">
          {wallet.tokens.map((token, index) => (
            <div
              key={index}
              className="flex justify-between items-center p-1 bg-slate-950 rounded text-[9px]"
            >
              <div>
                <p className="font-semibold text-white">{token.symbol}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-white">{token.amount}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 pt-1 border-t border-slate-700">
          <div className="flex justify-between items-center">
            <p className="font-bold text-[10px] text-white">Total</p>
            <p className="font-bold text-sm text-green-400">
              ${wallet.actualValue.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Export Actions */}
      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={exportAsJSON}
          className="py-1 text-[9px] bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          💾 JSON
        </button>
        <button
          onClick={exportAsText}
          className="py-1 text-[9px] bg-purple-600 hover:bg-purple-700 text-white rounded"
        >
          📄 Text
        </button>
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="w-full py-1 text-[9px] bg-slate-700 hover:bg-slate-600 text-white rounded"
        >
          ✓ Close
        </button>
      )}
    </div>
  );
}
