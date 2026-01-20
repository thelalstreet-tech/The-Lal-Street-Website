// server/logic/financialCalculations.js
const xirr = require('xirr');

/**
 * Calculates Compound Annual Growth Rate (CAGR).
 * @param {number} beginningValue - The starting value of the investment.
 * @param {number} endingValue - The final value of the investment.
 * @param {number} years - The number of years the investment was held.
 * @returns {number} The CAGR percentage.
 */
const calculateCAGR = (beginningValue, endingValue, years) => {
  if (beginningValue <= 0 || endingValue <= 0 || years <= 0) {
    return 0;
  }
  return (Math.pow(endingValue / beginningValue, 1 / years) - 1) * 100;
};

/**
 * Enhanced XIRR calculation with better error handling and validation
 * @param {Array<object>} cashflows - Array of { amount: number, date: Date } objects.
 * @returns {number|null} The XIRR percentage, or null if it fails.
 */
const calculateXIRREnhanced = (cashflows) => {
  try {
    // Validate input
    if (!cashflows || cashflows.length < 2) {
      console.log('[XIRR] Not enough cashflows for calculation');
      return null;
    }

    // Ensure we have both positive and negative cashflows
    const hasPositive = cashflows.some(cf => cf.amount > 0);
    const hasNegative = cashflows.some(cf => cf.amount < 0);
    
    if (!hasPositive || !hasNegative) {
      console.log('[XIRR] Need both positive and negative cashflows');
      return null;
    }

    // Sort cashflows by date
    const sortedCashflows = [...cashflows].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // The library expects amounts and dates in separate arrays.
    const transactions = sortedCashflows.map(cf => ({
      amount: cf.amount,
      when: new Date(cf.date), // Ensure it's a proper Date object
    }));
    
    console.log('[XIRR] Calculating with transactions:', transactions.length);
    
    // The xirr library may return either a number (rate) or an object { rate }
    const result = xirr(transactions);

    const rate = (() => {
      if (result === null || result === undefined) return null;
      if (typeof result === 'number' && !isNaN(result)) return result;
      if (typeof result.rate === 'number' && !isNaN(result.rate)) return result.rate;
      return null;
    })();

    if (rate !== null) {
      return rate * 100;
    }

    console.log('[XIRR] Invalid result from xirr library:', result);
    return null;
  } catch (error) {
    console.error('[XIRR Error]', error.message);
    return null; // Return null if calculation fails
  }
};

/**
 * Calculate rolling returns for a given window
 * @param {Array} navData - Array of {date, nav} objects
 * @param {number} windowDays - Rolling window in days
 * @returns {Object} Rolling returns data and statistics
 */
const calculateRollingReturns = (navData, windowDays) => {
  if (navData.length < windowDays) {
    return null;
  }

  const rollingReturns = [];
  const dates = [];

  for (let i = 0; i < navData.length - windowDays; i++) {
    const startNav = parseFloat(navData[i].nav);
    const endNav = parseFloat(navData[i + windowDays].nav);
    const years = windowDays / 365.25;
    const rr = ((endNav / startNav) ** (1 / years) - 1) * 100;
    rollingReturns.push(rr);
    dates.push(navData[i + windowDays].date);
  }

  const stats = {
    mean: rollingReturns.reduce((a, b) => a + b, 0) / rollingReturns.length,
    median: rollingReturns.sort((a, b) => a - b)[Math.floor(rollingReturns.length / 2)],
    std: Math.sqrt(rollingReturns.reduce((sq, n) => sq + Math.pow(n - stats.mean, 2), 0) / rollingReturns.length),
    min: Math.min(...rollingReturns),
    max: Math.max(...rollingReturns),
    positivePeriods: (rollingReturns.filter(r => r > 0).length / rollingReturns.length) * 100
  };

  return {
    data: rollingReturns.map((rr, i) => ({ date: dates[i], rollingReturn: rr })),
    statistics: stats
  };
};

/**
 * Calculate portfolio volatility
 * @param {Array} returns - Array of periodic returns
 * @returns {number} Volatility percentage
 */
const calculateVolatility = (returns) => {
  if (returns.length < 2) return 0;
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(12); // Annualized monthly volatility
};

/**
 * Calculate Sharpe ratio
 * @param {number} returns - Portfolio returns
 * @param {number} riskFreeRate - Risk-free rate (default 6%)
 * @param {number} volatility - Portfolio volatility
 * @returns {number} Sharpe ratio
 */
const calculateSharpeRatio = (returns, riskFreeRate = 6, volatility) => {
  if (volatility === 0) return 0;
  return (returns - riskFreeRate) / volatility;
};

/**
 * Calculate maximum drawdown
 * @param {Array} values - Array of portfolio values over time
 * @returns {Object} Max drawdown data
 */
const calculateMaxDrawdown = (values) => {
  let maxDrawdown = 0;
  let peak = values[0];
  let peakDate = null;
  let troughDate = null;

  for (let i = 0; i < values.length; i++) {
    if (values[i] > peak) {
      peak = values[i];
      peakDate = i;
    }
    const drawdown = (peak - values[i]) / peak * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      troughDate = i;
    }
  }

  return {
    maxDrawdown,
    peakDate,
    troughDate
  };
};

/**
 * Calculates XIRR for a series of cashflows.
 * @param {Array<object>} cashflows - Array of { amount: number, date: Date } objects.
 * @returns {number|null} The XIRR percentage, or null if it fails.
 */
const calculateXIRR = (cashflows) => {
  try {
    // Validate input
    if (!cashflows || cashflows.length < 2) {
      console.log('[XIRR] Not enough cashflows for calculation');
      return null;
    }

    // Ensure we have both positive and negative cashflows
    const hasPositive = cashflows.some(cf => cf.amount > 0);
    const hasNegative = cashflows.some(cf => cf.amount < 0);
    
    if (!hasPositive || !hasNegative) {
      console.log('[XIRR] Need both positive and negative cashflows');
      return null;
    }

    // Sort cashflows by date
    const sortedCashflows = [...cashflows].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // The library expects amounts and dates in separate arrays.
    const transactions = sortedCashflows.map(cf => ({
      amount: cf.amount,
      when: new Date(cf.date), // Ensure it's a proper Date object
    }));
    
    console.log('[XIRR] Calculating with transactions:', transactions.length);
    
    // The result from the library is a rate (e.g., 0.12), so we multiply by 100.
    const result = xirr(transactions);
    
    if (result && typeof result.rate === 'number' && !isNaN(result.rate)) {
      return result.rate * 100;
    } else {
      console.log('[XIRR] Invalid result from xirr library:', result);
      return null;
    }
  } catch (error) {
    console.error('[XIRR Error]', error.message);
    return null; // Return null if calculation fails
  }
};

module.exports = {
  calculateCAGR,
  calculateXIRR: calculateXIRREnhanced, // Use enhanced version
  calculateXIRREnhanced,
  calculateRollingReturns,
  calculateVolatility,
  calculateSharpeRatio,
  calculateMaxDrawdown,
};