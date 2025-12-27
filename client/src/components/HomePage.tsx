import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Calculator, Shield, Zap, Target, PieChart, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { SuggestedBuckets } from './SuggestedBuckets';
import { Skeleton } from './ui/skeleton';
import { Card } from './ui/card';
import { loadSuggestedBuckets } from '../data/suggestedBuckets';
import { warmUpServer } from '../utils/serverHealthCheck';
import { logger } from '../utils/logger';
import type { SuggestedBucket } from '../types/suggestedBucket';
import type { SelectedFund } from '../App';

interface HomePageProps {
  onNavigate?: (page: string) => void;
  onImportBucket?: (bucket: SuggestedBucket, targetPage: 'investment' | 'retirement') => void;
}

export function HomePage({ onNavigate, onImportBucket }: HomePageProps) {
  const [suggestedBuckets, setSuggestedBuckets] = useState<SuggestedBucket[]>([]);
  const [isLoadingBuckets, setIsLoadingBuckets] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Load suggested buckets - use cache if available
    const loadBuckets = async () => {
      try {
        // Check if cache is valid before showing loading state
        const { isCacheValid } = await import('../data/suggestedBuckets');
        const hasValidCache = isCacheValid();
        
        if (!hasValidCache) {
          setIsLoadingBuckets(true);
        }
        
        // Load buckets (will use cache if valid)
        const buckets = await loadSuggestedBuckets(true); // activeOnly = true
        
        if (isMounted) {
          setSuggestedBuckets(buckets);
          setIsLoadingBuckets(false);
        }
        
        // If cache was valid, refresh in background if needed (older than 1 hour)
        if (hasValidCache) {
          const { getCacheTimestamp } = await import('../data/suggestedBuckets');
          const cacheAge = Date.now() - getCacheTimestamp();
          const oneHour = 60 * 60 * 1000;
          
          if (cacheAge > oneHour) {
            // Cache is stale, refresh in background
            logger.log('Cache is stale, refreshing buckets in background...');
            try {
              await warmUpServer();
              await new Promise(resolve => setTimeout(resolve, 500));
              
              const freshBuckets = await loadSuggestedBuckets(true);
              if (isMounted) {
                setSuggestedBuckets(freshBuckets);
              }
            } catch (error) {
              console.error('Error refreshing buckets:', error);
              // Keep using cached buckets on error
            }
          }
        }
      } catch (error) {
        console.error('Error loading suggested buckets:', error);
        if (isMounted) {
          setSuggestedBuckets([]);
          setIsLoadingBuckets(false);
        }
      }
    };

    loadBuckets();

    // Check and recalculate buckets if needed (daily, in background)
    // This runs separately and only updates if recalculation actually happened
    const handleAutoRecalculation = async () => {
      try {
        setIsRecalculating(true);
        const { checkAndRecalculateBuckets } = await import('../utils/bucketRecalculationService');
        const result = await checkAndRecalculateBuckets();
        
        // Only reload if buckets were actually recalculated
        if (result.recalculated > 0 && isMounted) {
          logger.log(`Recalculated ${result.recalculated} buckets, refreshing...`);
          const reloaded = await loadSuggestedBuckets(true);
          setSuggestedBuckets(reloaded);
        }
      } catch (error) {
        console.error('Error in auto-recalculation:', error);
      } finally {
        if (isMounted) {
          setIsRecalculating(false);
        }
      }
    };

    // Run recalculation check in background (non-blocking, only once per day)
    // Use localStorage to track last recalculation time
    const lastRecalcKey = 'lastBucketRecalc';
    const lastRecalc = localStorage.getItem(lastRecalcKey);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (!lastRecalc || (now - parseInt(lastRecalc)) > oneDay) {
      // Only recalculate if it's been more than a day
      localStorage.setItem(lastRecalcKey, now.toString());
      handleAutoRecalculation();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      // Fallback: use window location hash
      window.location.hash = page;
    }
  };

  const handleImportBucket = (bucket: SuggestedBucket, targetPage: 'investment' | 'retirement') => {
    if (onImportBucket) {
      onImportBucket(bucket, targetPage);
      // Navigate to the target page after import
      handleNavigate(targetPage === 'investment' ? 'investment-plan' : 'retirement-plan');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section with Dashboard Design */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Subtle geometric patterns */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}></div>
          
          {/* Glowing orbs */}
          <div className="absolute top-20 left-10 w-96 h-96 bg-emerald-500/20 rounded-full mix-blend-screen filter blur-3xl animate-blob opacity-30"></div>
          <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-cyan-500/20 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000 opacity-25"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Side - Content */}
            <div className="text-left space-y-6 sm:space-y-8">
              {/* Logo and Brand */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12">
                  <img 
                    src="/favicon.png" 
                    alt="The Lal Street Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white flex items-center gap-2">
                  The Lal Street
                  <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
                </h1>
              </div>
              
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Your Comprehensive Mutual Fund Portfolio Calculator
              </h2>
              
              <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed">
                Analyze your investments with real-time NAV data, industry-standard calculations, and powerful planning tools
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  size="lg" 
                  className="group relative bg-emerald-500 hover:bg-emerald-400 text-white text-base sm:text-lg px-6 sm:px-8 py-6 sm:py-7 rounded-xl shadow-2xl shadow-emerald-500/50 hover:shadow-emerald-500/70 transition-all duration-300 hover:scale-105 border-0 font-semibold overflow-hidden w-full sm:w-auto"
                  onClick={() => scrollToSection('features')}
                >
                  <span className="relative flex items-center justify-center">
                    Explore Features →
                  </span>
                </Button>
                <Button 
                  size="lg" 
                  className="group relative bg-transparent border-2 border-white/40 text-white hover:bg-white/10 text-base sm:text-lg px-6 sm:px-8 py-6 sm:py-7 rounded-xl transition-all duration-300 hover:scale-105 font-semibold w-full sm:w-auto"
                  onClick={() => scrollToSection('how-it-works')}
                >
                  Learn More
                </Button>
              </div>
              
              {/* Security Note */}
              <div className="flex items-center gap-2 text-sm text-slate-400 pt-4">
                <Shield className="w-4 h-4" />
                <span>Secure & Private. Calculations happen locally on your device.</span>
              </div>
            </div>

            {/* Right Side - Glowing Dashboard */}
            <div className="relative lg:block hidden">
              <div className="relative" style={{
                transform: 'perspective(1200px) rotateY(-12deg) rotateX(8deg)',
                transformStyle: 'preserve-3d',
              }}>
                {/* Enhanced Glowing Border Effect */}
                <div className="absolute inset-0 bg-emerald-500/60 rounded-2xl blur-3xl opacity-70 animate-pulse"></div>
                <div className="absolute inset-[1px] bg-emerald-400/40 rounded-2xl blur-xl opacity-50"></div>
                
                {/* Dashboard Container */}
                <div className="relative bg-slate-950/98 backdrop-blur-xl rounded-2xl border-2 border-emerald-500/60 shadow-2xl p-5 overflow-hidden" style={{
                  boxShadow: '0 0 60px rgba(34, 197, 94, 0.6), 0 0 100px rgba(34, 197, 94, 0.3), inset 0 0 30px rgba(34, 197, 94, 0.15)',
                }}>
                  {/* Top Bar with Window Controls */}
                  <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-700/60">
                    <div className="flex items-center gap-2">
                      {/* Window Controls */}
                      <div className="flex gap-1.5 mr-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                      </div>
                      <span className="text-white font-semibold text-xs">The Lal Street</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_4px_rgba(34,197,94,0.8)]"></div>
                        <span className="text-xs text-emerald-400 font-medium">Real-Time NAV: Active</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_4px_rgba(34,197,94,0.8)]"></div>
                        <span className="text-xs text-emerald-400 font-medium">Funds: 6/6</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Chart Area */}
                  <div className="relative h-56 mb-5 bg-slate-900/80 rounded-lg p-3 border border-slate-700/60 overflow-hidden">
                    {/* Mini Inset Bar Chart */}
                    <div className="absolute top-2 left-2 z-10 bg-slate-800/90 rounded border border-slate-600/60 p-1.5 shadow-lg">
                      <svg width="60" height="24" viewBox="0 0 60 24" className="overflow-visible">
                        {/* Mini bars */}
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <rect
                            key={i}
                            x={i * 9 + 2}
                            y={20 - (i * 2.5 + 3)}
                            width="6"
                            height={i * 2.5 + 3}
                            fill="#3b82f6"
                            opacity="0.8"
                            className="transition-all"
                          />
                        ))}
                        {/* Mini trend line */}
                        <path
                          d="M 2 18 L 8 16 L 14 14 L 20 12 L 26 10 L 32 8"
                          fill="none"
                          stroke="#60a5fa"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    
                    {/* Main Professional Chart */}
                    <svg className="w-full h-full" viewBox="0 0 500 220" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        {/* Gradient for chart fill - darker blue to lighter green */}
                        <linearGradient id="chartGradientPro" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="rgba(34, 197, 94, 0.4)" stopOpacity="1" />
                          <stop offset="50%" stopColor="rgba(34, 197, 94, 0.25)" stopOpacity="1" />
                          <stop offset="100%" stopColor="rgba(59, 130, 246, 0.15)" stopOpacity="1" />
                        </linearGradient>
                        
                        {/* Glow filter for the line */}
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                        
                        {/* Glow for arrow */}
                        <filter id="arrowGlow">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      
                      {/* Y-axis grid lines with labels */}
                      {[0, 1, 2, 3, 4, 5].map((i) => {
                        const yPos = 30 + (i * 32);
                        return (
                          <g key={i}>
                            <line
                              x1="50"
                              y1={yPos}
                              x2="480"
                              y2={yPos}
                              stroke="rgba(255, 255, 255, 0.08)"
                              strokeWidth="1"
                            />
                            {/* Y-axis labels */}
                            <text
                              x="45"
                              y={yPos + 4}
                              fill="rgba(255, 255, 255, 0.4)"
                              fontSize="9"
                              textAnchor="end"
                              fontFamily="system-ui, -apple-system, sans-serif"
                            >
                              {(5 - i) * 500}
                            </text>
                          </g>
                        );
                      })}
                      
                      {/* X-axis grid lines (vertical) */}
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
                        const xPos = 50 + (i * 47.5);
                        return (
                          <line
                            key={i}
                            x1={xPos}
                            y1="30"
                            x2={xPos}
                            y2="190"
                            stroke="rgba(255, 255, 255, 0.05)"
                            strokeWidth="1"
                          />
                        );
                      })}
                      
                      {/* Chart data points - creating a realistic upward trend with variation */}
                      {/* Data: Jan: 800, Feb: 950, Mar: 1100, Apr: 1050 (down), May: 1250, Jun: 1400, Jul: 1350 (down), Aug: 1600, Sep: 1800, Oct: 2200 */}
                      <g>
                        {/* Gradient fill area */}
                        <path
                          d="M 50 150 
                             L 97.5 135 
                             L 145 120 
                             L 192.5 125 
                             L 240 90 
                             L 287.5 75 
                             L 335 80 
                             L 382.5 60 
                             L 430 45 
                             L 430 190 
                             L 50 190 Z"
                          fill="url(#chartGradientPro)"
                          opacity="0.9"
                        />
                        
                        {/* Main glowing line with realistic variation */}
                        <path
                          d="M 50 150 
                             Q 73.75 142.5, 97.5 135 
                             Q 121.25 127.5, 145 120 
                             Q 168.75 122.5, 192.5 125 
                             Q 216.25 107.5, 240 90 
                             Q 263.75 82.5, 287.5 75 
                             Q 311.25 77.5, 335 80 
                             Q 358.75 70, 382.5 60 
                             Q 406.25 52.5, 430 45"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter="url(#glow)"
                          style={{
                            filter: 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.8))',
                          }}
                        />
                        
                        {/* Data point markers */}
                        {[
                          { x: 50, y: 150 },
                          { x: 97.5, y: 135 },
                          { x: 145, y: 120 },
                          { x: 192.5, y: 125 },
                          { x: 240, y: 90 },
                          { x: 287.5, y: 75 },
                          { x: 335, y: 80 },
                          { x: 382.5, y: 60 },
                          { x: 430, y: 45 },
                        ].map((point, i) => (
                          <g key={i}>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="4"
                              fill="#22c55e"
                              stroke="#0f172a"
                              strokeWidth="2"
                              style={{
                                filter: 'drop-shadow(0 0 4px rgba(34, 197, 94, 1))',
                              }}
                            />
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="2"
                              fill="#86efac"
                            />
                          </g>
                        ))}
                      </g>
                      
                      {/* Large Glowing Growth Arrow */}
                      <g transform="translate(430, 45)">
                        <defs>
                          <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#22c55e" />
                            <stop offset="100%" stopColor="#10b981" />
                          </linearGradient>
                        </defs>
                        {/* Arrow shadow/glow */}
                        <path
                          d="M 0 0 L 45 -35 L 35 -25 L 35 -15 L 0 0 Z"
                          fill="rgba(34, 197, 94, 0.3)"
                          filter="url(#arrowGlow)"
                          style={{
                            filter: 'blur(8px)',
                          }}
                        />
                        {/* Main arrow */}
                        <path
                          d="M 0 0 L 45 -35 L 35 -25 L 35 -15 L 0 0 Z"
                          fill="url(#arrowGradient)"
                          style={{
                            filter: 'drop-shadow(0 0 12px rgba(34, 197, 94, 1))',
                          }}
                        />
                        {/* Arrow highlight */}
                        <path
                          d="M 5 -5 L 30 -25 L 28 -23 L 28 -18 L 5 -5 Z"
                          fill="rgba(134, 239, 172, 0.6)"
                        />
                      </g>
                      
                      {/* X-axis labels */}
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((month, i) => {
                        const xPos = 50 + (i * 47.5) + (i === 0 ? 0 : 0);
                        return (
                          <text
                            key={month}
                            x={xPos}
                            y={205}
                            fill="rgba(255, 255, 255, 0.5)"
                            fontSize="10"
                            textAnchor="middle"
                            fontFamily="system-ui, -apple-system, sans-serif"
                            fontWeight="500"
                          >
                            {month}
                          </text>
                        );
                      })}
                    </svg>
                  </div>
                  
                  {/* Metrics Cards */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/60 hover:border-emerald-500/40 transition-colors">
                      <div className="text-xs text-slate-400 mb-1.5 font-medium">XIRR</div>
                      <div className="text-xl font-bold text-emerald-400" style={{
                        textShadow: '0 0 10px rgba(34, 197, 94, 0.5)',
                      }}>14.2%</div>
                    </div>
                    <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/60 hover:border-emerald-500/40 transition-colors">
                      <div className="text-xs text-slate-400 mb-1.5 font-medium">Total Value:</div>
                      <div className="text-xl font-bold text-emerald-400" style={{
                        textShadow: '0 0 10px rgba(34, 197, 94, 0.5)',
                      }}>₹15,40,000</div>
                    </div>
                    <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/60 hover:border-emerald-500/40 transition-colors">
                      <div className="text-xs text-slate-400 mb-1.5 font-medium">Today&apos;s Gain:</div>
                      <div className="text-xl font-bold text-emerald-400" style={{
                        textShadow: '0 0 10px rgba(34, 197, 94, 0.5)',
                      }}>+₹12,500</div>
                      <div className="text-xs text-emerald-400 mt-0.5">(0.8%)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
              Why Choose The Lal Street?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              We provide the most comprehensive and accurate portfolio analysis tools for your mutual fund investments
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1 */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 sm:mb-6">
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Real-Time NAV Data</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Get accurate calculations with live NAV data directly from fund houses. No outdated information, no guesswork.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4 sm:mb-6">
                <Calculator className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Industry-Standard Metrics</h3>
              <p className="text-sm sm:text-base text-gray-600">
                XIRR, CAGR, Rolling Returns, and more. All calculations follow financial industry standards for accuracy.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4 sm:mb-6">
                <PieChart className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Multi-Fund Portfolios</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Build and analyze portfolios with up to 5 funds. Custom weightage allocation and comprehensive analysis.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4 sm:mb-6">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Advanced Calculators</h3>
              <p className="text-sm sm:text-base text-gray-600">
                SIP, Lumpsum, Combined strategies, SWP - all the tools you need to plan your financial future.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mb-4 sm:mb-6">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Secure & Private</h3>
              <p className="text-sm sm:text-base text-gray-600">
                All calculations happen locally in your browser. Your data never leaves your device. Complete privacy.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-rose-50 to-red-50 border border-rose-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center mb-4 sm:mb-6">
                <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Lightning Fast</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Instant calculations, real-time updates, and smooth interactions. Built for speed and performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
              How It Works
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 relative">
            {/* Connector Line */}
            <div className="hidden md:block absolute top-16 sm:top-20 md:top-24 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-400"></div>

            {/* Step 1 */}
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl sm:text-2xl font-bold mb-4 sm:mb-6 shadow-lg">
                1
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Select Funds</h3>
              <p className="text-sm sm:text-base text-gray-600 px-4">
                Search and add up to 5 mutual funds to create your portfolio. Allocate weightage as per your investment strategy.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xl sm:text-2xl font-bold mb-4 sm:mb-6 shadow-lg">
                2
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Choose Calculator</h3>
              <p className="text-sm sm:text-base text-gray-600 px-4">
                Select from Investment Plan calculators (SIP, Lumpsum) or Retirement Plan tools (SWP, Yearly Returns).
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white text-xl sm:text-2xl font-bold mb-4 sm:mb-6 shadow-lg">
                3
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Analyze Results</h3>
              <p className="text-sm sm:text-base text-gray-600 px-4">
                View detailed metrics, interactive charts, and comprehensive reports to make informed investment decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Suggested Buckets Section */}
      {isLoadingBuckets ? (
        <section id="recommended-portfolios" className="py-8 sm:py-12 md:py-20 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6 sm:mb-8 md:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
                Recommended Portfolios
              </h2>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-2">
                Expertly curated fund buckets with proven performance track records. 
                Import these portfolios directly into your investment or retirement plans.
              </p>
            </div>

            {/* Loading State */}
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20">
              <Loader2 className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 animate-spin text-emerald-600 mb-4 sm:mb-6" />
              <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                Loading Recommended Portfolios...
              </h3>
              <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto px-4">
                We're fetching the latest curated investment portfolios for you
              </p>
            </div>

            {/* Loading Skeleton Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mt-8">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4 sm:p-5 md:p-6 border-2 flex flex-col">
                  <div className="mb-3 sm:mb-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Skeleton className="h-5 sm:h-6 w-3/4" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  
                  <div className="mb-3 sm:mb-4 space-y-2">
                    <Skeleton className="h-12 sm:h-14 w-full rounded-lg" />
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-16 sm:h-20 rounded" />
                      <Skeleton className="h-16 sm:h-20 rounded" />
                    </div>
                  </div>
                  
                  <div className="mb-3 sm:mb-4 flex-1">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 sm:gap-2.5 pt-3 sm:pt-4 border-t mt-auto">
                    <Skeleton className="h-9 sm:h-10 w-full rounded-md" />
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-9 sm:h-10 w-full rounded-md" />
                      <Skeleton className="h-9 sm:h-10 w-full rounded-md" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ) : suggestedBuckets.length > 0 ? (
        <SuggestedBuckets 
          buckets={suggestedBuckets} 
          onImportBucket={handleImportBucket}
        />
      ) : null}

      {/* CTA Section with Enhanced Background */}
      <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10"></div>
          <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full filter blur-3xl animate-blob"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-gradient-to-br from-pink-400/20 to-rose-600/20 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-purple-100 mb-4 sm:mb-6 drop-shadow-lg px-4">
            Ready to Plan Your Financial Future?
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-cyan-50 mb-8 sm:mb-10 max-w-2xl mx-auto px-4">
            Start analyzing your portfolio today with real-time data and professional-grade calculations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center px-4">
            <Button 
              size="lg" 
              className="group relative bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-base sm:text-lg px-6 sm:px-8 md:px-10 py-5 sm:py-6 md:py-7 rounded-xl shadow-2xl shadow-emerald-500/50 hover:shadow-emerald-500/70 transition-all duration-300 hover:scale-105 border-0 font-semibold overflow-hidden w-full sm:w-auto"
              onClick={() => handleNavigate('investment-plan')}
            >
              <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative flex items-center justify-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Investment Plan
              </span>
            </Button>
            <Button 
              size="lg" 
              className="group relative bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white text-base sm:text-lg px-6 sm:px-8 md:px-10 py-5 sm:py-6 md:py-7 rounded-xl shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 transition-all duration-300 hover:scale-105 border-0 font-semibold overflow-hidden w-full sm:w-auto"
              onClick={() => handleNavigate('retirement-plan')}
            >
              <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative flex items-center justify-center">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Retirement Plan
              </span>
            </Button>
          </div>
        </div>
      </section>

      {/* Hidden Admin Access - Very Subtle, Bottom Right Corner */}
      <div className="fixed bottom-3 right-3 z-50">
        <button
          onClick={() => handleNavigate('admin')}
          className="text-slate-300/5 hover:text-slate-400/15 transition-all duration-300 cursor-pointer select-none"
          title=""
          aria-label="Admin Access"
          style={{
            fontSize: '9px',
            fontFamily: 'system-ui, sans-serif',
            padding: '8px',
            lineHeight: '0.5',
            opacity: 0.02,
            letterSpacing: '2px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.15';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.02';
          }}
        >
          ·
        </button>
      </div>
    </div>
  );
}

