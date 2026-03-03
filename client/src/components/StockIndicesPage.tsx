import React, { useState, useEffect } from 'react';
import { TrendingUp, Search, ArrowLeft, Loader2, Info, Filter, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from './ui/utils';
import { TradingViewChart } from './TradingViewChart';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface Constituent {
    symbol: string;
    companyName: string;
    industry: string;
    isin: string;
    weightage: number;
}

interface IndexData {
    slug: string;
    name: string;
    exchange: string;
    constituentCount: number;
    constituents: Constituent[];
}

interface StockIndicesPageProps {
    onNavigate?: (page: any) => void;
}

type ViewMode = 'list' | 'chart';

export function StockIndicesPage({ onNavigate }: StockIndicesPageProps) {
    const [indices, setIndices] = useState<IndexData[]>([]);
    const [activeSlug, setActiveSlug] = useState<string>('');
    const [activeIndexData, setActiveIndexData] = useState<IndexData | null>(null);
    const [loading, setLoading] = useState(true);
    const [indexLoading, setIndexLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // View state
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [selectedStock, setSelectedStock] = useState<Constituent | null>(null);
    // Filter states
    const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
    const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);

    const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000';

    // Helper for index categories
    const getIndexSubtitle = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('nifty 50') && !n.includes('next')) return 'Benchmark Index';
        if (n.includes('bank')) return 'Banking Sector';
        if (n.includes('it')) return 'Tech Sector';
        if (n.includes('fmcg')) return 'Consumer Goods';
        if (n.includes('pharma')) return 'Health Sector';
        if (n.includes('sensex')) return 'BSE Benchmark';
        if (n.includes('500')) return 'Broad Market';
        return 'Market Index';
    };

    // Mapping for Index symbols in TradingView
    const getIndexChartSymbol = (name: string) => {
        const n = name.toUpperCase();
        if (n.includes('NIFTY 50') && !n.includes('NEXT')) return 'NIFTY';
        if (n.includes('NIFTY BANK')) return 'BANKNIFTY';
        if (n.includes('NIFTY IT')) return 'NIFTYIT';
        if (n.includes('NIFTY 500')) return 'CNX500'; // TradingView uses CNX500 for Nifty 500
        if (n.includes('NIFTY AUTO')) return 'NIFTYAUTO';
        if (n.includes('NIFTY FMCG')) return 'NIFTYFMCG';
        if (n.includes('NIFTY PHARMA')) return 'NIFTYPHARMA';
        if (n.includes('NIFTY METAL')) return 'NIFTYMETAL';
        if (n.includes('NIFTY INFRA')) return 'NIFTYINFRA';
        if (n.includes('NIFTY NEXT 50')) return 'JUNIOR';
        if (n.includes('SENSEX')) return 'SENSEX';
        return 'NIFTY'; // Fallback
    };

    useEffect(() => {
        const fetchIndices = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/api/stock-indices`);
                if (!response.ok) throw new Error('Failed to fetch indices');
                const data = await response.json();
                setIndices(data);
                if (data.length > 0 && !activeSlug) {
                    setActiveSlug(data[0].slug);
                }
            } catch (error) {
                console.error('Error fetching indices:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchIndices();
    }, [API_BASE_URL]);

    useEffect(() => {
        if (!activeSlug) return;
        const fetchIndexStocks = async () => {
            try {
                setIndexLoading(true);
                const url = new URL(`${API_BASE_URL}/api/stock-indices/${activeSlug}/stocks`);
                if (searchQuery) url.searchParams.append('search', searchQuery);

                const response = await fetch(url.toString());
                if (!response.ok) throw new Error('Failed to fetch index stocks');
                const data = await response.json();
                setActiveIndexData(data);
            } catch (error) {
                console.error('Error fetching index stocks:', error);
            } finally {
                setIndexLoading(false);
            }
        };
        const timer = setTimeout(fetchIndexStocks, searchQuery ? 300 : 0);
        return () => clearTimeout(timer);
    }, [activeSlug, searchQuery, API_BASE_URL]);

    // Extract unique industries whenever activeIndexData changes
    useEffect(() => {
        if (activeIndexData?.constituents) {
            const industries = Array.from(new Set(activeIndexData.constituents.map(c => c.industry).filter(Boolean)));
            setAvailableIndustries(industries.sort());
            setSelectedIndustry(null); // Reset filter when index changes
        }
    }, [activeIndexData]);

    const handleViewChart = (stock: Constituent) => {
        setSelectedStock(stock);
        setViewMode('chart');
        window.scrollTo(0, 0);
    };

    const handleViewIndexChart = () => {
        setSelectedStock(null);
        setViewMode('chart');
        window.scrollTo(0, 0);
    };

    const filteredConstituents = (activeIndexData?.constituents || []).filter(stock => {
        if (!selectedIndustry) return true;
        return stock.industry === selectedIndustry;
    });

    return (
        <div className="min-h-screen bg-slate-50/30">
            {/* Dynamic Header */}
            <header className="sticky top-16 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 py-4">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                if (viewMode === 'chart') setViewMode('list');
                                else onNavigate?.('home');
                            }}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                            {viewMode === 'list' ? 'Market Indices' : 'Stock Analysis'}
                        </h1>
                    </div>

                    {viewMode === 'list' && (
                        <div className="relative flex-1 max-w-sm hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search stocks..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* Sidebar: Major Indices (Always visible or in its own column) */}
                    <aside className="lg:col-span-3 border border-slate-100 bg-white rounded-2xl p-4 shadow-sm sticky top-32">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 px-2">Major Indices</h2>
                        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-250px)] pr-1 scrollbar-hide">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl" />
                                ))
                            ) : (
                                indices.map((idx) => (
                                    <button
                                        key={idx.slug}
                                        onClick={() => {
                                            setActiveSlug(idx.slug);
                                            if (viewMode === 'chart') setViewMode('list');
                                        }}
                                        className={cn(
                                            "w-full p-4 rounded-xl transition-all text-left flex items-center justify-between group border relative",
                                            activeSlug === idx.slug
                                                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100"
                                                : "bg-white border-transparent hover:bg-slate-50 text-slate-600"
                                        )}
                                    >
                                        <div>
                                            <p className="font-bold text-sm mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{idx.name}</p>
                                            <p className={cn(
                                                "text-[10px] opacity-70 font-medium",
                                                activeSlug === idx.slug ? "text-blue-50" : "text-slate-400"
                                            )}>
                                                {getIndexSubtitle(idx.name)}
                                            </p>
                                        </div>
                                        <div className={cn(
                                            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px]",
                                            activeSlug === idx.slug ? "bg-white/20 text-white" : "bg-slate-50 text-slate-400"
                                        )}>
                                            {idx.constituentCount}
                                        </div>
                                        {activeSlug === idx.slug && (
                                            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-full" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <div className="lg:col-span-9">
                        {viewMode === 'list' ? (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">
                                            {activeIndexData?.name || 'Index'}
                                        </h2>
                                        <div className="flex items-center gap-3 mt-1">
                                            <p className="text-sm text-slate-500 italic">Constituents & Analytics</p>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                            <button
                                                onClick={handleViewIndexChart}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 group"
                                            >
                                                <TrendingUp className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                                View Index Chart
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" className={cn(
                                                    "gap-2 h-9 border-slate-200",
                                                    selectedIndustry && "bg-blue-50 border-blue-200 text-blue-600"
                                                )}>
                                                    <Filter className="w-4 h-4" />
                                                    {selectedIndustry || 'Filter'}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
                                                <DropdownMenuLabel>Filter by Industry</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setSelectedIndustry(null)}>
                                                    All Industries
                                                </DropdownMenuItem>
                                                {availableIndustries.map(industry => (
                                                    <DropdownMenuItem key={industry} onClick={() => setSelectedIndustry(industry)}>
                                                        {industry}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white shadow-sm overflow-hidden">
                                    <table className="w-full text-left border-collapse min-w-[700px]">
                                        <thead>
                                            <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-bold tracking-widest border-b border-slate-50">
                                                <th className="px-6 py-4">Symbol</th>
                                                <th className="px-6 py-4">Company</th>
                                                <th className="px-6 py-4">Sector</th>
                                                <th className="px-6 py-4">LTP (₹)</th>
                                                <th className="px-6 py-4 text-center">Change %</th>
                                                <th className="px-6 py-4 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-sm">
                                            {indexLoading ? (
                                                Array.from({ length: 8 }).map((_, i) => (
                                                    <tr key={i} className="animate-pulse">
                                                        <td colSpan={6} className="px-6 py-8 bg-slate-50/10" />
                                                    </tr>
                                                ))
                                            ) : filteredConstituents.length > 0 ? (
                                                filteredConstituents.map((stock) => (
                                                    <tr key={stock.symbol} className="hover:bg-slate-50/50 transition-all group">
                                                        <td className="px-6 py-4">
                                                            <span className="font-bold text-blue-600 bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100/50 text-xs">
                                                                {stock.symbol}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-800 text-sm">{stock.companyName}</span>
                                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">{activeIndexData?.exchange || 'NSE'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                                                            {stock.industry || '—'}
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-slate-900">—</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="text-slate-400 group-hover:text-amber-500 transition-colors">—</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleViewChart(stock)}
                                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold h-8 text-xs"
                                                            >
                                                                View Chart
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">
                                                        No stocks found matching your search.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            /* Breadcrumb Chart View */
                            <div className="space-y-6">
                                <nav className="flex items-center gap-2 text-[12px] text-slate-500 font-bold uppercase tracking-wider overflow-x-auto whitespace-nowrap px-1">
                                    <button onClick={() => setViewMode('list')} className="hover:text-blue-600 transition-colors">Indices</button>
                                    <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                    <button
                                        onClick={() => {
                                            if (selectedStock) handleViewIndexChart();
                                            else setViewMode('list');
                                        }}
                                        className={cn(
                                            "hover:text-blue-600 transition-colors",
                                            !selectedStock && "text-slate-900"
                                        )}
                                    >
                                        {activeIndexData?.name}
                                    </button>
                                    {selectedStock && (
                                        <>
                                            <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                            <span className="text-slate-900">{selectedStock.companyName}</span>
                                        </>
                                    )}
                                </nav>

                                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-lg shadow-md shadow-blue-100 uppercase">
                                            {selectedStock ? selectedStock.symbol : getIndexChartSymbol(activeIndexData?.name || '')}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 leading-tight">
                                                {selectedStock ? selectedStock.companyName : activeIndexData?.name}
                                            </h2>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                {activeIndexData?.exchange || 'NSE'} • {selectedStock ? selectedStock.industry : 'INDEX OVERVIEW'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Price Info Delayed</p>
                                            <p className="text-3xl font-black text-slate-900">—</p>
                                        </div>
                                    </div>
                                </div>

                                <Card className="h-[calc(100vh-380px)] min-h-[500px] overflow-hidden border-slate-100 shadow-lg rounded-3xl">
                                    <TradingViewChart
                                        symbol={selectedStock ? selectedStock.symbol : getIndexChartSymbol(activeIndexData?.name || '')}
                                        exchange={activeIndexData?.exchange || 'NSE'}
                                        theme="light"
                                    />
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
