import React, { useState } from 'react';
import { Sparkles, TrendingUp, Brain, Zap, LogIn, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { LoginModal } from './LoginModal';
import { useAuth } from '../contexts/AuthContext';

interface AIStockAnalysisPageProps {
  onNavigate?: (page: string) => void;
}

export function AIStockAnalysisPage({ onNavigate }: AIStockAnalysisPageProps) {
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      // If authenticated, show a message that it's coming soon
      // Could also navigate to a waitlist or notification signup
    } else {
      setShowLoginModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-purple-500/20 backdrop-blur-sm border border-purple-400/30 rounded-full">
            <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
            <span className="text-sm font-medium text-purple-200">Coming Soon</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              AI Stock Analysis
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-slate-300 mb-4 max-w-2xl mx-auto">
            Harness the power of artificial intelligence to make smarter investment decisions
          </p>

          {/* Catchy Phrase */}
          <p className="text-lg text-slate-300 mb-12 max-w-xl mx-auto font-medium">
            Get ready to experience the next generation of stock analysis. Our AI-powered platform will revolutionize how you make investment decisions and maximize your portfolio returns.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 hover:bg-white/15 transition-all">
              <Brain className="w-10 h-10 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Insights</h3>
              <p className="text-sm text-slate-300">
                Get intelligent stock analysis powered by advanced machine learning algorithms
              </p>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 hover:bg-white/15 transition-all">
              <TrendingUp className="w-10 h-10 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Real-Time Analysis</h3>
              <p className="text-sm text-slate-300">
                Receive instant recommendations based on market trends and historical data
              </p>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 hover:bg-white/15 transition-all">
              <Zap className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Smart Predictions</h3>
              <p className="text-sm text-slate-300">
                Leverage predictive analytics to stay ahead of market movements
              </p>
            </Card>
          </div>

          {/* CTA Section */}
          <div className="space-y-6">
            {!isAuthenticated ? (
              <>
                <div className="flex justify-center items-center">
                  <Button
                    onClick={() => setShowLoginModal(true)}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-10 py-7 text-lg font-bold shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-105"
                  >
                    <LogIn className="w-5 h-5 mr-2" />
                    Join the Exclusive Waiting List
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <p className="text-base text-slate-300 font-medium">
                    🎯 Secure Your Spot Among Early Adopters
                  </p>
                  <p className="text-sm text-slate-400 max-w-2xl mx-auto">
                    Be the first to unlock AI-powered stock analysis when we launch. Join our exclusive waiting list and get priority access to revolutionary investment insights that will transform your portfolio strategy.
                  </p>
                  <p className="text-xs text-slate-500 italic">
                    Limited spots available • First-come, first-served basis
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-full mb-4">
                  <Sparkles className="w-5 h-5 text-green-300" />
                  <span className="text-sm font-medium text-green-200">
                    🎉 You're on the waiting list! We'll notify you as soon as AI Stock Analysis launches.
                  </span>
                </div>
                
                <p className="text-sm text-slate-400">
                  Thank you for joining our exclusive community. You'll be among the first to experience the future of intelligent stock analysis!
                </p>
              </>
            )}
          </div>

          {/* Additional Info */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-sm text-slate-500">
              Want to learn more? <button 
                onClick={() => onNavigate?.('home')} 
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Explore our other tools
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* Add animation styles */}
      <style>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

