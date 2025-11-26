"use client";

import { useState, useEffect } from "react";
import { formatUnits } from "viem";

interface VendingMachineAnimationProps {
  tier: {
    id: number;
    name: string;
    emoji: string;
    minValue: bigint;
    maxValue: bigint;
    price: bigint;
  };
  requestId: string;
  onComplete: (winAmount: string) => void;
}

export function VendingMachineAnimation({
  tier,
  requestId,
  onComplete,
}: VendingMachineAnimationProps) {
  const [phase, setPhase] = useState<
    "inserting" | "processing" | "dispensing" | "revealing"
  >("inserting");
  const [winAmount, setWinAmount] = useState<string>("");
  const [displayAmount, setDisplayAmount] = useState<string>("???");
  const [shake, setShake] = useState(false);

  // Calculate random win amount within tier range
  useEffect(() => {
    const minValue = Number(formatUnits(tier.minValue, 6));
    const maxValue = Number(formatUnits(tier.maxValue, 6));
    const randomWin = (
      Math.random() * (maxValue - minValue) +
      minValue
    ).toFixed(2);
    setWinAmount(randomWin);
  }, [tier]);

  // Animation sequence
  useEffect(() => {
    const sequence = async () => {
      // Phase 1: Coin insertion
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPhase("processing");

      // Phase 2: Processing (machine working)
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setPhase("dispensing");

      // Phase 3: Dispensing animation
      setShake(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setShake(false);
      setPhase("revealing");

      // Phase 4: Number rolling effect
      let counter = 0;
      const rollInterval = setInterval(() => {
        counter++;
        const randomNum = (Math.random() * 1000).toFixed(2);
        setDisplayAmount(randomNum);

        if (counter >= 20) {
          clearInterval(rollInterval);
          setDisplayAmount(winAmount);

          // Wait a bit to show the win, then complete
          setTimeout(() => {
            onComplete(winAmount);
          }, 2000);
        }
      }, 100);
    };

    sequence();
  }, [winAmount, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative">
        {/* Vending Machine Frame */}
        <div
          className={`relative bg-gradient-to-b from-red-600 to-red-800 rounded-3xl shadow-2xl p-8 border-8 border-red-900 ${
            shake ? "animate-shake" : ""
          }`}
          style={{
            width: "400px",
            minHeight: "600px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          {/* Top Sign */}
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-yellow-400 px-6 py-2 rounded-lg border-4 border-yellow-600 shadow-lg">
            <h2 className="text-2xl font-bold text-red-900">🎰 VENDYZ</h2>
          </div>

          {/* Display Screen */}
          <div className="bg-black rounded-xl p-6 mb-6 border-4 border-gray-800 shadow-inner">
            <div className="text-center space-y-4">
              {/* Tier Info */}
              <div className="text-6xl mb-2">{tier.emoji}</div>
              <div className="text-yellow-400 font-bold text-xl">
                {tier.name} TIER
              </div>

              {/* Status Messages */}
              {phase === "inserting" && (
                <div className="text-green-400 text-lg animate-pulse">
                  💳 Processing Payment...
                </div>
              )}
              {phase === "processing" && (
                <div className="text-blue-400 text-lg">
                  <div className="animate-spin inline-block text-3xl mb-2">
                    ⚙️
                  </div>
                  <div>Generating Randomness...</div>
                  <div className="text-xs text-gray-400 mt-2">
                    Chainlink VRF Working
                  </div>
                </div>
              )}
              {phase === "dispensing" && (
                <div className="text-purple-400 text-lg">
                  <div className="text-4xl mb-2 animate-bounce">📦</div>
                  <div>Preparing Your Wallet...</div>
                </div>
              )}
              {phase === "revealing" && (
                <div className="space-y-4">
                  <div className="text-yellow-400 text-2xl font-bold animate-pulse">
                    🎉 YOU WON! 🎉
                  </div>
                  <div className="text-green-400 text-5xl font-bold font-mono">
                    ${displayAmount}
                  </div>
                  <div className="text-gray-400 text-sm">USDC</div>
                  {displayAmount === winAmount && (
                    <div className="text-yellow-300 text-xs animate-pulse">
                      + Bonus Tokens Included!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Product Display Window */}
          <div className="bg-gradient-to-b from-blue-400/30 to-blue-600/30 rounded-xl p-6 mb-6 border-4 border-blue-900/50 backdrop-blur-sm min-h-[200px] flex items-center justify-center relative overflow-hidden">
            {/* Animated items falling */}
            {phase === "dispensing" && (
              <>
                <div className="absolute top-0 left-1/4 text-4xl animate-fall-1">
                  💵
                </div>
                <div className="absolute top-0 left-2/4 text-4xl animate-fall-2">
                  💰
                </div>
                <div className="absolute top-0 left-3/4 text-4xl animate-fall-3">
                  🪙
                </div>
              </>
            )}

            {/* Final display */}
            {phase === "revealing" && (
              <div className="text-center">
                <div className="text-7xl mb-4 animate-bounce">🎁</div>
                <div className="text-white font-bold text-xl">
                  Wallet Ready!
                </div>
              </div>
            )}

            {/* Waiting state */}
            {(phase === "inserting" || phase === "processing") && (
              <div className="text-6xl opacity-30 animate-pulse">💤</div>
            )}
          </div>

          {/* Coin Slot */}
          <div className="absolute top-32 right-8 bg-black w-20 h-4 rounded-full border-2 border-yellow-600 shadow-inner">
            {phase === "inserting" && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 animate-coin-insert">
                <div className="text-3xl">🪙</div>
              </div>
            )}
          </div>

          {/* Dispenser Flap */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 w-32 h-12 rounded-t-lg border-4 border-gray-900">
            <div className="bg-black h-full rounded-t-lg flex items-center justify-center">
              {phase === "revealing" && (
                <div className="text-yellow-400 text-xs animate-pulse">
                  TAKE YOUR WALLET
                </div>
              )}
            </div>
          </div>

          {/* Side Buttons */}
          <div className="absolute right-12 top-1/2 transform translate-x-full space-y-4">
            <div className="w-8 h-8 bg-red-600 rounded-full border-2 border-red-800 shadow-lg"></div>
            <div className="w-8 h-8 bg-yellow-400 rounded-full border-2 border-yellow-600 shadow-lg"></div>
            <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-green-700 shadow-lg"></div>
          </div>
        </div>

        {/* Request ID Badge */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 px-4 py-2 rounded-full border-2 border-gray-600">
          <p className="text-xs text-gray-400">
            Request: {requestId.slice(0, 8)}...
          </p>
        </div>

        {/* Sparkle Effects */}
        {phase === "revealing" && displayAmount === winAmount && (
          <>
            <div className="absolute top-1/4 left-0 text-4xl animate-sparkle-1">
              ✨
            </div>
            <div className="absolute top-1/3 right-0 text-4xl animate-sparkle-2">
              ⭐
            </div>
            <div className="absolute top-1/2 left-0 text-4xl animate-sparkle-3">
              💫
            </div>
            <div className="absolute top-1/2 right-0 text-4xl animate-sparkle-1">
              ✨
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-5px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(5px);
          }
        }

        @keyframes coin-insert {
          0% {
            transform: translateY(-50px);
            opacity: 1;
          }
          100% {
            transform: translateY(0);
            opacity: 0;
          }
        }

        @keyframes fall-1 {
          0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(200px) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes fall-2 {
          0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(200px) rotate(-360deg);
            opacity: 0;
          }
        }

        @keyframes fall-3 {
          0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(200px) rotate(180deg);
            opacity: 0;
          }
        }

        @keyframes sparkle-1 {
          0%,
          100% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(1) rotate(180deg);
            opacity: 1;
          }
        }

        @keyframes sparkle-2 {
          0%,
          100% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) rotate(-180deg);
            opacity: 1;
          }
        }

        @keyframes sparkle-3 {
          0%,
          100% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(0.8) rotate(360deg);
            opacity: 1;
          }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        .animate-coin-insert {
          animation: coin-insert 1s ease-out forwards;
        }

        .animate-fall-1 {
          animation: fall-1 1.5s ease-in forwards;
        }

        .animate-fall-2 {
          animation: fall-2 1.5s ease-in forwards 0.2s;
        }

        .animate-fall-3 {
          animation: fall-3 1.5s ease-in forwards 0.4s;
        }

        .animate-sparkle-1 {
          animation: sparkle-1 1s ease-in-out infinite;
        }

        .animate-sparkle-2 {
          animation: sparkle-2 1.2s ease-in-out infinite;
        }

        .animate-sparkle-3 {
          animation: sparkle-3 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
