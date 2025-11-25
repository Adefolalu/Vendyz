/**
 * Client-side Price Oracle Service
 *
 * Fetches token prices for displaying USD values in WalletRetrieval
 * Uses Next.js API route to proxy requests and avoid CORS/rate limits
 */

// Cache prices for 5 minutes
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface TokenPrice {
  price: number;
  cached: boolean;
  source: string;
  error?: string;
}

interface TokenWithValue {
  address: string;
  symbol: string;
  amount: string;
  decimals: number;
  price: number;
  value: number;
  source: string;
}

/**
 * Get single token price
 */
export async function getTokenPrice(tokenAddress: string): Promise<TokenPrice> {
  try {
    // Check cache
    const cached = priceCache.get(tokenAddress.toLowerCase());
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { price: cached.price, cached: true, source: "cache" };
    }

    // Fetch from API route
    const response = await fetch(`/api/prices?token=${tokenAddress}`);
    if (!response.ok) {
      throw new Error(`Price API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.price) {
      priceCache.set(tokenAddress.toLowerCase(), {
        price: data.price,
        timestamp: Date.now(),
      });
    }

    return {
      price: data.price || 0,
      cached: false,
      source: data.source || "unknown",
      error: data.error,
    };
  } catch (error) {
    console.error("Error fetching token price:", error);
    return { price: 0, cached: false, source: "error", error: String(error) };
  }
}

/**
 * Get multiple token prices (batch)
 */
export async function getTokenPrices(
  tokenAddresses: string[]
): Promise<Record<string, TokenPrice>> {
  try {
    const results: Record<string, TokenPrice> = {};
    const uncachedAddresses: string[] = [];

    // Check cache
    for (const address of tokenAddresses) {
      const cached = priceCache.get(address.toLowerCase());
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        results[address.toLowerCase()] = {
          price: cached.price,
          cached: true,
          source: "cache",
        };
      } else {
        uncachedAddresses.push(address);
      }
    }

    // Fetch uncached prices
    if (uncachedAddresses.length > 0) {
      const response = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: uncachedAddresses }),
      });

      if (response.ok) {
        const data = await response.json();

        for (const [address, priceData] of Object.entries(data.prices || {})) {
          const pd = priceData as { price: number; source: string };
          if (pd.price) {
            priceCache.set(address.toLowerCase(), {
              price: pd.price,
              timestamp: Date.now(),
            });
          }
          results[address.toLowerCase()] = {
            price: pd.price || 0,
            cached: false,
            source: pd.source || "unknown",
          };
        }
      }
    }

    return results;
  } catch (error) {
    console.error("Error fetching token prices:", error);
    return {};
  }
}

/**
 * Calculate wallet total value with token breakdown
 */
export async function calculateWalletValue(
  tokens: {
    address: string;
    symbol: string;
    amount: string;
    decimals: number;
  }[]
): Promise<{
  totalValue: number;
  tokens: TokenWithValue[];
}> {
  try {
    const addresses = tokens.map((t) => t.address);
    const prices = await getTokenPrices(addresses);

    let totalValue = 0;
    const tokenValues: TokenWithValue[] = [];

    for (const token of tokens) {
      const priceData = prices[token.address.toLowerCase()];
      const price = priceData?.price || 0;
      const amount = Number(token.amount) / Math.pow(10, token.decimals);
      const value = amount * price;

      totalValue += value;

      tokenValues.push({
        address: token.address,
        symbol: token.symbol,
        amount: token.amount,
        decimals: token.decimals,
        price,
        value,
        source: priceData?.source || "none",
      });
    }

    return { totalValue, tokens: tokenValues };
  } catch (error) {
    console.error("Error calculating wallet value:", error);
    return { totalValue: 0, tokens: [] };
  }
}

/**
 * Format USD value
 */
export function formatUSD(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.01) return "<$0.01";
  if (value < 1) return `$${value.toFixed(3)}`;
  if (value < 100) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(0)}`;
}
