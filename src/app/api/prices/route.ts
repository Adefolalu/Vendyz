/**
 * API Route: /api/prices
 *
 * Fetches token prices from CoinGecko (primary) and Moralis (fallback)
 * Acts as proxy to avoid CORS and rate limiting on client
 */

import { NextRequest, NextResponse } from "next/server";

// Demo API Key configuration
const COINGECKO_API_KEY =
  process.env.COINGECKO_API_KEY || "CG-dWqQuUYppVGZs9SnRkQw6quj";
const COINGECKO_API_URL = "https://api.coingecko.com/api/v3";

const MORALIS_API_KEY =
  process.env.MORALIS_API_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6Ijk1MjY1NDM1LWI1OTItNDA3ZS04NDY2LTVmYTkzOGJlNjEzOCIsIm9yZ0lkIjoiNDU1OTQzIiwidXNlcklkIjoiNDY5MTA2IiwidHlwZUlkIjoiOTY4ZjM3ZmEtM2NkMi00MTQ1LWJhMTAtY2FmOWRmZWU0ZGZiIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NTA5NTgwMTksImV4cCI6NDkwNjcxODAxOX0.oCAn6T8gPV1-tiOd0Bfwsg8ANgIu6t2HFBe0YgXeOxE";

// Simple in-memory cache (resets on deployment)
const priceCache = new Map<
  string,
  { price: number; timestamp: number; source: string }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch from CoinGecko
 */
async function fetchFromCoinGecko(tokenAddresses: string[]) {
  try {
    const addressList = tokenAddresses.map((a) => a.toLowerCase()).join(",");
    const url = `${COINGECKO_API_URL}/simple/token_price/base?contract_addresses=${addressList}&vs_currencies=usd`;

    const response = await fetch(url, {
      headers: {
        "x-cg-demo-api-key": COINGECKO_API_KEY,
        accept: "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`CoinGecko error: ${response.status}`);
    }

    const data = await response.json();
    const prices: Record<string, { price: number; source: string }> = {};

    for (const [address, priceData] of Object.entries(data)) {
      prices[address.toLowerCase()] = {
        price: (priceData as any).usd || 0,
        source: "coingecko",
      };
    }

    return { success: true, prices };
  } catch (error) {
    console.error("CoinGecko error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Fetch from Moralis (fallback)
 */
async function fetchFromMoralis(tokenAddress: string) {
  try {
    const url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/price?chain=base`;

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "X-API-Key": MORALIS_API_KEY,
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`Moralis error: ${response.status}`);
    }

    const data = await response.json();
    const price = data.usdPrice || data.usdPriceFormatted || 0;

    return {
      success: true,
      price,
      source: "moralis",
    };
  } catch (error) {
    console.error("Moralis error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * GET /api/prices?token=0x...
 * Fetch single token price
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenAddress = searchParams.get("token");

    if (!tokenAddress) {
      return NextResponse.json(
        { error: "Missing token address" },
        { status: 400 }
      );
    }

    const address = tokenAddress.toLowerCase();

    // Check cache
    const cached = priceCache.get(address);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        price: cached.price,
        source: cached.source,
        cached: true,
      });
    }

    // Try CoinGecko
    const cgResult = await fetchFromCoinGecko([address]);
    if (cgResult.success && cgResult.prices?.[address]?.price) {
      const { price, source } = cgResult.prices[address];
      priceCache.set(address, { price, timestamp: Date.now(), source });
      return NextResponse.json({ price, source, cached: false });
    }

    // Fallback to Moralis
    const moralisResult = await fetchFromMoralis(address);
    if (moralisResult.success && moralisResult.price) {
      const { price, source } = moralisResult;
      priceCache.set(address, {
        price,
        timestamp: Date.now(),
        source: source || "moralis",
      });
      return NextResponse.json({
        price,
        source: source || "moralis",
        cached: false,
      });
    }

    // Both failed
    return NextResponse.json(
      { price: 0, source: "none", error: "All sources failed" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Price API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prices
 * Fetch multiple token prices (batch)
 * Body: { tokens: ['0x...', '0x...'] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tokenAddresses = body.tokens as string[];

    if (!Array.isArray(tokenAddresses) || tokenAddresses.length === 0) {
      return NextResponse.json(
        { error: "Invalid token addresses" },
        { status: 400 }
      );
    }

    const prices: Record<string, { price: number; source: string }> = {};
    const uncachedAddresses: string[] = [];

    // Check cache
    for (const address of tokenAddresses) {
      const addr = address.toLowerCase();
      const cached = priceCache.get(addr);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        prices[addr] = { price: cached.price, source: cached.source };
      } else {
        uncachedAddresses.push(addr);
      }
    }

    // Fetch uncached from CoinGecko (batch)
    if (uncachedAddresses.length > 0) {
      const cgResult = await fetchFromCoinGecko(uncachedAddresses);
      if (cgResult.success && cgResult.prices) {
        for (const [address, data] of Object.entries(cgResult.prices)) {
          if (data.price > 0) {
            priceCache.set(address, {
              price: data.price,
              timestamp: Date.now(),
              source: data.source,
            });
            prices[address] = data;
          }
        }
      }
    }

    // For any still missing, try Moralis individually
    for (const address of uncachedAddresses) {
      if (!prices[address] || prices[address].price === 0) {
        const moralisResult = await fetchFromMoralis(address);
        if (moralisResult.success && moralisResult.price) {
          priceCache.set(address, {
            price: moralisResult.price,
            timestamp: Date.now(),
            source: moralisResult.source || "moralis",
          });
          prices[address] = {
            price: moralisResult.price,
            source: moralisResult.source || "moralis",
          };
        } else {
          prices[address] = { price: 0, source: "none" };
        }
      }
    }

    return NextResponse.json({ prices });
  } catch (error) {
    console.error("Batch price API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
