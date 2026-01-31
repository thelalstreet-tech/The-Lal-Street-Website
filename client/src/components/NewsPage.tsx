// client/src/components/NewsPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Clock, ExternalLink, RefreshCw, Filter, X, Newspaper, TrendingUp, Globe } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
    fetchNews,
    fetchNewsSources,
    fetchNewsCategories,
    formatRelativeTime,
    groupNewsByDate,
    type NewsArticle
} from '../services/newsService';

interface NewsPageProps {
    onNavigate?: (page: string) => void;
}

export function NewsPage({ onNavigate }: NewsPageProps) {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [sources, setSources] = useState<string[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedSource, setSelectedSource] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Load initial data
    useEffect(() => {
        const loadInitialData = async () => {
            const [sourcesData, categoriesData] = await Promise.all([
                fetchNewsSources(),
                fetchNewsCategories()
            ]);
            setSources(sourcesData);
            setCategories(categoriesData);
        };
        loadInitialData();
    }, []);

    // Load news
    const loadNews = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const result = await fetchNews({
                page,
                limit: 50,
                source: selectedSource || undefined,
                category: selectedCategory || undefined,
                search: debouncedSearch || undefined
            });

            if (result.success) {
                setNews(result.data);
                setTotalPages(result.pagination.totalPages);
            }
        } catch (error) {
            console.error('Error loading news:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [page, selectedSource, selectedCategory, debouncedSearch]);

    useEffect(() => {
        loadNews();
    }, [loadNews]);

    // Group news by date
    const groupedNews = useMemo(() => groupNewsByDate(news), [news]);

    // Clear filters
    const clearFilters = () => {
        setSearchQuery('');
        setSelectedSource('');
        setSelectedCategory('');
        setPage(1);
    };

    const hasFilters = searchQuery || selectedSource || selectedCategory;

    // Source colors for badges
    const getSourceColor = (source: string) => {
        const colors: Record<string, string> = {
            'Economic Times': 'bg-blue-100 text-blue-800',
            'Moneycontrol': 'bg-green-100 text-green-800',
            'LiveMint': 'bg-orange-100 text-orange-800',
            'NDTV Profit': 'bg-red-100 text-red-800',
            'Business Standard': 'bg-purple-100 text-purple-800',
            'The Hindu Business': 'bg-indigo-100 text-indigo-800',
            'Reuters': 'bg-yellow-100 text-yellow-800',
            'Finshots': 'bg-pink-100 text-pink-800'
        };
        return colors[source] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            {/* Header */}
            <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo & Nav */}
                        <div className="flex items-center gap-8">
                            <button
                                onClick={() => onNavigate?.('home')}
                                className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                                The Lal Street
                            </button>

                            <nav className="hidden md:flex items-center gap-6">
                                <button
                                    onClick={() => onNavigate?.('home')}
                                    className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                                >
                                    Home
                                </button>
                                <button
                                    onClick={() => onNavigate?.('blogs')}
                                    className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                                >
                                    Blogs
                                </button>
                                <button className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-1">
                                    News
                                </button>
                            </nav>
                        </div>

                        {/* Search & Filters */}
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-2 relative">
                                <Search className="absolute left-3 text-gray-400 w-4 h-4" />
                                <Input
                                    type="text"
                                    placeholder="Search news..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 w-56 text-sm"
                                />
                            </div>

                            <Select value={selectedSource || 'all'} onValueChange={(v) => setSelectedSource(v === 'all' ? '' : v)}>
                                <SelectTrigger className="w-36 text-sm h-9">
                                    <SelectValue placeholder="Source" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sources</SelectItem>
                                    {sources.map((source) => (
                                        <SelectItem key={source} value={source}>{source}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedCategory || 'all'} onValueChange={(v) => setSelectedCategory(v === 'all' ? '' : v)}>
                                <SelectTrigger className="w-32 text-sm h-9">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadNews(true)}
                                disabled={isRefreshing}
                                className="gap-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Refresh</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Active Filters */}
                {hasFilters && (
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <span className="text-sm text-gray-500">Filters:</span>
                        {selectedSource && (
                            <Badge variant="secondary" className="gap-1">
                                {selectedSource}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedSource('')} />
                            </Badge>
                        )}
                        {selectedCategory && (
                            <Badge variant="secondary" className="gap-1">
                                {selectedCategory}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory('')} />
                            </Badge>
                        )}
                        {searchQuery && (
                            <Badge variant="secondary" className="gap-1">
                                "{searchQuery}"
                                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                            </Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                            Clear all
                        </Button>
                    </div>
                )}

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-600">Loading news...</p>
                        </div>
                    </div>
                ) : news.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No news found</h3>
                        <p className="text-gray-600">
                            {hasFilters ? 'Try adjusting your filters' : 'News will appear here once fetched'}
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {Array.from(groupedNews.entries()).map(([dateGroup, articles]) => (
                            <div key={dateGroup}>
                                {/* Date Header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900">{dateGroup}</h2>
                                    <div className="flex-1 h-px bg-gray-200" />
                                    <span className="text-sm text-gray-500">{articles.length} articles</span>
                                </div>

                                {/* News List */}
                                <div className="space-y-3">
                                    {articles.map((article) => (
                                        <a
                                            key={article._id}
                                            href={article.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group block bg-white rounded-lg border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-200 overflow-hidden"
                                        >
                                            <div className="flex">
                                                {/* Image (if available) */}
                                                {article.imageUrl && (
                                                    <div className="hidden sm:block w-32 h-24 flex-shrink-0 bg-gray-100">
                                                        <img
                                                            src={article.imageUrl}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                {/* Content */}
                                                <div className="flex-1 p-4">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            {/* Title */}
                                                            <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                                                                {article.title}
                                                            </h3>

                                                            {/* Description */}
                                                            {article.description && (
                                                                <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                                                                    {article.description}
                                                                </p>
                                                            )}

                                                            {/* Meta */}
                                                            <div className="flex items-center gap-3 flex-wrap">
                                                                <Badge className={`text-xs px-2 py-0.5 ${getSourceColor(article.source)}`}>
                                                                    {article.source}
                                                                </Badge>
                                                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                                                    <Clock className="w-3 h-3" />
                                                                    {formatRelativeTime(article.publishedAt)}
                                                                </span>
                                                                {article.category && article.category !== 'General' && (
                                                                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                                                                        {article.category}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* External Link Icon */}
                                                        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-1" />
                                                    </div>
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-8">
                        <Button
                            variant="outline"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
