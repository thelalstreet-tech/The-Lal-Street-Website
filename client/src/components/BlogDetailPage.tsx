// client/src/components/BlogDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Eye, Tag as TagIcon, User } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { fetchBlogById } from '../services/blogsService';
import type { Blog } from '../types/blog';
import { OptimizedImage } from './OptimizedImage';

interface BlogDetailPageProps {
  blogId: string;
  onNavigate?: (page: string) => void;
}

export function BlogDetailPage({ blogId, onNavigate }: BlogDetailPageProps) {
  const [blog, setBlog] = useState<Blog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBlog = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const blogData = await fetchBlogById(blogId);
        setBlog(blogData);
      } catch (err: any) {
        setError(err.message || 'Failed to load blog');
      } finally {
        setIsLoading(false);
      }
    };

    if (blogId) {
      loadBlog();
    }
  }, [blogId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Helper to parse and clean categories/tags
  const parseArray = (value: string | string[] | undefined): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        const cleaned = value
          .replace(/^\[|\]$/g, '')
          .replace(/["\\]/g, '')
          .split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0 && !item.match(/^[\[\]]+$/));
        return cleaned;
      }
    }
    return [];
  };

  const cleanString = (str: string): string => {
    return str.replace(/[\[\]"\\]/g, '').trim();
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('blogs');
    } else {
      window.location.hash = '#blogs';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading blog...</p>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Blog Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The blog you are looking for does not exist.'}</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blogs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            onClick={handleBack}
            variant="ghost"
            className="gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blogs
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Image */}
        <div className="aspect-video relative overflow-hidden rounded-xl mb-8 bg-gray-200 shadow-lg">
          <OptimizedImage
            src={blog.imageUrl}
            alt={blog.title}
            lazy={false}
            aspectRatio="16/9"
            fallbackSrc="https://via.placeholder.com/1200x600?text=No+Image"
          />
          {blog.exclusive && (
            <Badge className="absolute top-4 right-4 bg-purple-600 text-white">
              Exclusive
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {blog.title}
          </h1>

          {/* Meta Information */}
          <div className="flex items-center gap-6 text-sm text-gray-600 mb-6 pb-6 border-b border-gray-200">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatDate(blog.createdAt)}
            </span>
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {blog.views || 0} views
            </span>
            {blog.author && (
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {blog.author}
              </span>
            )}
          </div>

          {/* Categories and Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {parseArray(blog.categories).map((cat) => {
              const cleanCat = typeof cat === 'string' ? cleanString(cat) : cat;
              if (!cleanCat) return null;
              return (
                <Badge key={cleanCat} variant="secondary" className="text-sm px-3 py-1">
                  {cleanCat}
                </Badge>
              );
            })}
            {parseArray(blog.tags).map((tag) => {
              const cleanTag = typeof tag === 'string' ? cleanString(tag) : tag;
              if (!cleanTag) return null;
              return (
                <Badge key={cleanTag} variant="outline" className="text-sm px-3 py-1 gap-1">
                  <TagIcon className="w-3 h-3" />
                  {cleanTag}
                </Badge>
              );
            })}
          </div>

          {/* Blog Content */}
          <div
            className="blog-content text-gray-700 leading-relaxed space-y-4 prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: blog.content }}
            style={{
              fontSize: '1.125rem',
              lineHeight: '1.75rem',
            }}
          />
        </div>
      </article>
    </div>
  );
}

