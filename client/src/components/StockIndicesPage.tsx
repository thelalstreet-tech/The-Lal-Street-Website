import React, { useState, useEffect } from 'react';
import { TrendingUp, Search, Layers, ArrowLeft, Loader2, Info, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from './ui/utils';
import { StockChartModal } from './StockChartModal';

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

export function StockIndicesPage({ onNavigate }: StockIndicesPageProps) {
    const [indices, setIndices] = useState<IndexData[]>([]);
    const [activeSlug, setActiveSlug] = useState<string>('');
    const [activeIndexData, setActiveIndexData] = useState<IndexData | null>(null);
    const [loading, setLoading] = useState(true);
    const [indexLoading, setIndexLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Selected stock for chart modal
    const [selectedStock, setSelectedStock] = useState<Constituent | null>(null);
    const [showChartModal, setShowChartModal] = useState(false);

    // Use the backend URL from environment or default to localhost:5000
    const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000';

    // Fetch index list on mount
    const handleStockClick = (stock: Constituent) => {
        setSelectedStock(stock);
        setShowChartModal(true);
    };

    useEffect(() => {
        const fetchIndices = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/api/stock-indices`);
                if (!response.ok) throw new Error('Failed to fetch indices');
                const data = await response.json();
                setIndices(data);
                if (data.length > 0) {
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

    // Fetch stocks when activeSlug or searchQuery changes
    useEffect(() => {
        if (!activeSlug) return;

        const fetchIndexStocks = async () => {
            try {
                setIndexLoading(true);
                const url = new URL(`${API_BASE_URL}/api/stock-indices/${activeSlug}/stocks`);
                if (searchQuery) {
                    url.searchParams.append('search', searchQuery);
                }

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

    const filteredConstituents = activeIndexData?.constituents || [];

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onNavigate?.('home')}
                                className="p-0 h-auto hover:bg-transparent text-slate-500 hover:text-blue-600 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Back to Home
                            </Button>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <TrendingUp className="w-8 h-8 text-blue-600" />
                            Stock Market Indices
                        </h1>
                        <p className="text-slate-600 mt-1 max-w-2xl">
                            Explorer the constituents and industry composition of major NSE & BSE market benchmarks.
                        </p>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search stocks within index..."
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-full md:w-80 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Index List - Sidebar */}
                <div className="lg:col-span-1">
                    <Card className="p-2 sticky top-24 overflow-hidden border-slate-200 shadow-sm">
                        <div className="bg-slate-50 px-4 py-2 mb-2 rounded border-b border-slate-100">
                            <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                Benchmarks
                            </span>
                        </div>

                        <div className="space-y-1 overflow-y-auto max-h-[70vh]">
                            {loading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <div key={i} className="h-10 animate-pulse bg-slate-100 rounded-md mx-2" />
                                ))
                            ) : (
                                indices.map((index) => (
                                    <button
                                        key={index.slug}
                                        onClick={() => {
                                            setActiveSlug(index.slug);
                                            setSearchQuery('');
                                        }}
                                        className={cn(
                                            "w-full text-left px-4 py-3 rounded-md transition-all flex items-center justify-between group",
                                            activeSlug === index.slug
                                                ? "bg-blue-600 text-white shadow-md active:scale-95"
                                                : "text-slate-600 hover:bg-slate-100 hover:text-blue-600"
                                        )}
                                    >
                                        <span className="font-medium truncate pr-2">{index.name}</span>
                                        <span className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded-full border",
                                            activeSlug === index.slug
                                                ? "bg-white/20 border-white/30 text-white"
                                                : "bg-slate-50 border-slate-200 text-slate-400"
                                        )}>
                                            {index.constituentCount}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                {/* Constituents Table - Content */}
                <div className="lg:col-span-3">
                    <Card className="overflow-hidden border-slate-200 shadow-sm relative min-h-[400px]">
                        {indexLoading && (
                            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                            </div>
                        )}

                        <div className="bg-white border-b border-slate-100 p-6">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-xl font-bold text-slate-900">
                                    {activeIndexData?.name || activeSlug} Constituents
                                </h2>
                                <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                    {filteredConstituents.length} Stocks Found
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-100 w-fit">
                                <Info className="w-3.5 h-3.5" />
                                Live prices coming soon via TrueData API integration
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                                        <th className="px-6 py-4 border-b border-slate-100">#</th>
                                        <th className="px-6 py-4 border-b border-slate-100">Symbol</th>
                                        <th className="px-6 py-4 border-b border-slate-100">Company Name</th>
                                        <th className="px-6 py-4 border-b border-slate-100">Industry</th>
                                        <th className="px-6 py-4 border-b border-slate-100">LTP</th>
                                        <th className="px-6 py-4 border-b border-slate-100">Change</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {filteredConstituents.length > 0 ? (
                                        filteredConstituents.map((stock, index) => (
                                            <tr
                                                key={stock.symbol}
                                                className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                                onClick={() => handleStockClick(stock)}
                                            >
                                                <td className="px-6 py-4 text-slate-400 font-mono text-xs">{index + 1}</td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-100 transition-colors">
                                                        {stock.symbol}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-700">
                                                    <div className="flex items-center gap-2">
                                                        {stock.companyName}
                                                        <ExternalLink className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                                        {stock.industry || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400">—</td>
                                                <td className="px-6 py-4 text-slate-400">—</td>
                                            </tr>
                                        ))
                                    ) : !indexLoading && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">
                                                No stocks found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Stock Chart Modal */}
            {selectedStock && (
                <StockChartModal
                    open={showChartModal}
                    onClose={() => setShowChartModal(false)}
                    symbol={selectedStock.symbol}
                    companyName={selectedStock.companyName}
                    industry={selectedStock.industry}
                    isin={selectedStock.isin}
                    exchange={activeIndexData?.exchange || 'NSE'}
                />
            )}
        </div>
    );
}
