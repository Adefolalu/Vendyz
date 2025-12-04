import { useState, useEffect } from 'react';

interface TreasuryToken {
  address: string;
  symbol: string;
  balance: number;
  price: number;
  value: number;
}

interface TierFundability {
  fundable: boolean;
  maxValue: number;
}

interface TreasuryData {
  totalValue: number;
  tokens: TreasuryToken[];
  tiers: {
    1: TierFundability;
    2: TierFundability;
    3: TierFundability;
    4: TierFundability;
  };
  timestamp: number;
}

interface TreasuryBalanceResult {
  data: TreasuryData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const CACHE_DURATION = 30 * 1000; // 30 seconds (matches backend cache)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let cachedData: TreasuryData | null = null;
let cacheTime = 0;

export function useTreasuryBalance(): TreasuryBalanceResult {
  const [data, setData] = useState<TreasuryData | null>(cachedData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTreasuryBalance = async () => {
    // Check if cache is still valid
    const now = Date.now();
    if (cachedData && (now - cacheTime) < CACHE_DURATION) {
      setData(cachedData);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/treasury/balance`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch treasury balance');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        cachedData = result.data;
        cacheTime = now;
        setData(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Error fetching treasury balance:', err);
      setError(err.message || 'Failed to fetch treasury balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreasuryBalance();

    // Refresh every 30 seconds
    const interval = setInterval(fetchTreasuryBalance, CACHE_DURATION);

    return () => clearInterval(interval);
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchTreasuryBalance,
  };
}
