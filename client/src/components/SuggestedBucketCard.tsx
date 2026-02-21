import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { TrendingUp, Download, BarChart3, Sparkles } from 'lucide-react';
import type { SuggestedBucket } from '../types/suggestedBucket';

interface SuggestedBucketCardProps {
  bucket: SuggestedBucket;
  onViewPerformance: (bucket: SuggestedBucket) => void;
  onImportBucket: (bucket: SuggestedBucket, target: 'investment' | 'retirement') => void;
}

export function SuggestedBucketCard({ bucket, onViewPerformance, onImportBucket }: SuggestedBucketCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'3Y'>('3Y');
  const [calculatedReturns, setCalculatedReturns] = useState<{
    investment: number;
    value: number;
    returns: number;
    returnsPercent: number;
    avgReturn: number;
    isLive: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Standard investment amount for display
  const INVESTMENT_AMOUNT = 100000;

  useEffect(() => {
    let cancelled = false;

    const loadLiveData = async () => {
      setIsLoading(true);
      try {
        const { getBucketLiveReturns, isDataStale } = await import('../services/bucketLiveReturnsService');
        const apiData = await getBucketLiveReturns(bucket.id);

        if (cancelled) return;

        if (
          apiData &&
          !isDataStale(apiData.calculationDate) &&
          apiData.lumpsumInvestment != null &&
          apiData.lumpsumCurrentValue != null &&
          apiData.lumpsumReturns != null &&
          apiData.lumpsumReturnsPercent != null
        ) {
          setCalculatedReturns({
            investment: apiData.lumpsumInvestment,
            value: apiData.lumpsumCurrentValue,
            returns: apiData.lumpsumReturns,
            returnsPercent: apiData.lumpsumReturnsPercent,
            avgReturn: apiData.bucketCagr3Y ?? bucket.performance.rollingReturns.bucket.mean,
            isLive: true,
          });
          return;
        }
      } catch {
        // fall through to static calculation
      }

      if (cancelled) return;

      // Fallback: static estimate from stored rolling returns mean
      const meanAnnualReturn = bucket.performance.rollingReturns.bucket.mean / 100;
      const years = 3;
      const finalValue = INVESTMENT_AMOUNT * Math.pow(1 + meanAnnualReturn, years);
      const returns = finalValue - INVESTMENT_AMOUNT;
      const returnsPercent = (returns / INVESTMENT_AMOUNT) * 100;

      setCalculatedReturns({
        investment: INVESTMENT_AMOUNT,
        value: finalValue,
        returns,
        returnsPercent,
        avgReturn: bucket.performance.rollingReturns.bucket.mean,
        isLive: false,
      });
    };

    loadLiveData().finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [bucket]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'moderate':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'high':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals);
  };

  // Calculate bar widths relative to the maximum value
  const maxValue = calculatedReturns ? Math.max(
    calculatedReturns.investment,
    calculatedReturns.value,
    calculatedReturns.returns
  ) : INVESTMENT_AMOUNT;

  const investmentWidth = calculatedReturns ? (calculatedReturns.investment / maxValue) * 100 : 0;
  const valueWidth = calculatedReturns ? (calculatedReturns.value / maxValue) * 100 : 0;
  const returnsWidth = calculatedReturns ? (calculatedReturns.returns / maxValue) * 100 : 0;

  return (
    <Card className="group relative overflow-hidden border-2 border-slate-200 hover:border-blue-400 hover:shadow-2xl transition-all duration-300 bg-white">
      {/* Gradient Background Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

      <div className="p-5 sm:p-6 flex flex-col h-full">
        {/* Header Section */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {bucket.name}
                </h3>
              </div>
              {bucket.description && (
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mt-1">
                  {bucket.description}
                </p>
              )}
            </div>
            <Badge className={`${getRiskColor(bucket.riskLevel)} flex-shrink-0 text-xs font-semibold border`}>
              {bucket.riskLevel.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Returns Graph Section - Prominent Display */}
        <div className="mb-5 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-700">
              Based on 3 years performance
              {!isLoading && calculatedReturns && !calculatedReturns.isLive && (
                <span className="ml-1 text-gray-400 font-normal">(est.)</span>
              )}
            </span>
            <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 border border-gray-200">
              <button
                onClick={() => setSelectedPeriod('3Y')}
                className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${selectedPeriod === '3Y'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-blue-600'
                  }`}
              >
                3Y
              </button>
            </div>
          </div>

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="h-3 bg-gray-200 rounded w-24" />
                    <div className="h-4 bg-gray-200 rounded w-20" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded-md" />
                </div>
              ))}
            </div>
          ) : (
            /* Horizontal Bar Chart */
            calculatedReturns && (
              <div className="space-y-3">
                {/* Total Investment */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-600">Total Investment</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(calculatedReturns.investment)}</span>
                  </div>
                  <div className="relative h-6 bg-gray-100 rounded-md overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-slate-600 to-slate-700 rounded-md"
                      style={{ width: `${investmentWidth}%` }}
                    >
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 8px)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bucket Value */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-600">Bucket Value</span>
                    <span className="text-sm font-bold text-blue-700">{formatCurrency(calculatedReturns.value)}</span>
                  </div>
                  <div className="relative h-6 bg-gray-100 rounded-md overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-md"
                      style={{ width: `${valueWidth}%` }}
                    >
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Returns - Highlighted */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-600">Returns</span>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3 text-emerald-600" />
                      <span className="text-sm font-bold text-emerald-700">
                        {formatCurrency(calculatedReturns.returns)}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        +{formatNumber(calculatedReturns.returnsPercent)}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-6 bg-gray-100 rounded-md overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-md"
                      style={{ width: `${returnsWidth}%` }}
                    >
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Key Metrics */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-gray-600 mb-0.5">Avg Return</p>
            <p className="text-sm font-bold text-blue-700">
              {isLoading ? (
                <span className="inline-block h-4 w-10 bg-blue-200 rounded animate-pulse" />
              ) : calculatedReturns ? (
                `${formatNumber(calculatedReturns.avgReturn)}%`
              ) : (
                `${bucket.performance.rollingReturns.bucket.mean.toFixed(1)}%`
              )}
            </p>
          </div>
          <div className="text-center p-2 bg-emerald-50 rounded-lg border border-emerald-100">
            <p className="text-xs text-gray-600 mb-0.5">Positive</p>
            <p className="text-sm font-bold text-emerald-700">
              {bucket.performance.rollingReturns.bucket.positivePercentage.toFixed(0)}%
            </p>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-100">
            <p className="text-xs text-gray-600 mb-0.5">Funds</p>
            <p className="text-sm font-bold text-purple-700">
              {bucket.funds.length}
            </p>
          </div>
        </div>

        {/* Funds Preview */}
        <div className="mb-4 flex-1">
          <p className="text-xs font-semibold text-gray-700 mb-2">Portfolio Composition</p>
          <div className="space-y-1.5">
            {bucket.funds.slice(0, 2).map((fund) => (
              <div key={fund.id} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                <span className="text-gray-700 truncate flex-1 min-w-0">{fund.name}</span>
                <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">{fund.weightage}%</Badge>
              </div>
            ))}
            {bucket.funds.length > 2 && (
              <p className="text-xs text-gray-500 italic">
                +{bucket.funds.length - 2} more funds
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-4 border-t border-gray-200 mt-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewPerformance(bucket)}
            className="w-full text-xs sm:text-sm h-9 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
          >
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span>View Performance</span>
          </Button>

          <div className="grid grid-cols-2 gap-2">
            {bucket.category === 'investment' || bucket.category === 'both' ? (
              <Button
                size="sm"
                onClick={() => onImportBucket(bucket, 'investment')}
                className="text-xs sm:text-sm h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                <Download className="h-3 w-3 mr-1" />
                <span className="truncate">Investment</span>
              </Button>
            ) : null}
            {bucket.category === 'retirement' || bucket.category === 'both' ? (
              <Button
                size="sm"
                onClick={() => onImportBucket(bucket, 'retirement')}
                className="text-xs sm:text-sm h-9 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              >
                <Download className="h-3 w-3 mr-1" />
                <span className="truncate">Retirement</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}


