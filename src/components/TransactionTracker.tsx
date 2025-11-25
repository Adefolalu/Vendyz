"use client";

import { useState, useEffect } from "react";

interface TransactionStatus {
  hash: string;
  status: "pending" | "confirming" | "success" | "error";
  title: string;
  timestamp: number;
}

export function TransactionTracker() {
  const [transactions, setTransactions] = useState<TransactionStatus[]>([]);

  useEffect(() => {
    const handleNewTx = (event: CustomEvent) => {
      const newTx: TransactionStatus = {
        ...event.detail,
        timestamp: Date.now(),
      };
      setTransactions((prev) => [newTx, ...prev].slice(0, 5)); // Keep last 5
    };

    const handleUpdateTx = (event: CustomEvent) => {
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.hash === event.detail.hash
            ? { ...tx, status: event.detail.status }
            : tx
        )
      );
    };

    window.addEventListener("new-transaction" as any, handleNewTx);
    window.addEventListener("update-transaction" as any, handleUpdateTx);

    return () => {
      window.removeEventListener("new-transaction" as any, handleNewTx);
      window.removeEventListener("update-transaction" as any, handleUpdateTx);
    };
  }, []);

  const removeTx = (hash: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.hash !== hash));
  };

  if (transactions.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 z-40 space-y-2 max-w-sm">
      {transactions.map((tx) => (
        <TransactionCard
          key={tx.hash}
          transaction={tx}
          onRemove={() => removeTx(tx.hash)}
        />
      ))}
    </div>
  );
}

function TransactionCard({
  transaction,
  onRemove,
}: {
  transaction: TransactionStatus;
  onRemove: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto-remove successful transactions after 5s
    if (transaction.status === "success") {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onRemove, 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [transaction.status, onRemove]);

  const getStatusIcon = () => {
    switch (transaction.status) {
      case "pending":
      case "confirming":
        return "⏳";
      case "success":
        return "✅";
      case "error":
        return "❌";
    }
  };

  const getStatusText = () => {
    switch (transaction.status) {
      case "pending":
        return "Waiting for signature...";
      case "confirming":
        return "Confirming on Base...";
      case "success":
        return "Confirmed!";
      case "error":
        return "Failed";
    }
  };

  const getBackgroundColor = () => {
    switch (transaction.status) {
      case "success":
        return "#d4e7a0";
      case "error":
        return "#f5d0d0";
      default:
        return "#e8f5d0";
    }
  };

  const getBorderColor = () => {
    switch (transaction.status) {
      case "success":
        return "#b8d47a";
      case "error":
        return "#d47a7a";
      default:
        return "#d4e7a0";
    }
  };

  const basescanUrl = `https://basescan.org/tx/${transaction.hash}`;

  return (
    <div
      className={`p-4 rounded-lg shadow-lg border-2 transition-all duration-300 ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
      }`}
      style={{
        backgroundColor: getBackgroundColor(),
        borderColor: getBorderColor(),
        color: "#000000",
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getStatusIcon()}</span>
          <div>
            <p className="font-bold text-sm">{transaction.title}</p>
            <p className="text-xs" style={{ opacity: 0.8 }}>
              {getStatusText()}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onRemove, 300);
          }}
          className="text-lg font-bold hover:opacity-70 transition-opacity"
        >
          ×
        </button>
      </div>

      {transaction.status !== "pending" && (
        <a
          href={basescanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs flex items-center gap-1 hover:underline mt-2"
          style={{ color: "#000000", opacity: 0.7 }}
        >
          <span>View on Basescan</span>
          <span>↗</span>
        </a>
      )}

      {transaction.status === "confirming" && (
        <div className="mt-2">
          <div
            className="w-full h-1 rounded-full"
            style={{ backgroundColor: "#c8d99a" }}
          >
            <div
              className="h-1 rounded-full animate-pulse"
              style={{
                backgroundColor: "#000000",
                width: "60%",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions to trigger transaction tracking
export function trackTransaction(hash: string, title: string) {
  const event = new CustomEvent("new-transaction", {
    detail: {
      hash,
      status: "pending",
      title,
    },
  });
  window.dispatchEvent(event);
}

export function updateTransactionStatus(
  hash: string,
  status: "confirming" | "success" | "error"
) {
  const event = new CustomEvent("update-transaction", {
    detail: { hash, status },
  });
  window.dispatchEvent(event);
}
