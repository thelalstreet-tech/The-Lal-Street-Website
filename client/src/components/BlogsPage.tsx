import React from 'react';
import { BookOpen, Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface BlogsPageProps {
  onNavigate?: (page: string) => void;
}

export function BlogsPage({ onNavigate }: BlogsPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 sm:py-16 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        {onNavigate && (
          <Button
            onClick={() => onNavigate('home')}
            variant="ghost"
            className="mb-6 text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        )}

        {/* Coming Soon Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-full">
            <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
            <span className="text-sm font-medium text-blue-700">Coming Soon</span>
          </div>

          {/* Main Heading */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900">
              Blogs & Community
            </h1>
          </div>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Your go-to destination for expert insights, investment strategies, and community-driven financial wisdom
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-blue-200 hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Expert Articles</h3>
            <p className="text-sm text-gray-600">
              In-depth guides, market analysis, and investment strategies written by financial experts
            </p>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-sm border-purple-200 hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Community Posts</h3>
            <p className="text-sm text-gray-600">
              Share experiences, ask questions, and learn from a community of like-minded investors
            </p>
          </Card>
        </div>

        {/* Coming Soon Message */}
        <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Stay Tuned for Launch!
          </h2>
          <p className="text-gray-600 mb-6 max-w-xl mx-auto">
            We're building an amazing platform where you can access expert financial insights, 
            share your investment journey, and connect with a vibrant community of investors. 
            Get ready to expand your financial knowledge!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => onNavigate?.('home')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              Explore Our Tools
            </Button>
            <Button
              onClick={() => onNavigate?.('financial-planning')}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              Try Financial Planning
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

