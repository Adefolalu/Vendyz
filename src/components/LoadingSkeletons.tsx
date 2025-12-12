"use client";

/**
 * Loading Skeleton Components
 *
 * Reusable skeleton loaders for better UX during async operations
 */

export function TierCardSkeleton() {
  return (
    <div
      className="p-4 rounded-lg border-2 animate-pulse"
      style={{ backgroundColor: "#fef2f2", borderColor: "#ef4444" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className="h-5 w-20 rounded"
          style={{ backgroundColor: "#fecaca" }}
        />
        <div
          className="h-5 w-12 rounded"
          style={{ backgroundColor: "#fecaca" }}
        />
      </div>
      <div className="space-y-2">
        <div
          className="h-3 w-full rounded"
          style={{ backgroundColor: "#fecaca" }}
        />
        <div
          className="h-3 w-3/4 rounded"
          style={{ backgroundColor: "#fecaca" }}
        />
        <div
          className="h-3 w-5/6 rounded"
          style={{ backgroundColor: "#fecaca" }}
        />
      </div>
    </div>
  );
}

export function RaffleCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
      {/* Badge & ID */}
      <div className="flex justify-end mb-6">
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>

      {/* Prize Pool */}
      <div className="mb-6">
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
        <div>
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div>
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>

      {/* Button */}
      <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-xl" />
    </div>
  );
}

export function PurchaseHistorySkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-4 rounded-lg border animate-pulse"
          style={{ backgroundColor: "#f5ffdb", borderColor: "#c8d99a" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="h-6 w-32 rounded"
              style={{ backgroundColor: "#e0f0a0" }}
            />
            <div
              className="h-6 w-20 rounded-full"
              style={{ backgroundColor: "#e0f0a0" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div
                className="h-4 w-16 rounded mb-1"
                style={{ backgroundColor: "#e0f0a0" }}
              />
              <div
                className="h-5 w-24 rounded"
                style={{ backgroundColor: "#e0f0a0" }}
              />
            </div>
            <div>
              <div
                className="h-4 w-20 rounded mb-1"
                style={{ backgroundColor: "#e0f0a0" }}
              />
              <div
                className="h-5 w-28 rounded"
                style={{ backgroundColor: "#e0f0a0" }}
              />
            </div>
          </div>
          <div
            className="h-10 w-full rounded"
            style={{ backgroundColor: "#e0f0a0" }}
          />
        </div>
      ))}
    </div>
  );
}

export function AuctionCardSkeleton() {
  return (
    <div
      className="p-6 rounded-lg border-2 animate-pulse"
      style={{ backgroundColor: "#EEFFBE", borderColor: "#c8d99a" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="h-8 w-56 rounded"
          style={{ backgroundColor: "#e0f0a0" }}
        />
        <div
          className="h-6 w-12 rounded-full"
          style={{ backgroundColor: "#e0f0a0" }}
        />
      </div>
      <div
        className="mb-4 p-4 rounded-lg"
        style={{ backgroundColor: "#f5ffdb" }}
      >
        <div
          className="h-4 w-32 rounded mb-2"
          style={{ backgroundColor: "#e0f0a0" }}
        />
        <div
          className="h-8 w-28 rounded"
          style={{ backgroundColor: "#e0f0a0" }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded" style={{ backgroundColor: "#f5ffdb" }}>
          <div
            className="h-4 w-24 rounded mb-1"
            style={{ backgroundColor: "#e0f0a0" }}
          />
          <div
            className="h-5 w-16 rounded"
            style={{ backgroundColor: "#e0f0a0" }}
          />
        </div>
        <div className="p-3 rounded" style={{ backgroundColor: "#f5ffdb" }}>
          <div
            className="h-4 w-16 rounded mb-1"
            style={{ backgroundColor: "#e0f0a0" }}
          />
          <div
            className="h-5 w-20 rounded"
            style={{ backgroundColor: "#e0f0a0" }}
          />
        </div>
      </div>
      <div
        className="h-12 w-full rounded"
        style={{ backgroundColor: "#e0f0a0" }}
      />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div
      className="p-6 rounded-lg border-2 animate-pulse"
      style={{ backgroundColor: "#f5ffdb", borderColor: "#c8d99a" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className="h-6 w-6 rounded"
          style={{ backgroundColor: "#e0f0a0" }}
        />
        <div
          className="h-5 w-16 rounded-full"
          style={{ backgroundColor: "#e0f0a0" }}
        />
      </div>
      <div
        className="h-10 w-24 rounded mb-1"
        style={{ backgroundColor: "#e0f0a0" }}
      />
      <div
        className="h-4 w-32 rounded"
        style={{ backgroundColor: "#e0f0a0" }}
      />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div
      className="flex items-center justify-between p-3 rounded animate-pulse"
      style={{ backgroundColor: "#f5ffdb" }}
    >
      <div
        className="h-4 w-32 rounded"
        style={{ backgroundColor: "#e0f0a0" }}
      />
      <div
        className="h-4 w-24 rounded"
        style={{ backgroundColor: "#e0f0a0" }}
      />
      <div
        className="h-4 w-20 rounded"
        style={{ backgroundColor: "#e0f0a0" }}
      />
      <div
        className="h-8 w-24 rounded"
        style={{ backgroundColor: "#e0f0a0" }}
      />
    </div>
  );
}

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
}

export function Spinner({ size = "md", message }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} border-solid rounded-full animate-spin`}
        style={{
          borderColor: "#e0f0a0",
          borderTopColor: "#000000",
        }}
      />
      {message && (
        <p
          className="text-sm font-medium"
          style={{ color: "#000000", opacity: 0.8 }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export function FullPageLoader({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(254, 242, 242, 0.9)" }}
    >
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-lg font-semibold" style={{ color: "#000000" }}>
          {message}
        </p>
      </div>
    </div>
  );
}

interface LoadingButtonProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function LoadingButton({
  isLoading,
  loadingText = "Processing...",
  children,
  onClick,
  disabled,
  className = "",
}: LoadingButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`flex items-center justify-center gap-2 ${className}`}
    >
      {isLoading ? (
        <>
          <Spinner size="sm" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
