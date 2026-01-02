// client/src/components/BlogsPage.tsx
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Search, Calendar, Eye, Tag as TagIcon, Filter, X, BookOpen, TrendingUp, Home, User, ArrowRight, Grid, FileText, Users, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Blog, Category, Tag } from '../types/blog';
import { fetchBlogs, fetchCategories, fetchTags } from '../services/blogsService';
import { OptimizedImage } from './OptimizedImage';
import { BlogCard } from './BlogCard';

interface BlogsPageProps {
  onNavigate?: (page: string, blogId?: string) => void;
}

export function BlogsPage({ onNavigate }: BlogsPageProps) {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'createdAt' | 'views'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadInitialData = useCallback(async () => {
    try {
      const [categoriesData, tagsData] = await Promise.all([
        fetchCategories(),
        fetchTags(),
      ]);
      setCategories(categoriesData);
      setTags(tagsData);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }, []);

  const loadBlogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters = {
        search: debouncedSearchQuery || undefined,
        category: selectedCategory || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        sortBy,
        sortOrder,
        isPublished: true,
        limit: 20, // Reduced for better initial load performance
      };

      const result = await fetchBlogs(filters);
      if (result && result.data) {
        setBlogs(result.data);
      } else {
        setBlogs([]);
      }
    } catch (error) {
      console.error('Error loading blogs:', error);
      setBlogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchQuery, selectedCategory, selectedTags, sortBy, sortOrder]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedTags([]);
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  const handleBlogClick = (blog: Blog) => {
    if (onNavigate) {
      onNavigate('blog-detail', blog.id);
    } else {
      window.location.hash = `#blog-detail?id=${blog.id}`;
    }
  };

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const formatDateShort = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return formatDate(dateString);
  }, [formatDate]);

  const truncateText = useCallback((text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }, []);

  // Helper to parse categories/tags that might be strings or arrays
  const parseArray = useCallback((value: string | string[] | undefined): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // If not JSON, try to clean up string representation
        // Remove brackets, quotes, and backslashes, then split
        const cleaned = value
          .replace(/^\[|\]$/g, '') // Remove outer brackets
          .replace(/["\\]/g, '') // Remove quotes and backslashes
          .split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0 && !item.match(/^[\[\]]+$/)); // Filter out pure brackets
        return cleaned;
      }
    }
    return [];
  }, []);

  // Get featured blog (latest or most viewed)
  const featuredBlog = useMemo(() => {
    if (!blogs || blogs.length === 0) return null;
    return blogs[0]; // Latest blog
  }, [blogs]);

  // Get other blogs (excluding featured)
  const otherBlogs = useMemo(() => {
    if (!blogs || blogs.length === 0) return [];
    return blogs.slice(1);
  }, [blogs]);

  // Get most popular blogs (top 5 by views)
  const popularBlogs = useMemo(() => {
    if (!blogs || blogs.length === 0) return [];
    return [...blogs]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5);
  }, [blogs]);

  // Get trending tags (top 10 by blog count)
  const trendingTags = useMemo(() => {
    if (!tags || tags.length === 0) return [];
    return tags
      .sort((a, b) => (b.blogCount || 0) - (a.blogCount || 0))
      .slice(0, 10);
  }, [tags]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header Navigation */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <button
                onClick={() => onNavigate?.('home')}
                className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
              >
                The Lal Street
              </button>
              
              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-6">
                <button
                  onClick={() => onNavigate?.('home')}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors border-b-2 border-transparent hover:border-blue-600 pb-1"
                >
                  Home
                </button>
                <button className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors border-b-2 border-blue-600 pb-1">
                  Blogs
                </button>
                <button className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors border-b-2 border-transparent hover:border-blue-600 pb-1">
                  Community
                </button>
              </nav>
            </div>

            {/* Search and Actions */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 relative">
                <Search className="absolute left-3 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-56 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </div>
              <Select value={selectedCategory || 'all'} onValueChange={(value) => setSelectedCategory(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-40 border-gray-300 text-sm h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: 'createdAt' | 'views') => setSortBy(value)}>
                <SelectTrigger className="w-32 border-gray-300 text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Latest</SelectItem>
                  <SelectItem value="views">Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Filters moved to header - no secondary navbar */}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Categories */}
          <aside className="lg:col-span-2 hidden lg:block">
            <div className="sticky top-24">
              <Card className="p-4 bg-white/80 backdrop-blur-sm border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
                <nav className="space-y-1.5">
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                    }}
                    className={`w-full flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      !selectedCategory
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.name);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        selectedCategory === cat.name
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex-1 text-left truncate">{cat.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({cat.blogCount})</span>
                    </button>
                  ))}
                </nav>
              </Card>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="lg:col-span-7 space-y-6">
            {/* Featured Hero Section */}
            {featuredBlog && (
              <article
                onClick={() => handleBlogClick(featuredBlog)}
                className="group relative h-[400px] rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="absolute inset-0">
                  {featuredBlog.imageUrl ? (
                    <OptimizedImage
                      src={featuredBlog.imageUrl}
                      alt={featuredBlog.title || 'Featured blog'}
                      lazy={false}
                      className="group-hover:scale-110 transition-transform duration-700"
                      fallbackSrc="https://via.placeholder.com/1200x400?text=No+Image"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    {parseArray(featuredBlog.categories).slice(0, 2).map((cat) => {
                      const cleanCat = typeof cat === 'string' ? cat.replace(/[\[\]"\\]/g, '').trim() : cat;
                      if (!cleanCat) return null;
                      return (
                        <Badge key={cleanCat} className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs px-2 py-0.5">
                          {cleanCat}
                        </Badge>
                      );
                    })}
                    {featuredBlog.exclusive && (
                      <Badge className="bg-purple-600 text-white text-xs px-2 py-0.5">Exclusive</Badge>
                    )}
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-2 leading-tight group-hover:text-blue-300 transition-colors">
                    {featuredBlog.title || 'Featured Article'}
                  </h2>
                  
                  <p className="text-sm text-white/90 mb-4 line-clamp-2">
                    {featuredBlog.content ? truncateText(featuredBlog.content.replace(/<[^>]*>/g, ''), 100) : ''}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-white/80">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{featuredBlog.author || 'The Lal Street'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDateShort(featuredBlog.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{featuredBlog.views || 0}</span>
                      </div>
                    </div>
                    <Button size="sm" className="bg-white text-gray-900 hover:bg-blue-50 gap-1 text-xs h-8">
                      Read More
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </article>
            )}

            {/* Blog Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading blogs...</p>
                </div>
              </div>
            ) : otherBlogs.length === 0 && !featuredBlog ? (
              <Card className="p-12 text-center bg-white/80 backdrop-blur-sm">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No blogs found</h3>
                <p className="text-gray-600">
                  {searchQuery || selectedCategory || selectedTags.length > 0
                    ? 'Try adjusting your filters'
                    : 'Check back soon for new content'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {otherBlogs.map((blog) => (
                  <BlogCard
                    key={blog.id}
                    blog={blog}
                    onClick={handleBlogClick}
                    parseArray={parseArray}
                    truncateText={truncateText}
                    formatDateShort={formatDateShort}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <aside className="lg:col-span-3 space-y-6">
            {/* Most Popular */}
            {popularBlogs.length > 0 && (
              <Card className="p-4 bg-white/80 backdrop-blur-sm border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Most Popular</h3>
                </div>
                <div className="space-y-3">
                  {popularBlogs.map((blog, index) => (
                    <button
                      key={blog.id}
                      onClick={() => handleBlogClick(blog)}
                      className="w-full flex gap-3 text-left hover:bg-gray-50 p-2 rounded-md transition-colors group"
                    >
                      <span className="text-xl font-bold text-gray-300 group-hover:text-blue-600 transition-colors flex-shrink-0 leading-none">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <p className="text-xs font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors flex-1 leading-snug">
                        {blog.title}
                      </p>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Trending Tags */}
            {trendingTags.length > 0 && (
              <Card className="p-4 bg-white/80 backdrop-blur-sm border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <TagIcon className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Trending Tags</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {trendingTags.map((tag) => {
                    const cleanTagName = typeof tag.name === 'string' 
                      ? tag.name.replace(/[\[\]"\\]/g, '').trim() 
                      : tag.name;
                    if (!cleanTagName) return null;
                    return (
                      <button
                        key={tag.id}
                        onClick={() => handleTagToggle(cleanTagName)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                          selectedTags.includes(cleanTagName)
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cleanTagName}
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
