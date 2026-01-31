// client/src/services/newsService.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface NewsArticle {
    _id: string;
    title: string;
    link: string;
    description: string;
    source: string;
    sourceUrl: string;
    imageUrl: string | null;
    category: string;
    publishedAt: string;
    createdAt: string;
}

export interface NewsResponse {
    success: boolean;
    data: NewsArticle[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface NewsFilters {
    page?: number;
    limit?: number;
    source?: string;
    category?: string;
    search?: string;
}

// Fetch news with filters
export async function fetchNews(filters: NewsFilters = {}): Promise<NewsResponse> {
    try {
        const params = new URLSearchParams();

        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.source) params.append('source', filters.source);
        if (filters.category) params.append('category', filters.category);
        if (filters.search) params.append('search', filters.search);

        const response = await axios.get(`${API_URL}/api/news?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching news:', error);
        return {
            success: false,
            data: [],
            pagination: { total: 0, page: 1, limit: 30, totalPages: 0 }
        };
    }
}

// Fetch available sources
export async function fetchNewsSources(): Promise<string[]> {
    try {
        const response = await axios.get(`${API_URL}/api/news/sources`);
        return response.data.data || [];
    } catch (error) {
        console.error('Error fetching sources:', error);
        return [];
    }
}

// Fetch available categories
export async function fetchNewsCategories(): Promise<string[]> {
    try {
        const response = await axios.get(`${API_URL}/api/news/categories`);
        return response.data.data || [];
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
}

// Format relative time
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// Group news by date
export function groupNewsByDate(news: NewsArticle[]): Map<string, NewsArticle[]> {
    const groups = new Map<string, NewsArticle[]>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const article of news) {
        const articleDate = new Date(article.publishedAt);
        articleDate.setHours(0, 0, 0, 0);

        let groupKey: string;
        if (articleDate.getTime() === today.getTime()) {
            groupKey = 'Today';
        } else if (articleDate.getTime() === yesterday.getTime()) {
            groupKey = 'Yesterday';
        } else {
            groupKey = articleDate.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
        }

        if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(article);
    }

    return groups;
}
