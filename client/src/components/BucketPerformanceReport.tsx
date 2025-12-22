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
  const [fundLiveReturns, setFundLiveReturns] = useState<FundLiveReturns[]>([]);
  const [bucketLiveReturns, setBucketLiveReturns] = useState<BucketLiveReturns | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { rollingReturns } = bucket.performance;

  useEffect(() => {
    loadLiveReturns();
  }, [bucket]);

  const loadLiveReturns = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const today = getToday();
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      const threeYearsAgoStr = threeYearsAgo.toISOString().split('T')[0];

      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      const fiveYearsAgoStr = fiveYearsAgo.toISOString().split('T')[0];

      // Fetch NAV data for all funds from 5 years ago to today
      const schemeCodes = bucket.funds.map(f => f.id);
      const navResponses = await fetchNAVData(schemeCodes, fiveYearsAgoStr, today);

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

      for (const fund of bucket.funds) {
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

      setFundLiveReturns(fundMetrics);
      setBucketLiveReturns(bucketReturns);
    } catch (err) {
      console.error('Error loading live returns:', err);
      setError(err instanceof Error ? err.message : 'Failed to load live returns');
    } finally {
      setIsLoading(false);
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
    <div className="space-y-4 sm:space-y-6 mt-2 sm:mt-4">
      {/* Portfolio Performance in 3-year rolling window */}
      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Portfolio Performance (3-Year Rolling Window)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <div className="p-2 sm:p-3 md:p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">Positive Periods</p>
            <p className="text-base sm:text-lg md:text-xl font-bold text-blue-700">
              {formatNumber(rollingReturns.bucket.positivePercentage)}%
            </p>
          </div>
          <div className="p-2 sm:p-3 md:p-4 bg-emerald-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">Maximum Return</p>
            <p className="text-base sm:text-lg font-bold text-emerald-700">
              {formatNumber(rollingReturns.bucket.max)}%
            </p>
          </div>
          <div className="p-2 sm:p-3 md:p-4 bg-red-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">Minimum Return</p>
            <p className="text-base sm:text-lg font-bold text-red-700">
              {formatNumber(rollingReturns.bucket.min)}%
            </p>
          </div>
          <div className="p-2 sm:p-3 md:p-4 bg-purple-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">CAGR - 5 Yr</p>
            <p className={`text-base sm:text-lg font-bold ${bucketLiveReturns && bucketLiveReturns.bucketCagr5Y !== null && bucketLiveReturns.bucketCagr5Y >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {bucketLiveReturns && bucketLiveReturns.bucketCagr5Y !== null ? `${formatNumber(bucketLiveReturns.bucketCagr5Y)}%` : isLoading ? '...' : 'N/A'}
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
                <TableHead>CAGR - 5 Yr</TableHead>
                <TableHead>Positive Periods</TableHead>
                <TableHead>Max Return</TableHead>
                <TableHead>Min Return</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rollingReturns.funds.map((fundData) => {
                const fund = bucket.funds.find(f => f.id === fundData.fundId);
                const liveData = fundLiveReturns.find(f => f.fundId === fundData.fundId);
                return (
                  <TableRow key={fundData.fundId}>
                    <TableCell className="font-medium max-w-[120px] sm:max-w-xs truncate text-xs sm:text-sm">
                      {fundData.fundName}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {liveData && liveData.currentNAV !== null ? formatCurrency(liveData.currentNAV) : isLoading ? '...' : 'N/A'}
                    </TableCell>
                    <TableCell className={`text-xs sm:text-sm ${liveData && liveData.cagr3Y !== null && liveData.cagr3Y >= 0 ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}`}>
                      {liveData && liveData.cagr3Y !== null ? `${formatNumber(liveData.cagr3Y)}%` : isLoading ? '...' : 'N/A'}
                    </TableCell>
                    <TableCell className={`text-xs sm:text-sm ${liveData && liveData.cagr5Y !== null && liveData.cagr5Y >= 0 ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}`}>
                      {liveData && liveData.cagr5Y !== null ? `${formatNumber(liveData.cagr5Y)}%` : isLoading ? '...' : 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span className={fundData.positivePercentage >= 70 ? 'text-green-700' : fundData.positivePercentage >= 50 ? 'text-yellow-700' : 'text-red-700'}>
                          {formatNumber(fundData.positivePercentage)}%
                        </span>
                        {fundData.positivePercentage >= 70 && (
                          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-green-700 text-xs sm:text-sm">
                      {formatNumber(fundData.max)}%
                    </TableCell>
                    <TableCell className="text-red-700 text-xs sm:text-sm">
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
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 flex-shrink-0" />
          <span>Live Returns</span>
        </h3>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="ml-2 text-sm text-gray-600">Calculating live returns...</span>
          </div>
        )}

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
                You would have made <strong className="text-teal-700">{bucketLiveReturns.sipXIRR !== null ? `${formatNumber(bucketLiveReturns.sipXIRR)}%` : 'N/A'}</strong> CAGR on ₹1,000 invested monthly for 3 years.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Invested</p>
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
                  <p className="text-xs text-gray-600 mb-1">Net profit %</p>
                  <p className={`text-sm sm:text-base font-bold ${bucketLiveReturns.sipProfitPercentage !== null && bucketLiveReturns.sipProfitPercentage >= 0 ? 'text-teal-700' : 'text-red-700'}`}>
                    {bucketLiveReturns.sipProfitPercentage !== null ? `${bucketLiveReturns.sipProfitPercentage >= 0 ? '+' : ''}${formatNumber(bucketLiveReturns.sipProfitPercentage)}%` : 'N/A'}
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

