"use client";

import { useEffect, useState } from "react";
import { useMiniApp } from "@neynar/react";
import { Header } from "~/components/ui/Header";
import { Footer } from "~/components/ui/Footer";
import { VendingMachine } from "~/components/VendingMachine";
import { RaffleCard } from "~/components/RaffleCard";
import { SponsorAuction } from "~/components/SponsorAuction";
import { USE_WALLET } from "~/lib/constants";
import { useNeynarUser } from "../hooks/useNeynarUser";
import { WalletTab } from "~/components/ui/tabs";
import { ErrorToastContainer } from "~/components/ErrorToast";
import { TransactionTracker } from "~/components/TransactionTracker";
import { EventListener } from "~/components/EventListener";

// --- Types ---
export enum Tab {
  Home = "home",
  Raffle = "raffle",
  Auction = "auction",
  Wallet = "wallet",
}

export interface AppProps {
  title?: string;
}

/**
 * Vendyz - Anonymous Wallet Vending Machine
 *
 * Main application component for the Vendyz mini app.
 * Features three modes:
 * 1. Vending Machine - Purchase pre-funded anonymous wallets
 * 2. Raffle - Buy tickets for prize pool
 * 3. Sponsor Auction - Bid for token placement in wallets
 */
export default function App({ title }: AppProps = { title: "Vendyz" }) {
  // --- Hooks ---
  const { isSDKLoaded, context, setInitialTab, setActiveTab, currentTab } =
    useMiniApp();

  // --- Neynar user hook ---
  const { user: neynarUser } = useNeynarUser(context || undefined);

  // --- Effects ---
  useEffect(() => {
    if (isSDKLoaded) {
      setInitialTab(Tab.Home);
    }
  }, [isSDKLoaded, setInitialTab]);

  // --- Early Returns ---
  if (!isSDKLoaded) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: "#EEFFBE" }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎰</div>
          <p className="text-lg font-semibold" style={{ color: "#000000" }}>
            Loading Vendyz...
          </p>
        </div>
      </div>
    );
  }

  // --- Render ---
  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
        backgroundColor: "#EEFFBE",
        color: "#000000",
      }}
      className="min-h-screen"
    >
      {/* Header */}
      <Header neynarUser={neynarUser} />

      {/* Main content */}
      <div className="container py-4 pb-20">
        {/* Tab content rendering */}
        {currentTab === Tab.Home && <VendingMachine />}
        {currentTab === Tab.Raffle && (
          <div className="max-w-2xl mx-auto">
            <RaffleCard />
          </div>
        )}
        {currentTab === Tab.Auction && (
          <div className="max-w-2xl mx-auto">
            <SponsorAuction />
          </div>
        )}
        {currentTab === Tab.Wallet && <WalletTab />}

        {/* Footer with navigation */}
        <Footer
          activeTab={currentTab as Tab}
          setActiveTab={setActiveTab}
          showWallet={USE_WALLET}
        />
      </div>

      {/* Global UI Components */}
      <ErrorToastContainer />
      <TransactionTracker />
      <EventListener />
    </div>
  );
}
