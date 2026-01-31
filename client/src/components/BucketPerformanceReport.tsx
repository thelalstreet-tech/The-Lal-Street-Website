import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { TrendingUp, TrendingDown, CheckCircle2, Loader2, DollarSign, Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import type { SuggestedBucket } from '../types/suggestedBucket';
import { fetchNAVData } from '../services/navService';
import { getLatestNAVBeforeDate, getNextAvailableNAV, getToday, addMonths, getYearsBetween } from '../utils/dateUtils';
import { computeFundCAGR, computeWeightedAverage } from '../utils/portfolioStats';
import { calculateCAGR, calculateXIRR } from '../utils/financialCalculations';

// Cache configuration
const CACHE_PREFIX = 'bucket_perf_report_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedReport {
  fundLiveReturns: FundLiveReturns[];
  bucketLiveReturns: BucketLiveReturns;
  timestamp: number;
  bucketId: string;
  fundHash: string; // Hash of fund IDs and weightages to detect changes
}

// Helper function to generate a hash from fund data
const generateFundHash = (funds: Array<{ id: string; weightage: number }>): string => {
  const fundData = funds
    .map(f => `${f.id}:${f.weightage}`)
    .sort()
    .join('|');
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fundData.length; i++) {
    const char = fundData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
};

// Helper function to get cache key
const getCacheKey = (bucketId: string, fundHash: string): string => {
  return `${CACHE_PREFIX}${bucketId}_${fundHash}`;
};

// Helper function to load from cache
const loadFromCache = (bucketId: string, fundHash: string): CachedReport | null => {
  try {
    const cacheKey = getCacheKey(bucketId, fundHash);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const data: CachedReport = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired
    if (now - data.timestamp > CACHE_TTL) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    // Verify bucket ID and fund hash match
    if (data.bucketId !== bucketId || data.fundHash !== fundHash) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('Error loading from cache:', error);
    return null;
  }
};

// Helper function to save to cache
const saveToCache = (
  bucketId: string,
  fundHash: string,
  fundLiveReturns: FundLiveReturns[],
  bucketLiveReturns: BucketLiveReturns
): void => {
  const data: CachedReport = {
    fundLiveReturns,
    bucketLiveReturns,
    timestamp: Date.now(),
    bucketId,
    fundHash,
  };

  try {
    const cacheKey = getCacheKey(bucketId, fundHash);
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    // Handle quota exceeded or other localStorage errors
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, clearing old cache entries...');
      // Clear old cache entries
      clearOldCacheEntries();
      // Try again
      try {
        const cacheKey = getCacheKey(bucketId, fundHash);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (retryError) {
        console.warn('Failed to save to cache after cleanup:', retryError);
      }
    } else {
      console.warn('Error saving to cache:', error);
    }
  }
};

// Helper function to clear old cache entries
const clearOldCacheEntries = (): void => {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const data: CachedReport = JSON.parse(cached);
            if (now - data.timestamp > CACHE_TTL) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // Invalid entry, remove it
          keysToRemove.push(key);
        }
      }
    }

    // Remove old entries
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Error clearing old cache entries:', error);
  }
};

// Helper function to yield control to browser to prevent UI blocking
const yieldToBrowser = (): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

// Helper function to process in chunks with progress updates
const processInChunks = async <T,>(
  items: T[],
  processor: (item: T, index: number) => Promise<void> | void,
  chunkSize: number = 10,
  onProgress?: (current: number, total: number) => Promise<void> | void
): Promise<void> => {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      await processor(chunk[j], i + j);
    }
    if (onProgress) {
      await onProgress(Math.min(i + chunkSize, items.length), items.length);
    }
    await yieldToBrowser(); // Yield after each chunk
  }
};

interface BucketPerformanceReportProps {
  bucket: SuggestedBucket;
}

interface FundLiveReturns {
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
  positivePercentageFromLaunch: number | null; // Calculated from fund launch date
}

interface BucketLiveReturns {
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
}

export function BucketPerformanceReport({ bucket }: BucketPerformanceReportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, message: '' });
  const [fundLiveReturns, setFundLiveReturns] = useState<FundLiveReturns[]>([]);
  const [bucketLiveReturns, setBucketLiveReturns] = useState<BucketLiveReturns | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const { rollingReturns } = bucket.performance;

  useEffect(() => {
    loadLiveReturns();
  }, [bucket]);

  // Clear cache when bucket changes (funds or weightages)
  useEffect(() => {
    const fundHash = generateFundHash(bucket.funds.map(f => ({ id: f.id, weightage: f.weightage })));
    // This effect just ensures we have the latest fund hash
    // The actual cache check happens in loadLiveReturns
  }, [bucket.id, bucket.funds]);

  const loadLiveReturns = async () => {
    setIsLoading(true);
    setError(null);
    setLoadingProgress({ current: 0, total: 0, message: 'Loading live returns...' });

    try {
      // First, try to get from API (server-calculated, stored in database)
      const { getBucketLiveReturns, isDataStale } = await import('../services/bucketLiveReturnsService');
      const apiData = await getBucketLiveReturns(bucket.id);

      if (apiData && !isDataStale(apiData.calculationDate)) {
        // Use fresh API data
        setFundLiveReturns(apiData.fundLiveReturns || []);
        setBucketLiveReturns({
          bucketCagr3Y: apiData.bucketCagr3Y,
          bucketCagr5Y: apiData.bucketCagr5Y,
          lumpsumInvestment: apiData.lumpsumInvestment,
          lumpsumCurrentValue: apiData.lumpsumCurrentValue,
          lumpsumReturns: apiData.lumpsumReturns,
          lumpsumReturnsPercent: apiData.lumpsumReturnsPercent,
          sipTotalInvested: apiData.sipTotalInvested,
          sipCurrentValue: apiData.sipCurrentValue,
          sipXIRR: apiData.sipXIRR,
          sipProfitPercentage: apiData.sipProfitPercentage,
        });
        setIsFromCache(false); // From server, not local cache
        setIsLoading(false);
        return;
      }

      // If API data is stale or not available, check local cache
      const fundHash = generateFundHash(bucket.funds.map(f => ({ id: f.id, weightage: f.weightage })));
      const cached = loadFromCache(bucket.id, fundHash);

      if (cached) {
        setFundLiveReturns(cached.fundLiveReturns);
        setBucketLiveReturns(cached.bucketLiveReturns);
        setIsFromCache(true);
        setIsLoading(false);
        return; // Use cached data, skip calculation
      }

      // Not from cache, will calculate fresh
      setIsFromCache(false);

      // No cache found, proceed with calculation
      setLoadingProgress({ current: 0, total: 0, message: 'Initializing...' });
      const today = getToday();
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      const threeYearsAgoStr = threeYearsAgo.toISOString().split('T')[0];

      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      const fiveYearsAgoStr = fiveYearsAgo.toISOString().split('T')[0];

      // Fetch NAV data for all funds from 5 years ago to today (or from launch date if more recent)
      const schemeCodes = bucket.funds.map(f => f.id);
      // Find earliest date needed (either 5 years ago or earliest fund launch date)
      const earliestLaunchDate = bucket.funds.reduce((earliest, fund) => {
        const launchDate = new Date(fund.launchDate);
        return launchDate < earliest ? launchDate : earliest;
      }, new Date(fiveYearsAgoStr));
      const fetchStartDate = earliestLaunchDate < new Date(fiveYearsAgoStr)
        ? earliestLaunchDate.toISOString().split('T')[0]
        : fiveYearsAgoStr;

      setLoadingProgress({ current: 0, total: 100, message: 'Fetching NAV data...' });
      await yieldToBrowser();
      const navResponses = await fetchNAVData(schemeCodes, fetchStartDate, today);

      // Calculate fund-level metrics
      const fundMetrics: FundLiveReturns[] = [];
      let totalLumpsumInvestment = 0;
      let totalLumpsumValue = 0;
      let totalSIPInvested = 0;
      let totalSIPValue = 0;
      const sipCashFlows: Array<{ date: Date; amount: number }> = [];

      // Standard lumpsum investment amount (₹1,00,000)
      const lumpsumAmount = 100000;
      const sipMonthlyAmount = 1000;

      const totalFunds = bucket.funds.length;
      setLoadingProgress({ current: 0, total: totalFunds, message: 'Calculating fund metrics...' });
      await yieldToBrowser();

      for (let fundIndex = 0; fundIndex < bucket.funds.length; fundIndex++) {
        const fund = bucket.funds[fundIndex];
        setLoadingProgress({
          current: fundIndex + 1,
          total: totalFunds,
          message: `Processing ${fund.name}...`
        });
        await yieldToBrowser();
        const navResponse = navResponses.find(nav => nav.schemeCode === fund.id);
        if (!navResponse || navResponse.navData.length === 0) {
          fundMetrics.push({
            fundId: fund.id,
            fundName: fund.name,
            currentNAV: null,
            cagr3Y: null,
            cagr5Y: null,
            lumpsumInvestment: 0,
            lumpsumCurrentValue: null,
            lumpsumReturns: null,
            lumpsumReturnsPercent: null,
            sipTotalInvested: 0,
            sipCurrentValue: null,
            sipXIRR: null,
            positivePercentageFromLaunch: null,
          });
          continue;
        }

        // Get current NAV
        const currentNavEntry = getLatestNAVBeforeDate(navResponse.navData, today);
        const currentNAV = currentNavEntry?.nav || null;

        // Calculate 3-year CAGR
        const nav3YEntry = getNextAvailableNAV(navResponse.navData, threeYearsAgoStr);
        const cagr3Y = nav3YEntry && currentNavEntry
          ? computeFundCAGR([{ date: nav3YEntry.date, nav: nav3YEntry.nav }, { date: currentNavEntry.date, nav: currentNavEntry.nav }])
          : null;

        // Calculate 5-year CAGR
        const nav5YEntry = getNextAvailableNAV(navResponse.navData, fiveYearsAgoStr);
        const cagr5Y = nav5YEntry && currentNavEntry
          ? computeFundCAGR([{ date: nav5YEntry.date, nav: nav5YEntry.nav }, { date: currentNavEntry.date, nav: currentNavEntry.nav }])
          : null;

        // Calculate positive periods from fund launch date (3-year rolling window)
        let positivePercentageFromLaunch: number | null = null;
        const fundLaunchDate = new Date(fund.launchDate);
        const threeYearsFromLaunch = new Date(fundLaunchDate);
        threeYearsFromLaunch.setFullYear(threeYearsFromLaunch.getFullYear() + 3);

        if (threeYearsFromLaunch <= new Date(today) && navResponse.navData.length > 0) {
          // Filter NAV data from launch date onwards and sort by date
          const navFromLaunch = navResponse.navData
            .filter(nav => new Date(nav.date) >= fundLaunchDate)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          if (navFromLaunch.length > 0) {
            const rollingWindowDays = 1095; // 3 years
            const rollingReturns: number[] = [];

            // Process in chunks to prevent UI blocking
            await processInChunks(
              navFromLaunch,
              async (startNav, i) => {
                const startDate = new Date(startNav.date);
                const targetEndDate = new Date(startDate);
                targetEndDate.setDate(targetEndDate.getDate() + rollingWindowDays - 1);

                // Find NAV entry closest to 3 years from start date
                const endNav = getLatestNAVBeforeDate(navFromLaunch, targetEndDate.toISOString().split('T')[0]);

                if (endNav && startNav.nav > 0 && endNav.nav > 0) {
                  const actualDays = (new Date(endNav.date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
                  // Allow tolerance (within 30 days) for missing NAV data
                  if (actualDays >= rollingWindowDays - 30 && actualDays <= rollingWindowDays + 30) {
                    const years = actualDays / 365.25;
                    const annualizedReturn = ((endNav.nav / startNav.nav) ** (1 / years) - 1) * 100;
                    rollingReturns.push(annualizedReturn);
                  }
                }
              },
              50, // Process 50 entries at a time
              async (current, total) => {
                // Update progress for this fund's calculation
                if (current % 100 === 0 || current === total) {
                  setLoadingProgress({
                    current: fundIndex + 1,
                    total: totalFunds,
                    message: `Calculating rolling returns for ${fund.name} (${Math.round((current / total) * 100)}%)...`
                  });
                  await yieldToBrowser(); // Yield after progress update
                }
              }
            );

            if (rollingReturns.length > 0) {
              const positiveCount = rollingReturns.filter(r => r > 0).length;
              positivePercentageFromLaunch = (positiveCount / rollingReturns.length) * 100;
            }
          }
        }

        // Calculate Lumpsum returns (3 years ago)
        const fundLumpsumInvestment = (lumpsumAmount * fund.weightage) / 100;
        let lumpsumCurrentValue: number | null = null;
        let lumpsumReturns: number | null = null;
        let lumpsumReturnsPercent: number | null = null;

        if (nav3YEntry && currentNavEntry && nav3YEntry.nav > 0) {
          const unitsPurchased = fundLumpsumInvestment / nav3YEntry.nav;
          lumpsumCurrentValue = unitsPurchased * currentNavEntry.nav;
          lumpsumReturns = lumpsumCurrentValue - fundLumpsumInvestment;
          lumpsumReturnsPercent = (lumpsumReturns / fundLumpsumInvestment) * 100;
          totalLumpsumInvestment += fundLumpsumInvestment;
          totalLumpsumValue += lumpsumCurrentValue;
        }

        // Calculate SIP returns (₹1000 monthly for 3 years)
        const fundSIPMonthly = (sipMonthlyAmount * fund.weightage) / 100;
        let sipTotalInvested = 0;
        let totalSIPUnits = 0;
        const fundSipCashFlows: Array<{ date: Date; amount: number }> = [];

        // Generate SIP dates (1st of each month for 36 months)
        // Start from the 1st of the month, 3 years ago
        const threeYearsAgoDate = new Date(threeYearsAgoStr);
        const firstDayOfMonth = new Date(threeYearsAgoDate.getFullYear(), threeYearsAgoDate.getMonth(), 1);
        let sipStartDate = firstDayOfMonth.toISOString().split('T')[0];

        for (let month = 0; month < 36; month++) {
          const sipDate = addMonths(sipStartDate, month);
          const navEntry = getNextAvailableNAV(navResponse.navData, sipDate);

          if (navEntry && navEntry.nav > 0) {
            const unitsPurchased = fundSIPMonthly / navEntry.nav;
            totalSIPUnits += unitsPurchased;
            sipTotalInvested += fundSIPMonthly;
            fundSipCashFlows.push({
              date: new Date(navEntry.date),
              amount: -fundSIPMonthly, // Negative for investment
            });
          }
        }

        // Calculate final SIP value
        let sipCurrentValue: number | null = null;
        let sipXIRR: number | null = null;

        if (currentNavEntry && totalSIPUnits > 0) {
          sipCurrentValue = totalSIPUnits * currentNavEntry.nav;

          // Add final value as positive cashflow for XIRR
          const sipCashFlowsForXIRR = [
            ...fundSipCashFlows,
            { date: new Date(currentNavEntry.date), amount: sipCurrentValue }
          ];

          sipXIRR = calculateXIRR(sipCashFlowsForXIRR);
          totalSIPInvested += sipTotalInvested;
          totalSIPValue += sipCurrentValue;

          // Add to bucket-level cashflows for XIRR
          sipCashFlows.push(...fundSipCashFlows);
        }

        fundMetrics.push({
          fundId: fund.id,
          fundName: fund.name,
          currentNAV,
          cagr3Y,
          cagr5Y,
          lumpsumInvestment: fundLumpsumInvestment,
          lumpsumCurrentValue,
          lumpsumReturns,
          lumpsumReturnsPercent,
          sipTotalInvested,
          sipCurrentValue,
          sipXIRR,
          positivePercentageFromLaunch,
        });
      }

      // Calculate bucket-level metrics
      const weights: Record<string, number> = {};
      bucket.funds.forEach(fund => {
        weights[fund.id] = fund.weightage / 100;
      });

      const fundCagr3Y: Record<string, number | null> = {};
      const fundCagr5Y: Record<string, number | null> = {};
      fundMetrics.forEach(fm => {
        fundCagr3Y[fm.fundId] = fm.cagr3Y;
        fundCagr5Y[fm.fundId] = fm.cagr5Y;
      });

      const bucketCagr3Y = computeWeightedAverage(fundCagr3Y, weights);
      const bucketCagr5Y = computeWeightedAverage(fundCagr5Y, weights);

      // Add final bucket value to SIP cashflows for XIRR
      if (totalSIPValue > 0) {
        sipCashFlows.push({
          date: new Date(today),
          amount: totalSIPValue
        });
      }

      const bucketSipXIRR = sipCashFlows.length >= 2 ? calculateXIRR(sipCashFlows) : null;

      // Calculate SIP net profit percentage (same as SIP calculator)
      const sipProfitPercentage = totalSIPInvested > 0 && totalSIPValue > 0
        ? ((totalSIPValue - totalSIPInvested) / totalSIPInvested) * 100
        : null;

      const bucketReturns: BucketLiveReturns = {
        bucketCagr3Y,
        bucketCagr5Y,
        lumpsumInvestment: totalLumpsumInvestment,
        lumpsumCurrentValue: totalLumpsumValue > 0 ? totalLumpsumValue : null,
        lumpsumReturns: totalLumpsumValue > 0 ? totalLumpsumValue - totalLumpsumInvestment : null,
        lumpsumReturnsPercent: totalLumpsumInvestment > 0 && totalLumpsumValue > 0
          ? ((totalLumpsumValue - totalLumpsumInvestment) / totalLumpsumInvestment) * 100
          : null,
        sipTotalInvested: totalSIPInvested,
        sipCurrentValue: totalSIPValue > 0 ? totalSIPValue : null,
        sipXIRR: bucketSipXIRR,
        sipProfitPercentage,
      };

      setLoadingProgress({ current: totalFunds, total: totalFunds, message: 'Finalizing calculations...' });
      await yieldToBrowser();

      // Save to cache
      saveToCache(bucket.id, fundHash, fundMetrics, bucketReturns);

      setFundLiveReturns(fundMetrics);
      setBucketLiveReturns(bucketReturns);
    } catch (err) {
      console.error('Error loading live returns:', err);
      setError(err instanceof Error ? err.message : 'Failed to load live returns');
    } finally {
      setIsLoading(false);
      setLoadingProgress({ current: 0, total: 0, message: '' });
    }
  };

  const formatNumber = (num: number | null, decimals: number = 2): string => {
    if (num === null || isNaN(num)) return 'N/A';
    return num.toFixed(decimals);
  };

  const formatCurrency = (num: number | null): string => {
    if (num === null || isNaN(num)) return 'N/A';
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4 sm:space-y-6 mt-2 sm:mt-4 relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="p-6 sm:p-8 max-w-md w-full mx-4 bg-white shadow-2xl">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
              <div className="text-center w-full">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Calculating Performance Report
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {loadingProgress.message || 'Please wait...'}
                </p>
                {loadingProgress.total > 0 && (
                  <div className="w-full">
                    <div className="flex justify-between text-xs text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>
                        {loadingProgress.current} / {loadingProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                        style={{
                          width: `${(loadingProgress.current / loadingProgress.total) * 100}%`
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {Math.round((loadingProgress.current / loadingProgress.total) * 100)}% complete
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-4">
                  This may take a few moments...
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Portfolio Performance in 3-year rolling window */}
      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Portfolio Performance (3-Year Rolling Window)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {/* Net Returns */}
          <div className="p-2 sm:p-3 md:p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">Net Returns</p>
            <p className={`text-base sm:text-lg md:text-xl font-bold ${bucketLiveReturns && bucketLiveReturns.lumpsumReturnsPercent !== null && bucketLiveReturns.lumpsumReturnsPercent >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {bucketLiveReturns && bucketLiveReturns.lumpsumReturnsPercent !== null ? `${bucketLiveReturns.lumpsumReturnsPercent >= 0 ? '+' : ''}${formatNumber(bucketLiveReturns.lumpsumReturnsPercent)}%` : isLoading ? '...' : 'N/A'}
            </p>
          </div>

          {/* CAGR (3yr and 5yr stacked) */}
          <div className="p-2 sm:p-3 md:p-4 bg-purple-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">CAGR - 3 Yr</p>
            <p className={`text-base sm:text-lg font-bold mb-1 ${bucketLiveReturns && bucketLiveReturns.bucketCagr3Y !== null && bucketLiveReturns.bucketCagr3Y >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {bucketLiveReturns && bucketLiveReturns.bucketCagr3Y !== null ? `${formatNumber(bucketLiveReturns.bucketCagr3Y)}%` : isLoading ? '...' : 'N/A'}
            </p>
            <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">CAGR - 5 Yr</p>
            <p className={`text-base sm:text-lg font-bold ${bucketLiveReturns && bucketLiveReturns.bucketCagr5Y !== null && bucketLiveReturns.bucketCagr5Y >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {bucketLiveReturns && bucketLiveReturns.bucketCagr5Y !== null ? `${formatNumber(bucketLiveReturns.bucketCagr5Y)}%` : isLoading ? '...' : 'N/A'}
            </p>
          </div>

          {/* Max and Min Returns (stacked) */}
          <div className="p-2 sm:p-3 md:p-4 bg-emerald-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">Maximum Return</p>
            <p className="text-base sm:text-lg font-bold mb-1 text-emerald-700">
              {formatNumber(rollingReturns.bucket.max)}%
            </p>
            <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">Minimum Return</p>
            <p className="text-base sm:text-lg font-bold text-red-700">
              {formatNumber(rollingReturns.bucket.min)}%
            </p>
          </div>

          {/* Positive Periods */}
          <div className="p-2 sm:p-3 md:p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">Positive Periods</p>
            <p className="text-base sm:text-lg md:text-xl font-bold text-blue-700">
              {formatNumber(rollingReturns.bucket.positivePercentage)}%
            </p>
          </div>
        </div>
      </Card>

      {/* Individual Fund Performance */}
      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Individual Fund Performance</h3>
        <div className="overflow-x-auto -mx-4 sm:-mx-5 md:-mx-6 px-4 sm:px-5 md:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fund Name</TableHead>
                <TableHead>NAV</TableHead>
                <TableHead>CAGR - 3 Yr</TableHead>
                <TableHead className="hidden md:table-cell">CAGR - 5 Yr</TableHead>
                <TableHead className="hidden lg:table-cell">Positive Periods</TableHead>
                <TableHead className="hidden sm:table-cell">Max Return</TableHead>
                <TableHead className="hidden sm:table-cell">Min Return</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rollingReturns.funds.map((fundData) => {
                const fund = bucket.funds.find(f => f.id === fundData.fundId);
                const liveData = fundLiveReturns.find(f => f.fundId === fundData.fundId);
                return (
                  <TableRow key={fundData.fundId}>
                    <TableCell className="font-medium min-w-[140px] sm:min-w-[200px] text-xs sm:text-sm">
                      <span className="block whitespace-normal break-words">{fundData.fundName}</span>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {liveData && liveData.currentNAV !== null ? formatCurrency(liveData.currentNAV) : isLoading ? '...' : 'N/A'}
                    </TableCell>
                    <TableCell className={`text-xs sm:text-sm ${liveData && liveData.cagr3Y !== null && liveData.cagr3Y >= 0 ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}`}>
                      {liveData && liveData.cagr3Y !== null ? `${formatNumber(liveData.cagr3Y)}%` : isLoading ? '...' : 'N/A'}
                    </TableCell>
                    <TableCell className={`hidden md:table-cell text-xs sm:text-sm ${liveData && liveData.cagr5Y !== null && liveData.cagr5Y >= 0 ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}`}>
                      {liveData && liveData.cagr5Y !== null ? `${formatNumber(liveData.cagr5Y)}%` : isLoading ? '...' : 'N/A'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs sm:text-sm">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span className={liveData && liveData.positivePercentageFromLaunch !== null
                          ? (liveData.positivePercentageFromLaunch >= 70 ? 'text-green-700' : liveData.positivePercentageFromLaunch >= 50 ? 'text-yellow-700' : 'text-red-700')
                          : (fundData.positivePercentage >= 70 ? 'text-green-700' : fundData.positivePercentage >= 50 ? 'text-yellow-700' : 'text-red-700')
                        }>
                          {liveData && liveData.positivePercentageFromLaunch !== null
                            ? formatNumber(liveData.positivePercentageFromLaunch)
                            : formatNumber(fundData.positivePercentage)
                          }%
                        </span>
                        {((liveData && liveData.positivePercentageFromLaunch !== null && liveData.positivePercentageFromLaunch >= 70) ||
                          (liveData && liveData.positivePercentageFromLaunch === null && fundData.positivePercentage >= 70)) && (
                            <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                          )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-green-700 text-xs sm:text-sm">
                      {formatNumber(fundData.max)}%
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-red-700 text-xs sm:text-sm">
                      {formatNumber(fundData.min)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Live Returns */}
      <Card className="p-4 sm:p-5 md:p-6 bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 flex-shrink-0" />
            <span>Live Returns</span>
          </h3>
          {isFromCache && bucketLiveReturns && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              Cached
            </Badge>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <p className="text-sm text-red-700">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadLiveReturns}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !error && bucketLiveReturns && (
          <div className="space-y-4">
            {/* Lumpsum Returns */}
            <div className="p-4 bg-white rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <h4 className="font-semibold text-sm sm:text-base">Lumpsum Investment</h4>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-3">
                You would have made <strong className="text-emerald-700">{bucketLiveReturns.bucketCagr3Y !== null ? `${formatNumber(bucketLiveReturns.bucketCagr3Y)}%` : 'N/A'}</strong> annualised returns on {formatCurrency(bucketLiveReturns.lumpsumInvestment)} invested 3 years ago.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Investment</p>
                  <p className="text-sm sm:text-base font-bold text-gray-900">
                    {formatCurrency(bucketLiveReturns.lumpsumInvestment)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Current Value</p>
                  <p className="text-sm sm:text-base font-bold text-emerald-700">
                    {formatCurrency(bucketLiveReturns.lumpsumCurrentValue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Returns</p>
                  <p className={`text-sm sm:text-base font-bold ${bucketLiveReturns.lumpsumReturnsPercent !== null && bucketLiveReturns.lumpsumReturnsPercent >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatCurrency(bucketLiveReturns.lumpsumReturns)} ({formatNumber(bucketLiveReturns.lumpsumReturnsPercent)}%)
                  </p>
                </div>
              </div>
            </div>

            {/* SIP Returns */}
            <div className="p-4 bg-white rounded-lg border border-teal-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-teal-600" />
                <h4 className="font-semibold text-sm sm:text-base">SIP Investment</h4>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-3">
                You would have made <strong className="text-teal-700">{bucketLiveReturns.sipXIRR !== null ? `${formatNumber(bucketLiveReturns.sipXIRR)}%` : 'N/A'}</strong> annualized returns on ₹1,000 invested every month for 3 years.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total investment</p>
                  <p className="text-sm sm:text-base font-bold text-gray-900">
                    {formatCurrency(bucketLiveReturns.sipTotalInvested)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Current Value</p>
                  <p className="text-sm sm:text-base font-bold text-teal-700">
                    {formatCurrency(bucketLiveReturns.sipCurrentValue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Returns</p>
                  <p className={`text-sm sm:text-base font-bold ${bucketLiveReturns.sipProfitPercentage !== null && bucketLiveReturns.sipProfitPercentage >= 0 ? 'text-teal-700' : 'text-red-700'}`}>
                    {bucketLiveReturns.sipCurrentValue !== null && bucketLiveReturns.sipTotalInvested > 0 && bucketLiveReturns.sipProfitPercentage !== null
                      ? `${formatCurrency(bucketLiveReturns.sipCurrentValue - bucketLiveReturns.sipTotalInvested)} (${bucketLiveReturns.sipProfitPercentage >= 0 ? '+' : ''}${formatNumber(bucketLiveReturns.sipProfitPercentage)}%)`
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

