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
        {/* Title - First */}
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
          {blog.title}
        </h1>

        {/* Meta Information */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-600 mb-6">
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
          {blog.exclusive && (
            <Badge className="bg-purple-600 text-white">
              Exclusive
            </Badge>
          )}
        </div>

        {/* Cover Image - Second */}
        <div className="aspect-video relative overflow-hidden rounded-xl mb-8 bg-gray-200 shadow-lg">
          <OptimizedImage
            src={blog.imageUrl}
            alt={blog.title}
            lazy={false}
            aspectRatio="16/9"
            fallbackSrc="https://via.placeholder.com/1200x600?text=No+Image"
          />
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">

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
            className="blog-content text-gray-700 leading-relaxed prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />
          <style>{`
            .blog-content {
              font-size: 1.125rem;
              line-height: 1.875;
              word-wrap: break-word;
              overflow-wrap: break-word;
              max-width: 100%;
            }
            .blog-content p {
              margin-bottom: 1rem;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .blog-content h1 {
              font-size: 1.75rem;
              font-weight: 700;
              margin-top: 2rem;
              margin-bottom: 1rem;
              color: #111827;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .blog-content h2 {
              font-size: 1.5rem;
              font-weight: 600;
              margin-top: 1.75rem;
              margin-bottom: 0.75rem;
              color: #1f2937;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .blog-content h3 {
              font-size: 1.25rem;
              font-weight: 600;
              margin-top: 1.5rem;
              margin-bottom: 0.5rem;
              color: #374151;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .blog-content img {
              max-width: 100%;
              height: auto;
              border-radius: 0.75rem;
              margin: 1.5rem 0;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .blog-content a {
              color: #2563eb;
              text-decoration: underline;
              font-weight: 500;
            }
            .blog-content a:hover {
              color: #1d4ed8;
            }
            .blog-content ul,
            .blog-content ol {
              margin: 1rem 0;
              padding-left: 1.5rem;
            }
            .blog-content ul {
              list-style-type: disc;
            }
            .blog-content ol {
              list-style-type: decimal;
            }
            .blog-content li {
              margin-bottom: 0.5rem;
            }
            .blog-content strong {
              font-weight: 700;
              color: #111827;
            }
            .blog-content em {
              font-style: italic;
            }
            .blog-content u {
              text-decoration: underline;
            }
            .blog-content s {
              text-decoration: line-through;
            }
            .blog-content blockquote {
              border-left: 4px solid #e5e7eb;
              padding-left: 1rem;
              margin: 1.5rem 0;
              font-style: italic;
              color: #6b7280;
            }
            .blog-content .ql-align-center {
              text-align: center;
            }
            .blog-content .ql-align-right {
              text-align: right;
            }
            .blog-content .ql-align-justify {
              text-align: justify;
            }
            .blog-content .ql-indent-1 {
              padding-left: 3em;
            }
            .blog-content .ql-indent-2 {
              padding-left: 6em;
            }
          `}</style>
        </div>
      </article>
    </div>
  );
}

