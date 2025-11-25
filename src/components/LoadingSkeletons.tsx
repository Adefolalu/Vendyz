"use client";

/**
 * Loading Skeleton Components
 *
 * Reusable skeleton loaders for better UX during async operations
 */

export function TierCardSkeleton() {
  return (
    <div
      className="p-6 rounded-lg border-2 animate-pulse"
      style={{ backgroundColor: "#f5ffdb", borderColor: "#c8d99a" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="h-6 w-24 rounded"
          style={{ backgroundColor: "#e0f0a0" }}
        />
        <div
          className="h-6 w-16 rounded"
          style={{ backgroundColor: "#e0f0a0" }}
        />
      </div>
      <div className="space-y-2">
        <div
          className="h-4 w-full rounded"
          style={{ backgroundColor: "#e0f0a0" }}
        />
        <div
          className="h-4 w-3/4 rounded"
          style={{ backgroundColor: "#e0f0a0" }}
        />
        <div
          className="h-4 w-5/6 rounded"
          style={{ backgroundColor: "#e0f0a0" }}
        />
      </div>
    </div>
  );
}

export function RaffleCardSkeleton() {
  return (
    <div
      className="p-6 rounded-lg border-2 animate-pulse"
      style={{ backgroundColor: "#EEFFBE", borderColor: "#c8d99a" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="h-8 w-48 rounded"
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
          className="h-4 w-24 rounded mb-2"
          style={{ backgroundColor: "#e0f0a0" }}
        />
        <div
          className="h-10 w-40 rounded"
          style={{ backgroundColor: "#e0f0a0" }}
        />
      </div>
      <div className="mb-4">
        <div
          className="h-4 w-full rounded mb-2"
          style={{ backgroundColor: "#e0f0a0" }}
        />
        <div
          className="h-3 w-full rounded"
          style={{ backgroundColor: "#d4e7a0" }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded" style={{ backgroundColor: "#f5ffdb" }}>
          <div
            className="h-4 w-20 rounded mb-1"
            style={{ backgroundColor: "#e0f0a0" }}
          />
          <div
            className="h-5 w-16 rounded"
            style={{ backgroundColor: "#e0f0a0" }}
          />
        </div>
        <div className="p-3 rounded" style={{ backgroundColor: "#f5ffdb" }}>
          <div
            className="h-4 w-20 rounded mb-1"
            style={{ backgroundColor: "#e0f0a0" }}
          />
          <div
            className="h-5 w-16 rounded"
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
      style={{ backgroundColor: "rgba(238, 255, 190, 0.9)" }}
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
