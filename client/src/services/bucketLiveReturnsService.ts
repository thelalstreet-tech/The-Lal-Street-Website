// client/src/services/bucketLiveReturnsService.ts
import { API_ENDPOINTS } from '../config/api';
import { logger } from '../utils/logger';

export interface FundLiveReturns {
  fundId: string;
  fundName: string;
  currentNAV: number | null;
  cagr3Y: number | null;
  cagr5Y: number | null;
  lumpsumInvestment: number;
  lumpsumCurrentValue: number | null;
  lumpsumReturns: number | null;
  lumpsumReturnsPercent: number | null;
  sipTotalInvested: number;
  sipCurrentValue: number | null;
  sipXIRR: number | null;
  positivePercentageFromLaunch: number | null;
}

export interface BucketLiveReturns {
  bucketCagr3Y: number | null;
  bucketCagr5Y: number | null;
  lumpsumInvestment: number;
  lumpsumCurrentValue: number | null;
  lumpsumReturns: number | null;
  lumpsumReturnsPercent: number | null;
  sipTotalInvested: number;
  sipCurrentValue: number | null;
  sipXIRR: number | null;
  sipProfitPercentage: number | null;
  fundLiveReturns: FundLiveReturns[];
  calculatedAt: string;
  calculationDate: string;
}

/**
 * Get live returns for a bucket from the API
 */
export async function getBucketLiveReturns(bucketId: string): Promise<BucketLiveReturns | null> {
  try {
    const response = await fetch(`${API_ENDPOINTS.BUCKET_LIVE_RETURNS}/${bucketId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No data yet, will be calculated
        return null;
      }
      throw new Error(`Failed to fetch live returns: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.success && data.data) {
      return data.data;
    }

    return null;
  } catch (error) {
    logger.error('Error fetching bucket live returns:', error);
    return null;
  }
}

/**
 * Check if live returns data is stale (older than today)
 */
export function isDataStale(calculationDate: string): boolean {
  if (!calculationDate) return true;
  
  const today = new Date().toISOString().split('T')[0];
  return calculationDate < today;
}

/**
 * Trigger recalculation for a bucket (admin only)
 */
export async function recalculateBucketLiveReturns(bucketId: string): Promise<BucketLiveReturns | null> {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_ENDPOINTS.BUCKET_LIVE_RETURNS}/${bucketId}/recalculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to recalculate: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.success && data.data) {
      return data.data;
    }

    return null;
  } catch (error) {
    logger.error('Error recalculating bucket live returns:', error);
    return null;
  }
}



