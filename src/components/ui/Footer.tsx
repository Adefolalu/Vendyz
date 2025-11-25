import React from "react";
import { Tab } from "~/components/App";

interface FooterProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  showWallet?: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  activeTab,
  setActiveTab,
  showWallet = false,
}) => (
  <div
    className="fixed bottom-0 left-0 right-0 mx-4 mb-4 px-2 py-2 rounded-xl shadow-lg z-50 backdrop-blur-sm"
    style={{
      backgroundColor: "#EEFFBE",
      borderColor: "#c8d99a",
      borderWidth: "2px",
      borderStyle: "solid",
    }}
  >
    <div className="flex justify-around items-center h-14">
      <button
        onClick={() => setActiveTab(Tab.Home)}
        className="flex flex-col items-center justify-center w-full h-full rounded-lg transition-all duration-200"
        style={{
          backgroundColor: activeTab === Tab.Home ? "#e8f5d0" : "transparent",
          color: "#000000",
          transform: activeTab === Tab.Home ? "scale(1.05)" : "scale(1)",
          opacity: activeTab === Tab.Home ? 1 : 0.6,
        }}
      >
        <span className="text-xl">🎰</span>
        <span className="text-xs mt-1 font-medium">Vending</span>
      </button>
      <button
        onClick={() => setActiveTab(Tab.Raffle)}
        className="flex flex-col items-center justify-center w-full h-full rounded-lg transition-all duration-200"
        style={{
          backgroundColor: activeTab === Tab.Raffle ? "#e8f5d0" : "transparent",
          color: "#000000",
          transform: activeTab === Tab.Raffle ? "scale(1.05)" : "scale(1)",
          opacity: activeTab === Tab.Raffle ? 1 : 0.6,
        }}
      >
        <span className="text-xl">🎟️</span>
        <span className="text-xs mt-1 font-medium">Raffle</span>
      </button>
      <button
        onClick={() => setActiveTab(Tab.Auction)}
        className="flex flex-col items-center justify-center w-full h-full rounded-lg transition-all duration-200"
        style={{
          backgroundColor:
            activeTab === Tab.Auction ? "#e8f5d0" : "transparent",
          color: "#000000",
          transform: activeTab === Tab.Auction ? "scale(1.05)" : "scale(1)",
          opacity: activeTab === Tab.Auction ? 1 : 0.6,
        }}
      >
        <span className="text-xl">🏆</span>
        <span className="text-xs mt-1 font-medium">Auction</span>
      </button>
      {showWallet && (
        <button
          onClick={() => setActiveTab(Tab.Wallet)}
          className="flex flex-col items-center justify-center w-full h-full rounded-lg transition-all duration-200"
          style={{
            backgroundColor:
              activeTab === Tab.Wallet ? "#e8f5d0" : "transparent",
            color: "#000000",
            transform: activeTab === Tab.Wallet ? "scale(1.05)" : "scale(1)",
            opacity: activeTab === Tab.Wallet ? 1 : 0.6,
          }}
        >
          <span className="text-xl">👛</span>
          <span className="text-xs mt-1 font-medium">Wallet</span>
        </button>
      )}
    </div>
  </div>
);
