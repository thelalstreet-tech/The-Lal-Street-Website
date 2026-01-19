// server/services/bucketLiveReturns.service.js
const BucketLiveReturns = require('../models/BucketLiveReturns');
const SuggestedBucket = require('../models/SuggestedBucket');
const { getHistoricalNav } = require('./navApi.service');
const logger = require('../utils/logger');
const { calculateXIRR } = require('../logic/financialCalculations');

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
        const navData = await getHistoricalNav(schemeCode);
        if (navData && navData.length > 0) {
          // Filter by date range
          navDataMap[schemeCode] = navData.filter(nav => {
            const navDate = new Date(nav.date);
            return navDate >= new Date(fetchStartDate) && navDate <= new Date(today);
          });
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

      const threeYearsAgoDate = new Date(threeYearsAgoStr);
      const firstDayOfMonth = new Date(threeYearsAgoDate.getFullYear(), threeYearsAgoDate.getMonth(), 1);
      
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
        positivePercentageFromLaunch,
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
      fundLiveReturns: fundMetrics
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
    const today = new Date().toISOString().split('T')[0];

    const saved = await BucketLiveReturns.findOneAndUpdate(
      { bucketId },
      {
        ...liveReturns,
        calculationDate: today,
        calculatedAt: new Date()
      },
      { upsert: true, new: true }
    ).lean();

    // Update bucket's lastCalculationDate
    await SuggestedBucket.findByIdAndUpdate(bucketId, {
      lastCalculationDate: new Date()
    });

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

