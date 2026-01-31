// server/services/bucketLiveReturns.service.js
const BucketLiveReturns = require('../models/BucketLiveReturns');
const SuggestedBucket = require('../models/SuggestedBucket');
const { getHistoricalNav } = require('./navApi.service');
const logger = require('../utils/logger');
const { calculateXIRR, calculateRollingReturns } = require('../logic/financialCalculations');

/**
 * Calculate live returns for a bucket
 * This is the server-side version of the client calculation
 */
async function calculateBucketLiveReturns(bucket) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const threeYearsAgoStr = threeYearsAgo.toISOString().split('T')[0];

    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const fiveYearsAgoStr = fiveYearsAgo.toISOString().split('T')[0];

    // Fetch NAV data for all funds
    const schemeCodes = bucket.funds.map(f => f.id);
    const earliestLaunchDate = bucket.funds.reduce((earliest, fund) => {
      const launchDate = new Date(fund.launchDate);
      return launchDate < earliest ? launchDate : earliest;
    }, new Date(fiveYearsAgoStr));
    const fetchStartDate = earliestLaunchDate < new Date(fiveYearsAgoStr)
      ? earliestLaunchDate.toISOString().split('T')[0]
      : fiveYearsAgoStr;

    // Fetch NAV data
    const navDataMap = {};
    for (const schemeCode of schemeCodes) {
      try {
        const navResponse = await getHistoricalNav(schemeCode);
        const navData = navResponse?.data || [];
        if (navData.length > 0) {
          // Filter by date range
          navDataMap[schemeCode] = navData.filter(nav => {
            const navDate = new Date(nav.date);
            return navDate >= new Date(fetchStartDate) && navDate <= new Date(today);
          });
        } else {
          navDataMap[schemeCode] = [];
        }
      } catch (error) {
        logger.warn(`Failed to fetch NAV for scheme ${schemeCode}:`, error.message);
        navDataMap[schemeCode] = [];
      }
    }

    // Calculate fund-level metrics
    const fundMetrics = [];
    let totalLumpsumInvestment = 0;
    let totalLumpsumValue = 0;
    let totalSIPInvested = 0;
    let totalSIPValue = 0;
    const sipCashFlows = [];

    const lumpsumAmount = 100000;
    const sipMonthlyAmount = 1000;

    for (const fund of bucket.funds) {
      const navData = navDataMap[fund.id] || [];
      if (navData.length === 0) {
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

      // Sort NAV data by date
      navData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Get current NAV
      const currentNavEntry = navData[navData.length - 1];
      const currentNAV = currentNavEntry?.nav || null;

      // Calculate 3-year CAGR
      const nav3YDate = new Date(threeYearsAgoStr);
      const nav3YEntry = navData.find(nav => new Date(nav.date) >= nav3YDate) || navData[0];
      const cagr3Y = nav3YEntry && currentNavEntry && nav3YEntry.nav > 0
        ? calculateCAGR(nav3YEntry.nav, currentNavEntry.nav,
          (new Date(currentNavEntry.date) - new Date(nav3YEntry.date)) / (1000 * 60 * 60 * 24))
        : null;

      // Calculate 5-year CAGR
      const nav5YDate = new Date(fiveYearsAgoStr);
      const nav5YEntry = navData.find(nav => new Date(nav.date) >= nav5YDate) || navData[0];
      const cagr5Y = nav5YEntry && currentNavEntry && nav5YEntry.nav > 0
        ? calculateCAGR(nav5YEntry.nav, currentNavEntry.nav,
          (new Date(currentNavEntry.date) - new Date(nav5YEntry.date)) / (1000 * 60 * 60 * 24))
        : null;

      // Calculate positive periods from launch (simplified - can be enhanced)
      let positivePercentageFromLaunch = null;
      // This would require more complex calculation, simplified for now

      // Calculate Lumpsum returns
      const fundLumpsumInvestment = (lumpsumAmount * fund.weightage) / 100;
      let lumpsumCurrentValue = null;
      let lumpsumReturns = null;
      let lumpsumReturnsPercent = null;

      if (nav3YEntry && currentNavEntry && nav3YEntry.nav > 0) {
        const unitsPurchased = fundLumpsumInvestment / nav3YEntry.nav;
        lumpsumCurrentValue = unitsPurchased * currentNavEntry.nav;
        lumpsumReturns = lumpsumCurrentValue - fundLumpsumInvestment;
        lumpsumReturnsPercent = (lumpsumReturns / fundLumpsumInvestment) * 100;
        totalLumpsumInvestment += fundLumpsumInvestment;
        totalLumpsumValue += lumpsumCurrentValue;
      }

      // Calculate SIP returns
      const fundSIPMonthly = (sipMonthlyAmount * fund.weightage) / 100;
      let sipTotalInvested = 0;
      let totalSIPUnits = 0;
      const fundSipCashFlows = [];

      const threeYearsAgoDateObj = new Date(threeYearsAgoStr);
      const firstDayOfMonth = new Date(threeYearsAgoDateObj.getFullYear(), threeYearsAgoDateObj.getMonth(), 1);

      for (let month = 0; month < 36; month++) {
        const sipDate = new Date(firstDayOfMonth);
        sipDate.setMonth(sipDate.getMonth() + month);
        const sipDateStr = sipDate.toISOString().split('T')[0];

        const navEntry = navData.find(nav => new Date(nav.date) >= new Date(sipDateStr)) || navData[navData.length - 1];

        if (navEntry && navEntry.nav > 0) {
          const unitsPurchased = fundSIPMonthly / navEntry.nav;
          totalSIPUnits += unitsPurchased;
          sipTotalInvested += fundSIPMonthly;
          fundSipCashFlows.push({
            date: new Date(navEntry.date),
            amount: -fundSIPMonthly
          });
        }
      }

      let sipCurrentValue = null;
      let sipXIRR = null;

      if (currentNavEntry && totalSIPUnits > 0) {
        sipCurrentValue = totalSIPUnits * currentNavEntry.nav;
        const sipCashFlowsForXIRR = [
          ...fundSipCashFlows,
          { date: new Date(currentNavEntry.date), amount: sipCurrentValue }
        ];
        sipXIRR = calculateXIRR(sipCashFlowsForXIRR);
        totalSIPInvested += sipTotalInvested;
        totalSIPValue += sipCurrentValue;
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
        positivePercentageFromLaunch: positivePercentageFromLaunch,
      });
    }

    // Calculate bucket-level metrics
    const weights = {};
    bucket.funds.forEach(fund => {
      weights[fund.id] = fund.weightage / 100;
    });

    const fundCagr3Y = {};
    const fundCagr5Y = {};
    fundMetrics.forEach(fm => {
      fundCagr3Y[fm.fundId] = fm.cagr3Y;
      fundCagr5Y[fm.fundId] = fm.cagr5Y;
    });

    const bucketCagr3Y = calculateWeightedAverage(fundCagr3Y, weights);
    const bucketCagr5Y = calculateWeightedAverage(fundCagr5Y, weights);

    if (totalSIPValue > 0) {
      sipCashFlows.push({
        date: new Date(today),
        amount: totalSIPValue
      });
    }

    const bucketSipXIRR = sipCashFlows.length >= 2 ? calculateXIRR(sipCashFlows) : null;
    const sipProfitPercentage = totalSIPInvested > 0 && totalSIPValue > 0
      ? ((totalSIPValue - totalSIPInvested) / totalSIPInvested) * 100
      : null;

    return {
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
      fundLiveReturns: fundMetrics,
      _navDataMap: navDataMap // Internal: Return raw NAV data for rolling return calculation
    };
  } catch (error) {
    logger.error('Error calculating bucket live returns:', error);
    throw error;
  }
}

/**
 * Helper function to calculate CAGR
 */
function calculateCAGR(startValue, endValue, days) {
  if (!startValue || !endValue || startValue <= 0 || days <= 0) return null;
  const years = days / 365.25;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

/**
 * Helper function to calculate weighted average
 */
function calculateWeightedAverage(values, weights) {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && !isNaN(value)) {
      const weight = weights[key] || 0;
      weightedSum += value * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

/**
 * Calculate bucket rolling stats and return performance object structure
 */
function calculateBucketRollingStats(bucket, navDataMap) {
  try {
    const windowDays = 1095; // 3 Years
    const fundPerformance = [];

    // 1. Calculate rolling returns for each fund
    for (const fund of bucket.funds) {
      const navData = navDataMap[fund.id] || [];
      if (navData.length === 0) continue;

      // Sort ensure sorted
      navData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const rollingStats = calculateRollingReturns(navData, windowDays);

      if (rollingStats && rollingStats.statistics) {
        fundPerformance.push({
          fundId: fund.id,
          fundName: fund.name,
          ...rollingStats.statistics,
          positivePercentage: rollingStats.statistics.positivePeriods,
          stdDev: rollingStats.statistics.std
        });
      }
    }

    // 2. Calculate rolling returns for the bucket (Weighted Portfolio)
    // We need to construct a virtual bucket NAV series or daily returns series
    // Method: Bucket Total Return = Sum (Weight_i * Fund Total Return_i)
    // Actually, accurate method for rolling "CAGR" of a rebalanced portfolio:
    // For each start date T:
    // Bucket_Return_Factor(T, T+3Y) = Sum ( Weight_i * (NAV_i(T+3Y) / NAV_i(T)) )
    // Bucket_CAGR(T) = (Bucket_Return_Factor ^ (1/3)) - 1

    const rollingReturnsSeries = [];
    const dates = [];

    // Find common date range
    // Start iterating from earliest possible date where all funds have data?
    // Or just iterate based on one fund and use available data?
    // Assuming we want dates where ALL funds are available for accurate portfolio stats.

    let commonDates = null;
    for (const fundId in navDataMap) {
      const fundDates = navDataMap[fundId].map(d => d.date);
      if (commonDates === null) {
        commonDates = new Set(fundDates);
      } else {
        // Intersection
        const currentFundDates = new Set(fundDates);
        commonDates = new Set([...commonDates].filter(d => currentFundDates.has(d)));
      }
    }

    if (!commonDates || commonDates.size === 0) {
      return null;
    }

    const sortedDates = Array.from(commonDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // We can only calculate rolling return if we have T and T+3Y
    // 3 Years ~ 1095 days
    // Iterating is tricky because dates might have gaps (weekends).
    // Better to iterate through sortedDates and find date closest to T + 3Y.

    for (let i = 0; i < sortedDates.length; i++) {
      const startDate = new Date(sortedDates[i]);
      const targetEndDate = new Date(startDate);
      targetEndDate.setDate(targetEndDate.getDate() + windowDays); // Target date

      // Look for a date in sortedDates that is close to targetEndDate
      // Since sortedDates is sorted, we can search forward
      // We allow a small margin (e.g., +/- 7 days) match

      const targetTime = targetEndDate.getTime();
      let bestMatchDate = null;
      let minDiff = 7 * 24 * 60 * 60 * 1000; // 7 days max diff

      // Optimization: start search from i + windowDays (approx) if continuous?
      // Just search from i explicitly
      // Better: binary search or just find. Since dates are about 250 per year...

      // Filter for dates >= targetEndDate - margin
      const startSearchIdx = i + 1; // Can assume at least i

      for (let j = startSearchIdx; j < sortedDates.length; j++) {
        const d = new Date(sortedDates[j]).getTime();
        const diff = Math.abs(d - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          bestMatchDate = sortedDates[j];
        }
        if (d > targetTime + minDiff) break; // Passed the window
      }

      if (bestMatchDate) {
        // Calculate Bucket Return Factor
        let bucketReturnFactor = 0;
        let totalWeight = 0;

        for (const fund of bucket.funds) {
          const navData = navDataMap[fund.id];
          const startNav = navData.find(n => n.date === sortedDates[i]);
          const endNav = navData.find(n => n.date === bestMatchDate);

          if (startNav && endNav && startNav.nav > 0) {
            const weight = fund.weightage / 100;
            bucketReturnFactor += weight * (endNav.nav / startNav.nav);
            totalWeight += weight;
          }
        }

        if (totalWeight > 0.99) { // Ensure we have ~100% coverage
          const years = windowDays / 365.25; // Approx 3 years
          // CAGR = (Factor ^ (1/n)) - 1
          const cagr = (Math.pow(bucketReturnFactor, 1 / years) - 1) * 100;
          rollingReturnsSeries.push(cagr);
          dates.push(bestMatchDate);
        }
      }
    }

    if (rollingReturnsSeries.length === 0) return null;

    // Calculate stats
    const mean = rollingReturnsSeries.reduce((a, b) => a + b, 0) / rollingReturnsSeries.length;
    const sorted = [...rollingReturnsSeries].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const variance = rollingReturnsSeries.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / rollingReturnsSeries.length;
    const stdDev = Math.sqrt(variance);
    const positivePeriods = (rollingReturnsSeries.filter(r => r > 0).length / rollingReturnsSeries.length) * 100;

    return {
      rollingReturns: {
        bucket: {
          mean,
          median,
          max,
          min,
          stdDev,
          positivePercentage: positivePeriods
        },
        funds: fundPerformance
      },
      analysisStartDate: sortedDates[0],
      analysisEndDate: dates[dates.length - 1], // The last date we calculated a return FOR
      totalPeriods: rollingReturnsSeries.length,
      riskLevel: bucket.riskLevel // Persist existing risk level
    };

  } catch (error) {
    logger.error('Error calculating bucket rolling stats:', error);
    return null;
  }
}

/**
 * Get or calculate live returns for a bucket
 */
async function getBucketLiveReturns(bucketId) {
  try {
    // Check if we have cached data from today
    const today = new Date().toISOString().split('T')[0];
    const cached = await BucketLiveReturns.findOne({
      bucketId,
      calculationDate: today
    }).lean();

    if (cached) {
      return {
        ...cached,
        id: cached._id.toString(),
        _id: undefined
      };
    }

    // No cache, need to calculate
    const bucket = await SuggestedBucket.findById(bucketId).lean();
    if (!bucket) {
      throw new Error('Bucket not found');
    }

    const liveReturns = await calculateBucketLiveReturns(bucket);

    // Clean internal data
    delete liveReturns._navDataMap;

    // Save to database
    const saved = await BucketLiveReturns.findOneAndUpdate(
      { bucketId },
      {
        ...liveReturns,
        calculationDate: today,
        calculatedAt: new Date()
      },
      { upsert: true, new: true }
    ).lean();

    return {
      ...saved,
      id: saved._id.toString(),
      _id: undefined
    };
  } catch (error) {
    logger.error('Error getting bucket live returns:', error);
    throw error;
  }
}

/**
 * Recalculate live returns for a specific bucket
 */
async function recalculateBucketLiveReturns(bucketId) {
  try {
    const bucket = await SuggestedBucket.findById(bucketId).lean();
    if (!bucket) {
      throw new Error('Bucket not found');
    }

    const liveReturns = await calculateBucketLiveReturns(bucket);
    const navDataMap = liveReturns._navDataMap;
    delete liveReturns._navDataMap;

    const today = new Date().toISOString().split('T')[0];

    // Save live returns
    const saved = await BucketLiveReturns.findOneAndUpdate(
      { bucketId },
      {
        ...liveReturns,
        calculationDate: today,
        calculatedAt: new Date()
      },
      { upsert: true, new: true }
    ).lean();

    // Calculate and update Detailed Rolling Returns Stats in SuggestedBucket
    const rollingStats = calculateBucketRollingStats(bucket, navDataMap);

    const updateData = {
      lastCalculationDate: new Date()
    };

    if (rollingStats) {
      updateData.performance = rollingStats;
      logger.info(`Updated rolling returns stats for bucket: ${bucket.name}`);
    }

    // Update suggested bucket
    await SuggestedBucket.findByIdAndUpdate(bucketId, updateData);

    return {
      ...saved,
      id: saved._id.toString(),
      _id: undefined
    };
  } catch (error) {
    logger.error('Error recalculating bucket live returns:', error);
    throw error;
  }
}

/**
 * Recalculate all active buckets
 */
async function recalculateAllBuckets() {
  try {
    const buckets = await SuggestedBucket.find({ isActive: true }).lean();
    const results = {
      total: buckets.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const bucket of buckets) {
      try {
        await recalculateBucketLiveReturns(bucket._id.toString());
        results.successful++;
        logger.info(`Recalculated live returns for bucket: ${bucket.name}`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          bucketId: bucket._id.toString(),
          bucketName: bucket.name,
          error: error.message
        });
        logger.error(`Failed to recalculate bucket ${bucket.name}:`, error.message);
      }

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  } catch (error) {
    logger.error('Error recalculating all buckets:', error);
    throw error;
  }
}

module.exports = {
  getBucketLiveReturns,
  recalculateBucketLiveReturns,
  recalculateAllBuckets,
  calculateBucketLiveReturns
};

