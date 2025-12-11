import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const dynamic = "force-static";

// Festive Vending Machine OpenGraph Image
export async function GET(_request: NextRequest) {
  const width = 1200;
  const height = 630; // Standard OG height

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background:
            "linear-gradient(180deg, #7f1d1d 0%, #b91c1c 50%, #7f1d1d 100%)",
        }}
      >
        {/* Top lights */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "linear-gradient(90deg, #16a34a, #ef4444, #16a34a)",
            opacity: 0.8,
          }}
        />

        {/* Vending machine frame */}
        <div
          style={{
            width: 1000,
            height: 480,
            borderRadius: 24,
            border: "8px solid #ffffff",
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            position: "relative",
            background: "linear-gradient(180deg, #0f172a 0%, #0b1229 100%)",
            display: "flex",
            flexDirection: "column",
            padding: 24,
          }}
        >
          {/* Header sign */}
          <div
            style={{
              background: "linear-gradient(90deg, #166534, #15803d, #166534)",
              color: "#ffffff",
              textAlign: "center",
              padding: "12px 20px",
              borderRadius: 16,
              border: "6px solid #ef4444",
              fontWeight: 800,
              letterSpacing: 4,
              fontSize: 48,
              textShadow: "0 2px 6px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div>🎄 VENDYZ 🎄</div>
            <div style={{ fontSize: 20, marginTop: 6, opacity: 0.9 }}>
              Festive Wallet Workshop
            </div>
          </div>

          {/* Tiers row (ImageResponse does not support CSS grid) */}
          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            {["🍪", "🦌", "🛷", "🎅"].map((emoji, i) => (
              <div
                key={i}
                style={{
                  width: 220,
                  background:
                    "linear-gradient(180deg, #166534 0%, #0f172a 100%)",
                  border: "6px solid #ef4444",
                  borderRadius: 16,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  boxShadow: "0 10px 20px rgba(0,0,0,0.35)",
                }}
              >
                <div style={{ fontSize: 54, marginBottom: 6 }}>{emoji}</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  {`🪙 Tier ${i + 1}`}
                </div>
                <div style={{ fontSize: 16, color: "#fde68a", marginTop: 4 }}>
                  Win $…
                </div>
              </div>
            ))}
          </div>

          {/* CTA bar */}
          <div
            style={{
              marginTop: 18,
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                background: "linear-gradient(90deg, #22c55e, #86efac, #22c55e)",
                color: "#0b1229",
                padding: "10px 16px",
                borderRadius: 12,
                border: "4px solid #22c55e",
                fontWeight: 900,
                fontSize: 22,
                marginRight: 12,
              }}
            >
              OPEN GIFT!
            </div>
            <div
              style={{
                background: "linear-gradient(180deg, #dc2626, #b91c1c)",
                color: "#fff",
                padding: "10px 16px",
                borderRadius: 12,
                border: "4px solid #fca5a5",
                fontWeight: 900,
                fontSize: 22,
              }}
            >
              CLEAR
            </div>
          </div>
        </div>

        {/* Bottom lights */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "linear-gradient(90deg, #facc15, #ef4444, #facc15)",
            opacity: 0.8,
          }}
        />
      </div>
    ),
    { width, height }
  );
}
