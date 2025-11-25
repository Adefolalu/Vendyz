"use client";

import { useEffect, useState } from "react";

interface ErrorToastProps {
  title: string;
  message: string;
  action?: string;
  onClose: () => void;
  duration?: number;
}

export function ErrorToast({
  title,
  message,
  action,
  onClose,
  duration = 8000,
}: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed top-4 right-4 max-w-md z-50 transition-all duration-300 ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
      }`}
    >
      <div
        className="p-4 rounded-lg shadow-lg border-2"
        style={{
          backgroundColor: "#f5d0d0",
          borderColor: "#d47a7a",
          color: "#000000",
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <h3 className="font-bold text-lg">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-xl font-bold hover:opacity-70 transition-opacity"
            style={{ color: "#000000" }}
          >
            ×
          </button>
        </div>
        <p className="text-sm mb-2" style={{ opacity: 0.9 }}>
          {message}
        </p>
        {action && (
          <p
            className="text-xs font-semibold mt-2 p-2 rounded"
            style={{ backgroundColor: "#f8e8d0", color: "#000000" }}
          >
            💡 {action}
          </p>
        )}
      </div>
    </div>
  );
}

interface ErrorState {
  id: string;
  title: string;
  message: string;
  action?: string;
}

export function ErrorToastContainer() {
  const [errors, setErrors] = useState<ErrorState[]>([]);

  useEffect(() => {
    const handleError = (event: CustomEvent) => {
      const newError: ErrorState = {
        id: Date.now().toString(),
        ...event.detail,
      };
      setErrors((prev) => [...prev, newError]);
    };

    window.addEventListener("show-error" as any, handleError);
    return () => window.removeEventListener("show-error" as any, handleError);
  }, []);

  const removeError = (id: string) => {
    setErrors((prev) => prev.filter((error) => error.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {errors.map((error) => (
        <ErrorToast
          key={error.id}
          title={error.title}
          message={error.message}
          action={error.action}
          onClose={() => removeError(error.id)}
        />
      ))}
    </div>
  );
}

// Helper function to trigger error toast from anywhere
export function showError(title: string, message: string, action?: string) {
  const event = new CustomEvent("show-error", {
    detail: { title, message, action },
  });
  window.dispatchEvent(event);
}
