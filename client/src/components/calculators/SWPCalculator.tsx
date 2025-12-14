import React, { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Info, Loader2 } from 'lucide-react';
import type { SelectedFund } from '../../App';
import { fetchNAVData } from '../../services/navService';
import { SimpleRollingReturnCard } from '../SimpleRollingReturnCard';
import { calculateXIRR } from '../../utils/financialCalculations';
import { getLatestNAVBeforeDate, getToday } from '../../utils/dateUtils';
import {
  simulateSWP,
  SWPStrategy,
  TimelineEntry,
} from '../../utils/swpSimulation';
import {
  computeFundAnnualizedVolatility,
  computeFundCAGR,
  computeWeightedAverage,
} from '../../utils/portfolioStats';
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '../ui/tooltip';

interface SWPCalculatorProps {
  funds: SelectedFund[];
  initialInvestment?: number;
  initialWithdrawal?: number;
  initialFrequency?: Frequency;
  initialDuration?: number; // in years
  hideAdvanced?: boolean; // Hide advanced options for normal mode
  initialPurchaseDate?: string;
  initialSwpStartDate?: string;
  initialEndDate?: string;
  initialRiskFactor?: number;
  forcedMode?: CalculatorMode; // Force a specific mode and hide tabs
  title?: string; // Custom title for the calculator
}

type Frequency = 'Monthly' | 'Quarterly' | 'Custom';

type CalculatorMode = 'NORMAL' | 'CORPUS' | 'TARGET';

interface ChartPoint {
  date: string;
  invested: number;
  withdrawn: number;
  portfolioValue: number;
  [key: string]: string | number;
}

interface FundSummary {
    fundId: string;
    fundName: string;
    weightage: number;
  navAtPurchase: number;
  unitsPurchased: number;
    remainingUnits: number;
  totalWithdrawn: number;
    currentValue: number;
}

interface TableRowData {
    date: string;
  fundId: string;
  fundName: string;
  navDate: string;
  nav: number;
  withdrawalAmount: number;
  unitsRedeemed: number;
  unitsLeft: number;
  fundValue: number;
  portfolioValue: number;
  totalWithdrawal: number;
  investedValue: number;
  profitLoss: number;
  principalDepletedValue: number;
  principalDepletionPercent: number;
}

interface SWPCalculationResult {
  totalInvested: number;
  totalWithdrawn: number;
  finalCorpus: number;
  finalPrincipalRemaining: number;
  finalProfitRemaining: number;
  xirr: number | null;
  maxDrawdown: number;
  survivalMonths: number;
  depletedOn?: string | null;
  timeline: TimelineEntry[];
  chartData: ChartPoint[];
  fundSummaries: FundSummary[];
  tableRows: TableRowData[];
}

interface SWPInsights {
  portfolioCAGR: number | null;
  portfolioVolatility: number | null;
  swrAnnualPercent: number | null;
  swrPeriodPercent: number | null;
  riskFactor: number;
  safeMonthlyWithdrawal: number | null;
  requiredCorpusIndefinite: number | null;
  requiredCorpusFixedHorizon: number | null;
  adjustedReturnPercent: number | null;
}

const DEFAULT_RISK_ORDER = [
  'LIQUID',
  'DEBT',
  'HYBRID',
  'EQUITY_L',
  'EQUITY_M',
  'EQUITY_S',
] as const;

const RISK_BUCKET_LABELS: Record<string, string> = {
  LIQUID: 'Liquid / Overnight',
  DEBT: 'Debt / Income',
  HYBRID: 'Hybrid / Balanced',
  EQUITY_L: 'Equity - Large',
  EQUITY_M: 'Equity - Mid',
  EQUITY_S: 'Equity - Small',
};

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

const formatNumber = (value: number, digits = 2): string =>
  value.toLocaleString('en-IN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });

const deriveRiskBucket = (category: string | undefined): string => {
  if (!category) return 'EQUITY_M';
  const normalized = category.toLowerCase();
  if (normalized.includes('liquid') || normalized.includes('overnight')) return 'LIQUID';
  if (
    normalized.includes('debt') ||
    normalized.includes('income') ||
    normalized.includes('bond')
  )
    return 'DEBT';
  if (
    normalized.includes('hybrid') ||
    normalized.includes('balanced') ||
    normalized.includes('allocation')
  )
    return 'HYBRID';
  if (normalized.includes('mid')) return 'EQUITY_M';
  if (normalized.includes('small')) return 'EQUITY_S';
  if (normalized.includes('large')) return 'EQUITY_L';
  return 'EQUITY_M';
};

const round2 = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const periodsPerYearFromFrequency = (
  frequency: Frequency,
  customDays: number,
): number => {
  if (frequency === 'Monthly') return 12;
  if (frequency === 'Quarterly') return 4;
  const days = Math.max(1, customDays || 30);
  return Math.max(1, 365.25 / days);
};

const frequencyLabel = (frequency: Frequency, customDays: number) => {
  if (frequency === 'Monthly') return 'monthly';
  if (frequency === 'Quarterly') return 'per quarter';
  return `every ${customDays} days`;
};

export function SWPCalculator({ 
  funds, 
  initialInvestment, 
  initialWithdrawal, 
  initialFrequency,
  initialDuration,
  hideAdvanced = false,
  initialPurchaseDate,
  initialSwpStartDate,
  initialEndDate,
  initialRiskFactor,
  forcedMode,
  title
}: SWPCalculatorProps) {
  const [purchaseDate, setPurchaseDate] = useState<string>(initialPurchaseDate || '');
  const [swpStartDate, setSwpStartDate] = useState<string>(initialSwpStartDate || '');
  const [endDate, setEndDate] = useState<string>(initialEndDate || '');
  const [totalInvestment, setTotalInvestment] = useState<number>(initialInvestment || 0);
  const [withdrawalAmount, setWithdrawalAmount] = useState<number>(initialWithdrawal || 10000);
  const [frequency, setFrequency] = useState<Frequency>(initialFrequency || 'Monthly');
  const [customFrequencyDays, setCustomFrequencyDays] = useState<number>(30);
  const [strategy, setStrategy] = useState<SWPStrategy>('PROPORTIONAL');
  const [fundRisk, setFundRisk] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showTable, setShowTable] = useState<boolean>(false);
  const [mode, setMode] = useState<CalculatorMode>(forcedMode || 'NORMAL');
  const [autoWithdrawal, setAutoWithdrawal] = useState<number | null>(null);
  const [autoCorpus, setAutoCorpus] = useState<number | null>(null);
  const [desiredWithdrawal, setDesiredWithdrawal] = useState<number>(0);
  const [durationYears, setDurationYears] = useState<number>(0);
  const [riskFactor, setRiskFactor] = useState<number>(initialRiskFactor || 3);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<SWPInsights | null>(null);
  const [result, setResult] = useState<SWPCalculationResult | null>(null);
  const [selectedFundView, setSelectedFundView] = useState<string>('bucket');

  useEffect(() => {
    setFundRisk((prev) => {
      const next: Record<string, string> = {};
      funds.forEach((fund) => {
        next[fund.id] = prev[fund.id] ?? deriveRiskBucket(fund.category);
      });
      return next;
    });
  }, [funds]);

  // Set initial values from props if provided
  useEffect(() => {
    if (initialInvestment && initialInvestment > 0) {
      setTotalInvestment(initialInvestment);
    }
    if (initialWithdrawal && initialWithdrawal > 0) {
      setWithdrawalAmount(initialWithdrawal);
    }
    if (initialFrequency) {
      setFrequency(initialFrequency);
    }
  }, [initialInvestment, initialWithdrawal, initialFrequency]);

  const handleModeChange = (value: string) => {
    if (forcedMode) return; // Don't allow mode change if forced
    const nextMode = value as CalculatorMode;
    setMode(nextMode);
    setError(null);
  };
  
  // Lock mode if forced
  useEffect(() => {
    if (forcedMode) {
      setMode(forcedMode);
    }
  }, [forcedMode]);

  const generateWithdrawalDates = (start: string, end: string): string[] => {
    const dates: string[] = [];
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    let currentDate = new Date(startDateObj);

    if (frequency === 'Monthly') {
      while (currentDate <= endDateObj) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    } else if (frequency === 'Quarterly') {
      while (currentDate <= endDateObj) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setMonth(currentDate.getMonth() + 3);
      }
    } else {
      while (currentDate <= endDateObj) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + customFrequencyDays);
      }
    }

    return dates;
  };

  const displayedSafeWithdrawal =
    autoWithdrawal ?? (insights?.safeMonthlyWithdrawal ?? null);
  const displayedRequiredCorpus =
    autoCorpus ?? (insights?.requiredCorpusIndefinite ?? null);
  const displayedHorizonCorpus =
    durationYears > 0
      ? autoCorpus ?? (insights?.requiredCorpusFixedHorizon ?? null)
      : null;
  const frequencyDescriptor = frequencyLabel(frequency, customFrequencyDays);

  const calculateSWP = async () => {
    // Prevent multiple simultaneous calculations
    if (isLoading) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    setInsights(null);
    setAutoWithdrawal(null);
    setAutoCorpus(null);
    setSelectedFundView('bucket');

    try {
      if (!purchaseDate) {
        throw new Error('Please select the initial investment date.');
      }
      if (!swpStartDate) {
        throw new Error('Please select the SWP start date.');
      }
      if (!endDate) {
        throw new Error('Please select the SWP end date.');
      }

      if (new Date(purchaseDate) > new Date(swpStartDate)) {
        throw new Error('SWP start date must be on or after the investment date.');
      }
      if (new Date(swpStartDate) > new Date(endDate)) {
        throw new Error('End date must be after the SWP start date.');
      }

      if ((mode === 'NORMAL' || mode === 'CORPUS') && totalInvestment <= 0) {
        throw new Error('Please enter the total investment amount.');
      }

      if (mode === 'NORMAL' && withdrawalAmount <= 0) {
        throw new Error('Withdrawal amount must be greater than zero.');
      }

      if (mode === 'TARGET' && desiredWithdrawal <= 0) {
        throw new Error('Please enter the desired monthly withdrawal.');
      }

      if (funds.length === 0) {
        throw new Error('Please select at least one fund.');
      }

      if (strategy === 'RISK_BUCKET') {
        const missingRisk = funds.filter((fund) => !fundRisk[fund.id]);
        if (missingRisk.length > 0) {
          throw new Error('Assign a risk bucket to every fund to use the risk-based strategy.');
        }
      }

      const schemeCodes = funds.map((fund) => fund.id);
      const navResponses = await fetchNAVData(schemeCodes, purchaseDate, endDate);

      if (navResponses.length === 0) {
        throw new Error('No NAV data available for the selected funds.');
      }

      const navMap: Record<string, { date: string; nav: number }[]> = {};
      navResponses.forEach((response) => {
        navMap[response.schemeCode] = response.navData.map((entry) => ({
          date: entry.date,
          nav: Number(entry.nav),
        }));
      });

      const withdrawalSchedule = generateWithdrawalDates(swpStartDate, endDate);
      if (withdrawalSchedule.length === 0) {
        throw new Error('No withdrawal dates generated for the selected range.');
      }

      const totalWeight = funds.reduce((sum, fund) => sum + fund.weightage, 0);
      if (totalWeight <= 0) {
        throw new Error('Fund weightages must sum to a positive number.');
      }

      const targetWeights: Record<string, number> = {};
      funds.forEach((fund) => {
        targetWeights[fund.id] = fund.weightage / totalWeight;
      });

      const fundCagrs: Record<string, number | null> = {};
      const fundVols: Record<string, number | null> = {};
      funds.forEach((fund) => {
        const series = navMap[fund.id];
        fundCagrs[fund.id] = computeFundCAGR(series);
        fundVols[fund.id] = computeFundAnnualizedVolatility(series);
      });

      const portfolioCAGR = computeWeightedAverage(fundCagrs, targetWeights);
      const portfolioVolatility = computeWeightedAverage(fundVols, targetWeights);
      const effectiveRiskFactor = Math.max(0.1, riskFactor);
      const periodsPerYear = periodsPerYearFromFrequency(frequency, customFrequencyDays);

      const swrAnnualPercent =
        portfolioCAGR !== null ? portfolioCAGR / effectiveRiskFactor : null;
      const swrPeriodPercent =
        swrAnnualPercent !== null ? swrAnnualPercent / periodsPerYear : null;
      const swrPeriodRate =
        swrPeriodPercent !== null ? swrPeriodPercent / 100 : null;

      const safeWithdrawalPerPeriod =
        swrPeriodRate && swrPeriodRate > 0
          ? totalInvestment * swrPeriodRate
          : null;

      const desiredPerPeriod =
        mode === 'TARGET' && desiredWithdrawal > 0 ? desiredWithdrawal : null;

      const requiredCorpusIndefinite =
        desiredPerPeriod && swrPeriodRate && swrPeriodRate > 0
          ? desiredPerPeriod / swrPeriodRate
          : null;

      const adjustedReturnPercent =
        portfolioCAGR !== null
          ? Math.max(0, portfolioCAGR - (portfolioVolatility ?? 0))
          : null;
      const adjustedReturnRate =
        adjustedReturnPercent !== null ? adjustedReturnPercent / 100 : null;

      let requiredCorpusFixedHorizon: number | null = null;
      if (desiredPerPeriod && durationYears > 0) {
        const annualWithdrawal = desiredPerPeriod * periodsPerYear;
        if (adjustedReturnRate && adjustedReturnRate > 0) {
          requiredCorpusFixedHorizon =
            annualWithdrawal *
            (1 - Math.pow(1 + adjustedReturnRate, -durationYears)) /
            adjustedReturnRate;
                } else {
          requiredCorpusFixedHorizon = annualWithdrawal * durationYears;
        }
      }

      let simulationTotalInvestment = totalInvestment;
      let simulationWithdrawal =
        mode === 'TARGET' ? desiredWithdrawal : withdrawalAmount;

      const corpusForTarget =
        mode === 'TARGET'
          ? (() => {
              const horizonCorpus =
                durationYears > 0 && requiredCorpusFixedHorizon && requiredCorpusFixedHorizon > 0
                  ? requiredCorpusFixedHorizon
                  : null;
              const indefiniteCorpus =
                requiredCorpusIndefinite && requiredCorpusIndefinite > 0
                  ? requiredCorpusIndefinite
                  : null;
              return horizonCorpus ?? indefiniteCorpus ?? null;
            })()
          : null;

      if (mode === 'CORPUS') {
        if (safeWithdrawalPerPeriod && safeWithdrawalPerPeriod > 0) {
          simulationWithdrawal = safeWithdrawalPerPeriod;
          setAutoWithdrawal(safeWithdrawalPerPeriod);
          setWithdrawalAmount(safeWithdrawalPerPeriod);
        } else {
          throw new Error(
            'Unable to calculate a safe monthly withdrawal for the selected funds. Try adjusting your fund selection or risk factor.'
          );
        }
      } else if (mode === 'TARGET') {
        if (!corpusForTarget || corpusForTarget <= 0) {
          throw new Error(
            'Unable to calculate the required corpus for the target withdrawal with the current data.'
          );
        }
        simulationTotalInvestment = corpusForTarget;
        simulationWithdrawal = desiredWithdrawal;
        setAutoCorpus(corpusForTarget);
        setTotalInvestment(corpusForTarget);
        setWithdrawalAmount(desiredWithdrawal);
        } else {
        // Normal mode: reset auto hints
        setAutoWithdrawal(null);
        setAutoCorpus(null);
      }

      setInsights({
        portfolioCAGR,
        portfolioVolatility,
        swrAnnualPercent,
        swrPeriodPercent,
        riskFactor: effectiveRiskFactor,
        safeMonthlyWithdrawal: safeWithdrawalPerPeriod,
        requiredCorpusIndefinite,
        requiredCorpusFixedHorizon,
        adjustedReturnPercent,
      });

      const initialUnits: Record<string, number> = {};
      const navAtPurchase: Record<string, number> = {};
      const initialInvestmentByFund: Record<string, number> = {};

      const findNavForDate = (series: { date: string; nav: number }[], dateISO: string) => {
        const before = getLatestNAVBeforeDate(series, dateISO);
        if (before) return before;
        const ascending = [...series].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        return ascending.find((point) => new Date(point.date) >= new Date(dateISO)) ?? null;
      };

      funds.forEach((fund) => {
        const series = navMap[fund.id];
        if (!series || series.length === 0) {
          throw new Error(`No NAV history found for ${fund.name}.`);
        }
        const navPoint = findNavForDate(series, purchaseDate);
        if (!navPoint) {
          throw new Error(`No NAV available around ${purchaseDate} for ${fund.name}.`);
        }
        navAtPurchase[fund.id] = navPoint.nav;

        const amountForFund = simulationTotalInvestment * (fund.weightage / totalWeight);
        const units = navPoint.nav > 0 ? amountForFund / navPoint.nav : 0;
        initialUnits[fund.id] = units;
        initialInvestmentByFund[fund.id] = amountForFund;
      });

      const simulation = simulateSWP({
        startDate: purchaseDate,
        withdrawalAmount: simulationWithdrawal,
        withdrawalDates: withdrawalSchedule,
        strategy,
        targetWeights,
        initialUnits,
        navSeriesByFund: navMap,
        riskOrder: strategy === 'RISK_BUCKET' ? [...DEFAULT_RISK_ORDER] : undefined,
        fundRisk: strategy === 'RISK_BUCKET' ? fundRisk : undefined,
      });

      const withdrawalEntries = simulation.timeline.filter(
        (entry) => entry.action?.type === 'WITHDRAWAL'
      );

      const fundSummaries: FundSummary[] = funds.map((fund) => {
        const fundResult = simulation.fundResults.find((f) => f.fundId === fund.id);
        const remainingUnits = fundResult?.remainingUnits ?? 0;
        const finalNavPoint =
          navMap[fund.id] && navMap[fund.id].length > 0
            ? getLatestNAVBeforeDate(navMap[fund.id], endDate) ||
              navMap[fund.id][navMap[fund.id].length - 1]
            : null;
        const finalNav = finalNavPoint?.nav ?? 0;
        const currentValue = round2(remainingUnits * finalNav);

        return {
          fundId: fund.id,
          fundName: fund.name,
          weightage: fund.weightage,
          navAtPurchase: navAtPurchase[fund.id],
          unitsPurchased: initialUnits[fund.id],
          remainingUnits,
          totalWithdrawn: fundResult?.totalWithdrawn ?? 0,
          currentValue,
        };
      });

      const finalCorpus = round2(
        fundSummaries.reduce((sum, fund) => sum + fund.currentValue, 0)
      );

      // Calculate final principal remaining and profit
      const finalPrincipalRemaining = round2(
        fundSummaries.reduce((sum, fund) => {
          const investedValue = fund.remainingUnits * navAtPurchase[fund.fundId];
          return sum + investedValue;
        }, 0)
      );
      const finalProfitRemaining = round2(finalCorpus - finalPrincipalRemaining);

      const cashflows = [
        { date: new Date(purchaseDate), amount: -simulationTotalInvestment },
        ...simulation.cashflows.overall.map((cf) => ({
          date: new Date(cf.date),
          amount: cf.amount,
        })),
      ];

      const finalCashflowDate = simulation.totals.depletedOn ?? endDate;
      if (finalCorpus > 0 || simulation.totals.depletedOn) {
        cashflows.push({ date: new Date(finalCashflowDate), amount: finalCorpus });
      }

      const hasPositive = cashflows.some((cf) => cf.amount > 0);
      const hasNegative = cashflows.some((cf) => cf.amount < 0);
      const xirr =
        hasPositive && hasNegative && cashflows.length >= 2
          ? calculateXIRR(cashflows)
          : null;

      let cumulativeWithdrawn = 0;
      const chartData: ChartPoint[] = simulation.timeline.map((entry) => {
        if (entry.action?.type === 'WITHDRAWAL') {
          cumulativeWithdrawn = round2(
            cumulativeWithdrawn + (entry.action.amount ?? 0)
          );
        }

        const point: ChartPoint = {
          date: entry.date,
          invested: simulationTotalInvestment,
          withdrawn: cumulativeWithdrawn,
          portfolioValue: entry.portfolioValue,
        };

        funds.forEach((fund) => {
          const series = navMap[fund.id];
          const navPoint =
            series && series.length > 0
              ? getLatestNAVBeforeDate(series, entry.date) || series[series.length - 1]
              : null;
          const navValue = navPoint?.nav ?? 0;
          const units = entry.totalUnits[fund.id] ?? 0;
          point[fund.name] = round2(units * navValue);
        });

        return point;
      });


      const tableRows: TableRowData[] = [];
      withdrawalEntries.forEach((entry) => {
        funds.forEach((fund) => {
          const series = navMap[fund.id];
          const sale = entry.action?.perFund?.find((s) => s.fundId === fund.id);
          const navPoint = sale
            ? { date: sale.navDate, nav: sale.nav }
            : series && series.length > 0
            ? getLatestNAVBeforeDate(series, entry.date) || series[series.length - 1]
            : null;

          const navValue = navPoint?.nav ?? 0;
          const navDate = navPoint?.date ?? entry.date;
          const unitsLeft = entry.totalUnits[fund.id] ?? 0;
          const fundValue = round2(unitsLeft * navValue);
          const initialNav = navAtPurchase[fund.id] ?? 0;
          const initialInvestment = initialInvestmentByFund[fund.id] ?? 0;
          const investedValue = round2(unitsLeft * initialNav);
          const profitLoss = round2(fundValue - investedValue);
          const principalDepletedValue = round2(
            Math.max(0, initialInvestment - investedValue),
          );
          const principalDepletionPercent =
            initialInvestment > 0
              ? round2((principalDepletedValue / initialInvestment) * 100)
              : 0;

          tableRows.push({
            date: entry.date,
            fundId: fund.id,
            fundName: fund.name,
            navDate,
            nav: navValue,
            withdrawalAmount: sale?.amount ?? 0,
            unitsRedeemed: sale?.unitsSold ?? 0,
            unitsLeft,
            fundValue,
            portfolioValue: entry.portfolioValue,
            totalWithdrawal: entry.action?.amount ?? 0,
            investedValue,
            profitLoss,
            principalDepletedValue,
            principalDepletionPercent,
          });
        });
      });
    
    setResult({
        totalInvested: simulationTotalInvestment,
        totalWithdrawn: round2(simulation.totals.withdrawn),
        finalCorpus,
        finalPrincipalRemaining,
        finalProfitRemaining,
        xirr: xirr ?? null,
        maxDrawdown: simulation.totals.maxDrawdown,
        survivalMonths: simulation.totals.depletedOn
          ? withdrawalEntries.length
          : withdrawalSchedule.length,
        depletedOn: simulation.totals.depletedOn,
        timeline: simulation.timeline,
        chartData,
        fundSummaries,
        tableRows,
      });

      setShowTable(false);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while running the SWP simulation.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">
          {title || 'SWP Calculator'}
        </h2>

        {!forcedMode ? (
          <Tabs value={mode} onValueChange={handleModeChange} className="space-y-4">
            <TabsList className="grid grid-cols-1 md:grid-cols-3 bg-slate-100">
              <TabsTrigger value="NORMAL">Normal Simulation</TabsTrigger>
              <TabsTrigger value="CORPUS">I Have a Corpus</TabsTrigger>
              <TabsTrigger value="TARGET">I Have a Target Withdrawal</TabsTrigger>
            </TabsList>

            {/* NORMAL Mode */}
            <TabsContent value="NORMAL">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
                  <Label htmlFor="total-investment-normal">Total Investment (₹)</Label>
              <Input
                    id="total-investment-normal"
                    type="number"
                    min={1}
                    value={totalInvestment || ''}
                    onChange={(event) => {
                      const value = Number(event.target.value) || 0;
                      setTotalInvestment(value >= 0 ? value : 0);
                    }}
                    placeholder="500000"
                    className="mt-1"
              />
            </div>
                <div>
                  <Label htmlFor="withdrawal-amount-normal">Monthly Withdrawal (₹)</Label>
                  <Input
                    id="withdrawal-amount-normal"
                    type="number"
                    min={1}
                    value={withdrawalAmount}
                    onChange={(event) => {
                      const value = Number(event.target.value) || 0;
                      setWithdrawalAmount(value >= 0 ? value : 0);
                    }}
                    placeholder="15000"
                    className="mt-1"
                  />
                </div>
              </div>
            </TabsContent>

            {/* CORPUS Mode */}
            <TabsContent value="CORPUS">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
                  <Label htmlFor="total-investment-corpus">Total Investment (₹)</Label>
              <Input
                    id="total-investment-corpus"
                    type="number"
                    min={1}
                    value={totalInvestment || ''}
                    onChange={(event) => {
                      const value = Number(event.target.value) || 0;
                      setTotalInvestment(value >= 0 ? value : 0);
                    }}
                    placeholder="500000"
                    className="mt-1"
              />
            </div>
                <div>
                  <Label htmlFor="auto-withdrawal">
                    Safe Withdrawal ({frequencyDescriptor}) (₹)
                  </Label>
                  <Input
                    id="auto-withdrawal"
                    value={
                      displayedSafeWithdrawal !== null
                        ? formatNumber(displayedSafeWithdrawal, 2)
                        : ''
                    }
                    readOnly
                    disabled
                    placeholder="Run simulation to calculate"
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Withdrawal per {frequencyDescriptor} is computed from the safe withdrawal rate after
                    running the simulation.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* TARGET Mode */}
            <TabsContent value="TARGET">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
                  <Label htmlFor="desired-withdrawal-target">Desired {frequencyDescriptor} Withdrawal (₹)</Label>
              <Input
                    id="desired-withdrawal-target"
                type="number"
                    min={1}
                    value={desiredWithdrawal || ''}
                    onChange={(event) => {
                      const value = Number(event.target.value) || 0;
                      setDesiredWithdrawal(value >= 0 ? value : 0);
                    }}
                    placeholder="20000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="auto-corpus">Required Corpus (₹)</Label>
                  <Input
                    id="auto-corpus"
                    value={
                      displayedRequiredCorpus !== null
                        ? formatNumber(displayedRequiredCorpus, 0)
                        : ''
                    }
                    readOnly
                    disabled
                    placeholder="Run simulation to calculate"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="duration-years">
                    Horizon (years) <span className="text-xs text-slate-500">(optional)</span>
                  </Label>
                  <Input
                    id="duration-years"
                    type="number"
                    min={0}
                  max={100}
                    value={durationYears || ''}
                    onChange={(event) => {
                      const value = Number(event.target.value) || 0;
                      setDurationYears(value >= 0 && value <= 100 ? value : (value < 0 ? 0 : 100));
                    }}
                    placeholder="15"
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Provide a duration to estimate the corpus for a finite SWP. Leave blank for
                    indefinite withdrawals.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">

            {/* NORMAL Mode - Forced */}
            {forcedMode === 'NORMAL' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total-investment-normal">Total Investment (₹)</Label>
                  <Input
                    id="total-investment-normal"
                    type="number"
                    min={1}
                    value={totalInvestment || ''}
                    onChange={(event) => {
                      const value = Number(event.target.value) || 0;
                      setTotalInvestment(value >= 0 ? value : 0);
                    }}
                    placeholder="500000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="withdrawal-amount-normal">Monthly Withdrawal (₹)</Label>
                  <Input
                    id="withdrawal-amount-normal"
                    type="number"
                    min={1}
              value={withdrawalAmount}
                    onChange={(event) => {
                      const value = Number(event.target.value) || 0;
                      setWithdrawalAmount(value >= 0 ? value : 0);
                    }}
                    placeholder="15000"
                    className="mt-1"
              />
            </div>
              </div>
            )}

            {/* CORPUS Mode - Forced */}
            {forcedMode === 'CORPUS' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total-investment-corpus">Total Investment (₹)</Label>
                  <Input
                    id="total-investment-corpus"
                    type="number"
                    min={1}
                    value={totalInvestment || ''}
                    onChange={(event) => {
                      const value = Number(event.target.value) || 0;
                      setTotalInvestment(value >= 0 ? value : 0);
                    }}
                    placeholder="500000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="auto-withdrawal">
                    Safe Withdrawal ({frequencyDescriptor}) (₹)
                  </Label>
                  <Input
                    id="auto-withdrawal"
                    value={
                      displayedSafeWithdrawal !== null
                        ? formatNumber(displayedSafeWithdrawal, 2)
                        : ''
                    }
                    readOnly
                    disabled
                    placeholder="Run simulation to calculate"
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Withdrawal per {frequencyDescriptor} is computed from the safe withdrawal rate after
                    running the simulation.
                  </p>
                </div>
              </div>
            )}

            {/* TARGET Mode - Forced */}
            {forcedMode === 'TARGET' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="desired-withdrawal-target">Desired {frequencyDescriptor} Withdrawal (₹)</Label>
                    <Input
                      id="desired-withdrawal-target"
                      type="number"
                      min={1}
                      value={desiredWithdrawal || ''}
                      onChange={(event) => {
                      const value = Number(event.target.value) || 0;
                      setDesiredWithdrawal(value >= 0 ? value : 0);
                    }}
                      placeholder="20000"
                      className="mt-1"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Enter the amount you want to withdraw per {frequencyDescriptor.toLowerCase()}.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="auto-corpus">Required Corpus (₹)</Label>
                    <Input
                      id="auto-corpus"
                      value={
                        displayedRequiredCorpus !== null
                          ? formatNumber(displayedRequiredCorpus, 0)
                          : ''
                      }
                      readOnly
                      disabled
                      placeholder="Run simulation to calculate"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="duration-years">
                      Horizon (years) <span className="text-xs text-slate-500">(optional)</span>
                    </Label>
                    <Input
                      id="duration-years"
                      type="number"
                      min={0}
                      value={durationYears || ''}
                      onChange={(event) => {
                      const value = Number(event.target.value) || 0;
                      setDurationYears(value >= 0 && value <= 100 ? value : (value < 0 ? 0 : 100));
                    }}
                      placeholder="15"
                      className="mt-1"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Provide a duration to estimate the corpus for a finite SWP. Leave blank for
                      indefinite withdrawals.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div>
            <Label htmlFor="purchase-date">Investment Date</Label>
            <Input
              id="purchase-date"
              type="date"
              value={purchaseDate}
              onChange={(event) => {
                const newPurchaseDate = event.target.value;
                if (newPurchaseDate <= getToday()) {
                  setPurchaseDate(newPurchaseDate);
                  // Ensure SWP start date is not before purchase date
                  if (swpStartDate && newPurchaseDate > swpStartDate) {
                    setSwpStartDate(newPurchaseDate);
                  }
                  // Ensure end date is not before purchase date
                  if (endDate && newPurchaseDate > endDate) {
                    setEndDate(newPurchaseDate);
                  }
                }
              }}
              max={getToday()}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="swp-start-date">SWP Start Date</Label>
            <Input
              id="swp-start-date"
              type="date"
              value={swpStartDate}
              onChange={(event) => {
                const newSwpStartDate = event.target.value;
                if (newSwpStartDate <= getToday()) {
                  if ((!purchaseDate || newSwpStartDate >= purchaseDate)) {
                    setSwpStartDate(newSwpStartDate);
                    // Ensure end date is not before SWP start date
                    if (endDate && newSwpStartDate > endDate) {
                      setEndDate(newSwpStartDate);
                    }
                  }
                }
              }}
              min={purchaseDate || undefined}
              max={endDate || getToday()}
              className="mt-1"
            />
            {purchaseDate && swpStartDate && purchaseDate > swpStartDate && (
              <p className="text-xs text-red-600 mt-1">SWP start must be after purchase date</p>
            )}
          </div>
          <div>
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(event) => {
                const newEndDate = event.target.value;
                if (newEndDate <= getToday()) {
                  const minEndDate = swpStartDate || purchaseDate;
                  if (!minEndDate || newEndDate >= minEndDate) {
                    setEndDate(newEndDate);
                  }
                }
              }}
              min={(swpStartDate || purchaseDate) || undefined}
              max={getToday()}
              className="mt-1"
            />
            {((purchaseDate && endDate && purchaseDate > endDate) || (swpStartDate && endDate && swpStartDate > endDate)) && (
              <p className="text-xs text-red-600 mt-1">End date must be after purchase/SWP start date</p>
            )}
          </div>
          <div>
            <Label htmlFor="frequency">Withdrawal Frequency</Label>
            <Select value={frequency} onValueChange={(value: Frequency) => setFrequency(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="Quarterly">Quarterly</SelectItem>
                <SelectItem value="Custom">Custom (Days)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {frequency === 'Custom' && (
            <div>
              <Label htmlFor="custom-frequency">Custom Interval (Days)</Label>
              <Input
                id="custom-frequency"
                type="number"
                min={1}
                max={365}
                value={customFrequencyDays}
                onChange={(event) => {
                  const value = Number(event.target.value) || 1;
                  setCustomFrequencyDays(value >= 1 && value <= 365 ? value : (value < 1 ? 1 : 365));
                }}
                placeholder="30"
                className="mt-1"
              />
            </div>
          )}
        </div>

        {!hideAdvanced && (
          <div className="mt-6 border rounded-lg border-slate-200 bg-slate-50">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              onClick={() => setShowAdvanced((prev) => !prev)}
            >
              <span>Advanced Options</span>
              <span>{showAdvanced ? '−' : '+'}</span>
            </button>
            {showAdvanced && (
            <div className="px-4 pb-4 pt-2 space-y-4">
          <div>
                <Label htmlFor="risk-factor">Risk factor</Label>
                <Input
                  id="risk-factor"
                  type="number"
                  min={0.1}
                  max={10}
                step={0.1}
                  value={riskFactor}
                  onChange={(event) => {
                    const value = Number(event.target.value) || 3;
                    setRiskFactor(value >= 0.1 && value <= 10 ? value : (value < 0.1 ? 0.1 : 10));
                  }}
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Higher risk factor = more conservative withdrawal rate. Default is 3.
                </p>
              </div>
              <div>
                <Label htmlFor="strategy">Withdrawal Strategy</Label>
                <Select
                  value={strategy}
                  onValueChange={(value) => setStrategy(value as SWPStrategy)}
                >
                  <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                    <SelectItem value="PROPORTIONAL">
                      Proportional by target weights (default)
                    </SelectItem>
                    <SelectItem value="OVERWEIGHT_FIRST">
                      Overweight first (harvest gains)
                    </SelectItem>
                    <SelectItem value="RISK_BUCKET">
                      Risk bucket (sell lowest risk first)
                    </SelectItem>
              </SelectContent>
            </Select>
          </div>

              {strategy === 'RISK_BUCKET' && (
                <div className="space-y-3">
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Withdrawals will use the following bucket order:{' '}
                    <strong>
                      {DEFAULT_RISK_ORDER.map((bucket) => RISK_BUCKET_LABELS[bucket]).join(
                        ' → '
                      )}
                    </strong>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {funds.map((fund) => (
                      <div key={fund.id}>
                        <Label className="text-xs text-slate-600">
                          {fund.name} — Risk bucket
                        </Label>
                        <Select
                          value={fundRisk[fund.id]}
                          onValueChange={(value) =>
                            setFundRisk((prev) => ({ ...prev, [fund.id]: value }))
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                </SelectTrigger>
                <SelectContent>
                            {DEFAULT_RISK_ORDER.map((bucket) => (
                              <SelectItem key={bucket} value={bucket}>
                                {RISK_BUCKET_LABELS[bucket]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                      </div>
                    ))}
                  </div>
                    </div>
                  )}
                </div>
            )}
          </div>
        )}

              <Button
          onClick={calculateSWP}
          disabled={
            isLoading ||
            !purchaseDate ||
            !swpStartDate ||
            !endDate ||
            funds.length === 0 ||
            (mode === 'TARGET' ? desiredWithdrawal <= 0 : totalInvestment <= 0)
          }
          className="w-full mt-6"
        >
          {isLoading ? 'Simulating...' : 'Run SWP Simulation'}
              </Button>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="p-8 sm:p-10 md:p-12 text-center border-slate-200">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-blue-600 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Running SWP Simulation...</h3>
          <p className="text-sm sm:text-base text-gray-600">This may take a few moments while we calculate your withdrawal strategy</p>
        </Card>
      )}

      {insights && (
        <TooltipProvider>
          <Card className="p-4 sm:p-6 border border-slate-200 bg-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
              <div className="flex items-start gap-2">
              <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Safe withdrawal insights
                  </h3>
                  <p className="text-sm text-slate-500">
                    Based on historical weighted returns and your selected risk factor.
                  </p>
                </div>
                <UiTooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-slate-400 mt-1 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs leading-snug">
                    We compute each fund&apos;s CAGR and volatility, weight them by your allocation,
                    and divide the combined CAGR by the chosen risk factor to estimate a sustainable
                    withdrawal rate. If a fund lacks sufficient history you will see &quot;Not enough
                    history&quot;.
                  </TooltipContent>
                </UiTooltip>
              </div>
              <Badge variant="outline" className="text-slate-600 border-slate-200">
                Risk factor: {formatNumber(insights.riskFactor, 1)}
              </Badge>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs uppercase text-slate-500 font-semibold mb-1">
                  Portfolio CAGR
                      </div>
                <div className="text-xl font-semibold text-slate-900">
                  {insights.portfolioCAGR !== null
                    ? `${formatNumber(insights.portfolioCAGR, 2)}%`
                    : 'Not enough history'}
                  </div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500 font-semibold mb-1">
                  Annualized volatility
                  </div>
                <div className="text-xl font-semibold text-slate-900">
                  {insights.portfolioVolatility !== null
                    ? `${formatNumber(insights.portfolioVolatility, 2)}%`
                    : 'Not enough history'}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500 font-semibold mb-1">
                  Safe withdrawal rate (annual)
                </div>
                <div className="text-xl font-semibold text-slate-900">
                  {insights.swrAnnualPercent !== null
                    ? `${formatNumber(insights.swrAnnualPercent, 2)}%`
                    : 'Not enough history'}
                </div>
                <div className="text-xs text-slate-500">
                  Per {frequencyDescriptor}:{' '}
                  {insights.swrPeriodPercent !== null
                    ? `${formatNumber(insights.swrPeriodPercent, 3)}%`
                    : '—'}
                </div>
              </div>
              </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase text-slate-500 font-semibold mb-1">
                  Safe withdrawal ({frequencyDescriptor}) (from corpus)
                      </div>
                <div className="text-xl font-semibold text-slate-900">
                  {insights.safeMonthlyWithdrawal !== null
                    ? formatCurrency(insights.safeMonthlyWithdrawal)
                    : 'Not enough history'}
                  </div>
                <p className="text-xs text-slate-500 mt-1">
                  Based on total investment of {formatCurrency(totalInvestment)} and withdrawals
                  taken {frequencyDescriptor}.
                </p>
              </Card>

              <Card className="border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase text-slate-500 font-semibold mb-1">
                  Corpus required for target withdrawal
              </div>
                <div className="flex flex-col gap-1 text-slate-900 font-semibold text-sm">
                {mode === 'TARGET' ? (
                  <>
                    <span>
                      Indefinite:{' '}
                      {displayedRequiredCorpus !== null
                        ? formatCurrency(displayedRequiredCorpus)
                        : 'Run the simulation to calculate'}
                    </span>
                    <span>
                      {durationYears > 0 ? (
                        <>
                          {durationYears} years:{' '}
                          {displayedHorizonCorpus !== null
                            ? formatCurrency(displayedHorizonCorpus)
                            : 'Run the simulation to calculate'}
                        </>
                      ) : (
                        'Provide a horizon to estimate finite-duration corpus.'
                      )}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-slate-500 font-normal">
                    Switch to &quot;I Have a Target Withdrawal&quot; to estimate the corpus needed for a desired income.
                  </span>
          )}
        </div>
                <p className="text-xs text-slate-500 mt-1">
                  Uses adjusted return of{' '}
                  {insights.adjustedReturnPercent !== null
                    ? `${formatNumber(insights.adjustedReturnPercent, 2)}%`
                    : 'Not enough history'}{' '}
                  (CAGR minus volatility).
                </p>
      </Card>
            </div>
          </Card>
        </TooltipProvider>
      )}


      {error && (
        <Card className="p-4 bg-red-50 border border-red-200 text-red-800">
          {error}
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-slate-200">
              <div className="text-xs uppercase text-slate-500 font-semibold mb-2">
                Total Invested
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(result.totalInvested)}
              </div>
            </Card>
            <Card className="p-4 border-slate-200">
              <div className="text-xs uppercase text-slate-500 font-semibold mb-2">
                Total Withdrawn
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(result.totalWithdrawn)}
              </div>
            </Card>
            <Card className="p-4 border-slate-200">
              <div className="text-xs uppercase text-slate-500 font-semibold mb-2">
                Final Corpus Value
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-2">
                {formatCurrency(result.finalCorpus)}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Principal Remaining:</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(result.finalPrincipalRemaining)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Profit Remaining:</span>
                  <span
                    className={`font-semibold ${
                      result.finalProfitRemaining >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(result.finalProfitRemaining)}
                  </span>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase text-slate-500 font-semibold mb-2">
                  XIRR (Money-weighted return)
              </div>
                <div
                  className={`text-2xl font-bold ${
                    (result.xirr ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  } flex items-center gap-2`}
                >
                  {(result.xirr ?? 0) >= 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  {result.xirr !== null ? `${formatNumber(result.xirr, 2)}%` : '—'}
                </div>
                  </div>
            </Card>
            <Card className="p-4 border-slate-200">
              <div className="text-xs uppercase text-slate-500 font-semibold mb-2">
                Survival Duration
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {result.survivalMonths} months
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {result.depletedOn
                  ? `Depleted on ${result.depletedOn}`
                  : 'Portfolio still active at end date'}
                </div>
            </Card>
            <Card className="p-4 border-slate-200">
              <div className="text-xs uppercase text-slate-500 font-semibold mb-2">
                Max Drawdown
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {formatNumber(result.maxDrawdown * 100, 2)}%
              </div>
            </Card>
            <SimpleRollingReturnCard funds={funds} />
          </div>

          <Card className="p-4 sm:p-6 border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Portfolio value vs withdrawals
                </h3>
                <p className="text-sm text-slate-500">
                  Tracks invested capital, cash withdrawn, and remaining corpus value across
                  the simulation.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Select value={selectedFundView} onValueChange={setSelectedFundView}>
                  <SelectTrigger className="w-[200px] bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bucket">
                      <span className="font-medium">Bucket (All Funds)</span>
                    </SelectItem>
                    {result.fundSummaries.map((fund) => (
                      <SelectItem key={fund.fundId} value={fund.fundId}>
                        {fund.fundName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="bg-slate-50 text-slate-700">
                {result.chartData.length} data points
              </Badge>
            </div>
            </div>
            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                    tickFormatter={(value: string) =>
                      new Date(value).toLocaleDateString('en-IN', {
                        month: 'short',
                        year: 'numeric',
                      })
                    }
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                      name,
                    ]}
                    labelFormatter={(label) =>
                      new Date(label).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    }
                  />
                  <RechartsLegend iconType="circle" />
                <Line
                  type="monotone"
                  dataKey="invested"
                    name="Invested capital"
                  stroke="#94a3b8"
                    strokeDasharray="6 4"
                  strokeWidth={2}
                  dot={false}
                />
                {selectedFundView === 'bucket' ? (
                  <>
                <Line
                  type="monotone"
                      dataKey="portfolioValue"
                      name="Portfolio value"
                  stroke="#1f2937"
                  strokeWidth={3}
                  dot={false}
                />
                    <Line
                      type="monotone"
                      dataKey="withdrawn"
                      name="Cumulative withdrawals"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                    />
                  </>
                ) : (
                  <>
                    {result.fundSummaries
                      .filter((fund) => fund.fundId === selectedFundView)
                      .map((fund) => {
                        const fundIndex = funds.findIndex((f) => f.id === fund.fundId);
                        const colors = ['#0ea5e9', '#22c55e', '#f97316', '#a855f7', '#ef4444'];
                  return (
                    <Line
                      key={fund.fundId}
                      type="monotone"
                      dataKey={fund.fundName}
                            name={`${fund.fundName} value`}
                            stroke={colors[fundIndex % colors.length]}
                            strokeWidth={3}
                      dot={false}
                    />
                  );
                })}
                    <Line
                      type="monotone"
                      dataKey="withdrawn"
                      name="Cumulative withdrawals"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                    />
                  </>
                )}
              </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Fund breakdown
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Purchase NAV</TableHead>
                  <TableHead>Units bought</TableHead>
                  <TableHead>Units remaining</TableHead>
                  <TableHead>Total withdrawn</TableHead>
                  <TableHead>Current value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.fundSummaries.map((fund) => (
                    <TableRow key={fund.fundId}>
                    <TableCell className="font-medium">{fund.fundName}</TableCell>
                    <TableCell>{fund.weightage}%</TableCell>
                    <TableCell>₹{formatNumber(fund.navAtPurchase, 2)}</TableCell>
                    <TableCell>{formatNumber(fund.unitsPurchased, 4)}</TableCell>
                    <TableCell>{formatNumber(fund.remainingUnits, 4)}</TableCell>
                      <TableCell>{formatCurrency(fund.totalWithdrawn)}</TableCell>
                      <TableCell>{formatCurrency(fund.currentValue)}</TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Withdrawal ledger</h3>
            <Button
              variant="outline"
              onClick={() => setShowTable((prev) => !prev)}
              className="text-sm"
            >
              {showTable ? 'Hide table' : 'Show table'}
            </Button>
            </div>

          {showTable && (
            <Card className="p-4 sm:p-6 border-slate-200 overflow-x-auto">
              {result.tableRows.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No withdrawals occurred during the selected period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Fund</TableHead>
                      <TableHead>NAV date</TableHead>
                      <TableHead>NAV (₹)</TableHead>
                      <TableHead>Withdrawal (₹)</TableHead>
                      <TableHead>Units redeemed</TableHead>
                      <TableHead>Units left</TableHead>
                      <TableHead>Fund value (₹)</TableHead>
                      <TableHead>Invested value (₹)</TableHead>
                      <TableHead>Profit / Loss (₹)</TableHead>
                      <TableHead>Principal withdrawn (₹)</TableHead>
                      <TableHead>Principal withdrawn (%)</TableHead>
                      <TableHead>Portfolio value (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Pre-calculate date groups once for all rows
                      const dateGroups: Record<string, number> = {};
                      let groupIndex = 0;
                      result.tableRows.forEach((r) => {
                        if (!dateGroups[r.date]) {
                          dateGroups[r.date] = groupIndex;
                          groupIndex++;
                        }
                      });
                      
                      const bgColors = [
                        'bg-white',
                        'bg-blue-50',
                        'bg-green-50',
                        'bg-purple-50',
                        'bg-yellow-50',
                      ];
                      const hoverColors = [
                        'hover:bg-gray-50',
                        'hover:bg-blue-100',
                        'hover:bg-green-100',
                        'hover:bg-purple-100',
                        'hover:bg-yellow-100',
                      ];
                      
                      return result.tableRows.map((row, index) => {
                        const groupColorIndex = dateGroups[row.date] ?? 0;
                        const bgColor = bgColors[groupColorIndex % bgColors.length];
                        const hoverColor = hoverColors[groupColorIndex % hoverColors.length];
                        
                        return (
                          <TableRow 
                            key={`${row.date}-${row.fundId}-${index}`}
                            className={`${bgColor} ${hoverColor}`}
                          >
                            <TableCell>{row.date}</TableCell>
                            <TableCell>{row.fundName}</TableCell>
                            <TableCell>{row.navDate}</TableCell>
                            <TableCell>{formatNumber(row.nav, 2)}</TableCell>
                            <TableCell>{formatCurrency(row.withdrawalAmount)}</TableCell>
                            <TableCell>{formatNumber(row.unitsRedeemed, 4)}</TableCell>
                            <TableCell>{formatNumber(row.unitsLeft, 4)}</TableCell>
                            <TableCell>{formatCurrency(row.fundValue)}</TableCell>
                            <TableCell>{formatCurrency(row.investedValue)}</TableCell>
                            <TableCell>{formatCurrency(row.profitLoss)}</TableCell>
                            <TableCell>{formatCurrency(row.principalDepletedValue)}</TableCell>
                            <TableCell>{formatNumber(row.principalDepletionPercent, 2)}%</TableCell>
                            <TableCell>{formatCurrency(row.portfolioValue)}</TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              )}
    </Card>
          )}
        </div>
      )}
    </div>
  );
}


