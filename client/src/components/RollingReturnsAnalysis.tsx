import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Percent, Activity, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { calculateBucketPerformance, BucketPerformanceMetrics } from '../utils/bucketPerformanceCalculator';
import type { SelectedFund } from '../App';

interface RollingReturnsAnalysisProps {
    funds: SelectedFund[];
    onMetricsCalculated?: (metrics: BucketPerformanceMetrics) => void;
}

interface AnalysisState {
    metrics: BucketPerformanceMetrics | null;
    isLoading: boolean;
    error: string | null;
}

export function RollingReturnsAnalysis({ funds, onMetricsCalculated }: RollingReturnsAnalysisProps) {
    const [state, setState] = useState<AnalysisState>({
        metrics: null,
        isLoading: false,
        error: null,
    });

    useEffect(() => {
        let isMounted = true;

        const calculate = async () => {
            if (funds.length === 0) {
                if (isMounted) setState({ metrics: null, isLoading: false, error: null });
                return;
            }

            // Check if we already have the result for these exact funds (optimization could be added here, but simple effect is safer for now)

            if (isMounted) setState(prev => ({ ...prev, isLoading: true, error: null }));

            try {
                const result = await calculateBucketPerformance(funds);

                if (isMounted) {
                    setState({ metrics: result, isLoading: false, error: null });
                    if (onMetricsCalculated) {
                        onMetricsCalculated(result);
                    }
                }
            } catch (err: any) {
                if (isMounted) {
                    setState({ metrics: null, isLoading: false, error: err.message || 'Failed to calculate rolling returns' });
                }
            }
        };

        calculate();

        return () => {
            isMounted = false;
        };
    }, [funds]); // Re-run when funds change

    if (funds.length === 0) return null;

    if (state.isLoading) {
        return (
            <Card className="p-6 border-slate-200">
                <div className="flex items-center justify-center gap-3 text-slate-600">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <span>Analyzing portfolio historical performance...</span>
                </div>
            </Card>
        );
    }

    if (state.error) {
        return (
            <Card className="p-4 bg-red-50 border-red-200">
                <div className="flex items-center gap-2 text-red-700 mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Analysis Error</span>
                </div>
                <p className="text-sm text-red-600">{state.error}</p>
            </Card>
        );
    }

    const { metrics } = state;
    if (!metrics || metrics.windowType === 'insufficient') {
        return (
            <Card className="p-6 bg-amber-50 border-amber-200">
                <div className="flex items-center gap-2 text-amber-800 mb-2">
                    <AlertCircle className="h-5 w-5" />
                    <h3 className="font-semibold">Insufficient Historical Data</h3>
                </div>
                <p className="text-sm text-amber-700">
                    {metrics?.message || 'Not enough historical data available to calculate rolling returns for the selected funds.'}
                </p>
            </Card>
        );
    }

    const stats = metrics.rollingReturns.bucket;
    const is3Y = metrics.windowType === '3Y';

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Portfolio Performance Analysis
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                    Based on {is3Y ? '3-year' : '1-year'} rolling returns (Daily Lumpsum)
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 border-slate-100">
                {/* Mean Return */}
                <div className="p-4 sm:p-6 text-center">
                    <div className="text-sm text-slate-500 mb-1 flex items-center justify-center gap-1.5">
                        Average Return
                    </div>
                    <div className={`text-2xl font-bold ${stats.mean >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.mean.toFixed(2)}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Mean Annualized</div>
                </div>

                {/* Max Return */}
                <div className="p-4 sm:p-6 text-center">
                    <div className="text-sm text-slate-500 mb-1 flex items-center justify-center gap-1.5">
                        Best Performance
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                        +{stats.max.toFixed(2)}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Maximum Return</div>
                </div>

                {/* Min Return */}
                <div className="p-4 sm:p-6 text-center">
                    <div className="text-sm text-slate-500 mb-1 flex items-center justify-center gap-1.5">
                        Worst Performance
                    </div>
                    <div className={`text-2xl font-bold ${stats.min >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.min > 0 ? '+' : ''}{stats.min.toFixed(2)}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Minimum Return</div>
                </div>

                {/* Positive Periods */}
                <div className="p-4 sm:p-6 text-center">
                    <div className="text-sm text-slate-500 mb-1 flex items-center justify-center gap-1.5">
                        Consistency
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                        {stats.positivePercentage.toFixed(2)}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Positive Periods</div>
                </div>
            </div>
        </Card>
    );
}
