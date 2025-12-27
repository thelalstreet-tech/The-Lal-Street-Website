import React, { useState, useCallback, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { HomePage } from './components/HomePage';
import { InvestmentPlanPage } from './components/InvestmentPlanPage';
import { RetirementPlanPage } from './components/RetirementPlanPage';
import { FinancialPlanningPage } from './components/FinancialPlanningPage';
import { AIStockAnalysisPage } from './components/AIStockAnalysisPage';
import { BlogsPage } from './components/BlogsPage';
import { AdminPage } from './components/AdminPage';
import { Footer } from './components/Footer';
import { LoginModal } from './components/LoginModal';
import { useAuth } from './contexts/AuthContext';
import { useIdleTimer } from './hooks/useIdleTimer';
import type { Bucket } from './types/bucket';
import type { SuggestedBucket } from './types/suggestedBucket';

// A little christmas update 
import SnowFall from 'react-snowfall';

export interface Fund {
  id: string;
  name: string;
  launchDate: string;
  category: string;
}

export interface SelectedFund extends Fund {
  weightage: number;
}

export type PageType = 'home' | 'investment-plan' | 'retirement-plan' | 'financial-planning' | 'ai-stock-analysis' | 'blogs' | 'admin';

// Utility function to distribute 100% weightage as whole numbers
const distributeWeightage = (count: number): number[] => {
  if (count === 0) return [];
  
  const baseWeight = Math.floor(100 / count);
  const remainder = 100 - (baseWeight * count);
  
  // Create array with base weights
  const weights = new Array(count).fill(baseWeight);
  
  // Distribute remainder by adding 1 to the first 'remainder' funds
  for (let i = 0; i < remainder; i++) {
    weights[i] += 1;
  }
  
  return weights;
};

export default function App() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Separate fund selections for Investment and Retirement plans
  const [investmentFunds, setInvestmentFunds] = useState<SelectedFund[]>([]);
  const [retirementFunds, setRetirementFunds] = useState<SelectedFund[]>([]);
  const [activePage, setActivePage] = useState<PageType>('home');
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  
  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 2-minute popup logic
  useIdleTimer({
    onIdle: () => {
      // Only show popup if user is not authenticated and not already showing
      if (!isAuthenticated && !showLoginModal && !authLoading) {
        setShowLoginModal(true);
      }
    },
    idleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !isAuthenticated && !authLoading, // Only track if not authenticated
  });

  // Handle login modal dismissal
  const handleDismissLogin = () => {
    // Mark as dismissed for this session
    sessionStorage.setItem('loginPopupDismissed', 'true');
    setShowLoginModal(false);
  };

  // Reset dismissal when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      sessionStorage.removeItem('loginPopupDismissed');
      localStorage.removeItem('siteVisitStartTime');
      setShowLoginModal(false);
    }
  }, [isAuthenticated]);

  // Handle URL hash for direct navigation (including admin access via #admin)
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && ['home', 'investment-plan', 'retirement-plan', 'financial-planning', 'ai-stock-analysis', 'blogs', 'admin'].includes(hash)) {
      setActivePage(hash as PageType);
    }
  }, []);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && ['home', 'investment-plan', 'retirement-plan', 'financial-planning', 'ai-stock-analysis', 'blogs', 'admin'].includes(hash)) {
        setActivePage(hash as PageType);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Investment Plan Handlers
  const handleAddInvestmentFund = (fund: Fund) => {
    if (investmentFunds.find(f => f.id === fund.id)) return;
    if (investmentFunds.length >= 5) {
      alert('Maximum 5 funds allowed in the bucket. Please remove a fund before adding a new one.');
      return;
    }
    
    const newCount = investmentFunds.length + 1;
    const weights = distributeWeightage(newCount);
    
    const updatedFunds = investmentFunds.map((f, index) => ({
      ...f,
      weightage: weights[index]
    }));
    
    setInvestmentFunds([...updatedFunds, { ...fund, weightage: weights[newCount - 1] }]);
  };

  const handleRemoveInvestmentFund = (fundId: string) => {
    const filtered = investmentFunds.filter(f => f.id !== fundId);
    
    if (filtered.length > 0) {
      const weights = distributeWeightage(filtered.length);
      const redistributed = filtered.map((f, index) => ({
        ...f,
        weightage: weights[index]
      }));
      setInvestmentFunds(redistributed);
    } else {
      setInvestmentFunds([]);
    }
  };

  const handleInvestmentWeightageChange = (fundId: string, weightage: number) => {
    setInvestmentFunds(investmentFunds.map(f => 
      f.id === fundId ? { ...f, weightage } : f
    ));
  };

  // Retirement Plan Handlers
  const handleAddRetirementFund = (fund: Fund) => {
    if (retirementFunds.find(f => f.id === fund.id)) return;
    if (retirementFunds.length >= 5) {
      alert('Maximum 5 funds allowed in the bucket. Please remove a fund before adding a new one.');
      return;
    }
    
    const newCount = retirementFunds.length + 1;
    const weights = distributeWeightage(newCount);
    
    const updatedFunds = retirementFunds.map((f, index) => ({
      ...f,
      weightage: weights[index]
    }));
    
    setRetirementFunds([...updatedFunds, { ...fund, weightage: weights[newCount - 1] }]);
  };

  const handleRemoveRetirementFund = (fundId: string) => {
    const filtered = retirementFunds.filter(f => f.id !== fundId);
    
    if (filtered.length > 0) {
      const weights = distributeWeightage(filtered.length);
      const redistributed = filtered.map((f, index) => ({
        ...f,
        weightage: weights[index]
      }));
      setRetirementFunds(redistributed);
    } else {
      setRetirementFunds([]);
    }
  };

  const handleRetirementWeightageChange = (fundId: string, weightage: number) => {
    setRetirementFunds(retirementFunds.map(f => 
      f.id === fundId ? { ...f, weightage } : f
    ));
  };

  // Bucket Handlers
  const handleCreateBucket = useCallback((name: string, funds: SelectedFund[]) => {
    const newBucket: Bucket = {
      id: `bucket-${Date.now()}`,
      name,
      funds: [...funds],
      createdAt: new Date().toISOString(),
    };
    setBuckets(prev => [...prev, newBucket]);
  }, []);

  const handleDeleteBucket = useCallback((bucketId: string) => {
    setBuckets(prev => prev.filter(b => b.id !== bucketId));
  }, []);

  const handleAddFundsToBucket = useCallback((bucketId: string, funds: SelectedFund[]) => {
    setBuckets(prev => prev.map(bucket => 
      bucket.id === bucketId 
        ? { ...bucket, funds: [...funds] }
        : bucket
    ));
  }, []);

  const handleNavigate = (page: PageType) => {
    setActivePage(page);
    // Scroll to top when navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Suggested Bucket Import Handler
  const handleImportSuggestedBucket = useCallback((bucket: SuggestedBucket, targetPage: 'investment' | 'retirement') => {
    // Import funds from suggested bucket
    const fundsToImport: SelectedFund[] = bucket.funds.map((fund) => ({
      ...fund,
      weightage: fund.weightage || 0
    }));

    if (targetPage === 'investment') {
      setInvestmentFunds(fundsToImport);
    } else {
      setRetirementFunds(fundsToImport);
    }
    
    // Navigate to the target page
    setActivePage(targetPage === 'investment' ? 'investment-plan' : 'retirement-plan');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} onImportBucket={handleImportSuggestedBucket} />;
      case 'investment-plan':
        return (
          <InvestmentPlanPage
            selectedFunds={investmentFunds}
            onAddFund={handleAddInvestmentFund}
            onRemoveFund={handleRemoveInvestmentFund}
            onWeightageChange={handleInvestmentWeightageChange}
          />
        );
      case 'retirement-plan':
        return (
          <RetirementPlanPage
            selectedFunds={retirementFunds}
            onAddFund={handleAddRetirementFund}
            onRemoveFund={handleRemoveRetirementFund}
            onWeightageChange={handleRetirementWeightageChange}
          />
        );
      case 'financial-planning':
        return <FinancialPlanningPage />;
      case 'ai-stock-analysis':
        return <AIStockAnalysisPage onNavigate={handleNavigate} />;
      case 'blogs':
        return <BlogsPage onNavigate={handleNavigate} />;
      case 'admin':
        return <AdminPage onNavigate={handleNavigate} />;
      default:
        return <HomePage />;
    }
  };

  const totalFundsCount = investmentFunds.length + retirementFunds.length;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50">

      <SnowFall
        snowflakeCount={80}
        style={{ position: 'fixed', width: '100%', height: '100%', zIndex: 1 }}
      />

      <Navigation 
        activePage={activePage} 
        onNavigate={handleNavigate}
        selectedFundsCount={totalFundsCount}
      />
      
      <main className="flex-1">
        {renderPage()}
      </main>
      
      {/* Footer */}
      <Footer />
      
      {/* Hidden Admin Login Button - Very Subtle, Bottom Right Corner */}
      {activePage === 'home' && (
        <button
          onClick={() => setActivePage('admin')}
          className="fixed bottom-3 right-3 z-50 text-slate-300/5 hover:text-slate-400/20 transition-opacity duration-300 cursor-pointer select-none"
          title=""
          aria-label="Admin Access"
          style={{
            fontSize: '8px',
            fontFamily: 'monospace',
            padding: '4px',
            lineHeight: '1',
            opacity: 0.03,
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.03';
          }}
        >
          ·
        </button>
      )}

      {/* Login Modal - Shows after 2 minutes or when manually triggered */}
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onDismiss={handleDismissLogin}
      />
    </div>
  );
}
