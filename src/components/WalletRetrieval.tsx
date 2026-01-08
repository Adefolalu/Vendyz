"use client";

import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Button } from "./ui/Button";
import { API_BASE_URL } from "~/lib/constants";

interface WalletData {
  address: string;
  privateKey: string;
  requestId: string;
  tokens: {
    symbol: string;
    address: string;
    amount: string;
    valueUSD: string;
  }[];
  totalValueUSD: string;
}

export function WalletRetrieval() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [requestId, setRequestId] = useState("");
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRetrieve = async () => {
    if (!requestId) {
      setError("Please enter a request ID");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const message = `Retrieve wallet for request ${requestId}`;
      const signature = await signMessageAsync({ message });

      const response = await fetch(`${API_BASE_URL}/api/wallet/${requestId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buyerAddress: address,
          signature,
          message,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Wallet not found or not ready yet");
      }

      setWallet(data.data);
    } catch (err) {a);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to retrieve wallet"
      );
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportAsJSON = () => {
    if (!wallet) return;

    const dataStr = JSON.stringify(wallet, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vendyz-wallet-${wallet.requestId}.json`;
    link.click();
  };

  const addToMetaMask = async () => {
    if (!wallet) return;

    try {
      // @ts-ignore
      if (typeof window.ethereum !== "undefined") {
        // @ts-ignore
        await window.ethereum.request({
          method: "wallet_importAccount",
          params: [wallet.privateKey],
        });
      } else {
        alert("MetaMask is not installed");
      }
    } catch (err) {
      console.error("Failed to add to MetaMask:", err);
      alert(
        "Note: You'll need to manually import the private key into MetaMask"
      );
    }
  };

  if (!isConnected) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">
            Connect your wallet to retrieve purchased wallets
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">🔓 Retrieve Your Wallet</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Enter your purchase request ID to retrieve your anonymous wallet
        </p>
      </div>

      {/* Request ID Input */}
      {!wallet && (
        <div className="max-w-md mx-auto mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Purchase Request ID
              </label>
              <input
                type="text"
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                placeholder="Enter request ID from purchase history"
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <Button
              onClick={handleRetrieve}
              disabled={loading || !requestId}
              className="w-full py-3"
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="animate-spin">⏳</span>
                  Retrieving...
                </span>
              ) : (
                "Retrieve Wallet"
              )}
            </Button>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h3 className="font-bold text-yellow-900 dark:text-yellow-300 mb-2">
              ⚠️ Security Warning
            </h3>
            <ul className="text-sm text-yellow-800 dark:text-yellow-400 space-y-1">
              <li>• Only retrieve wallets on a secure, private device</li>
              <li>• Never share your private key with anyone</li>
              <li>• Store private keys securely offline</li>
              <li>
                • Consider transferring funds to your main wallet immediately
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Wallet Display */}
      {wallet && (
        <div className="space-y-6">
          {/* Success Message */}
          <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 px-4 py-3 rounded">
            <p className="font-bold">Wallet Retrieved Successfully! 🎉</p>
          </div>

          {/* Wallet Address */}
          <div className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="font-bold mb-3">📍 Wallet Address</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={wallet.address}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 font-mono text-sm"
              />
              <Button
                onClick={() => copyToClipboard(wallet.address, "Address")}
                className="px-4"
              >
                {copied ? "✓" : "📋"}
              </Button>
            </div>
          </div>

          {/* Private Key */}
          <div className="p-6 border-2 border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-900/10">
            <h3 className="font-bold text-red-900 dark:text-red-300 mb-3">
              🔑 Private Key (Keep Secret!)
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type={showPrivateKey ? "text" : "password"}
                  value={wallet.privateKey}
                  readOnly
                  className="flex-1 px-4 py-2 border border-red-300 dark:border-red-700 rounded bg-white dark:bg-gray-800 font-mono text-sm"
                />
                <Button
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="px-4"
                >
                  {showPrivateKey ? "👁️" : "🙈"}
                </Button>
                <Button
                  onClick={() =>
                    copyToClipboard(wallet.privateKey, "Private Key")
                  }
                  className="px-4"
                >
                  📋
                </Button>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400">
                ⚠️ Anyone with this private key has full control of the wallet.
                Store it securely!
              </p>
            </div>
          </div>

          {/* Token Holdings */}
          <div className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="font-bold mb-4">💰 Token Holdings</h3>
            <div className="space-y-3">
              {wallet.tokens.map((token, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <div>
                    <p className="font-semibold">{token.symbol}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {token.address.slice(0, 10)}...{token.address.slice(-8)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{token.amount}</p>
                    <p className="text-sm text-gray-500">${token.valueUSD}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <p className="font-bold text-lg">Total Value</p>
                <p className="font-bold text-2xl text-green-600 dark:text-green-400">
                  ${wallet.totalValueUSD}
                </p>
              </div>
            </div>
          </div>

          {/* Export Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={exportAsJSON} className="w-full">
              💾 Export JSON
            </Button>
            <Button onClick={addToMetaMask} className="w-full">
              🦊 Add to MetaMask
            </Button>
            <Button
              onClick={() => {
                setWallet(null);
                setRequestId("");
              }}
              className="w-full bg-gray-500 hover:bg-gray-600"
            >
              ← Back
            </Button>
          </div>

          {/* Next Steps */}
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-3">
              📝 Next Steps
            </h3>
            <ol className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
              <li>1. Save your private key in a secure password manager</li>
              <li>2. Import the wallet into MetaMask or another wallet app</li>
              <li>3. Consider moving funds to your main wallet for security</li>
              <li>4. The wallet is on Base network - add Base RPC if needed</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
