// client/src/components/BlogDetailModal.tsx
import React from 'react';
import { X, Calendar, Eye, Tag as TagIcon } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { Badge } from './ui/badge';
import type { Blog } from '../types/blog';

interface BlogDetailModalProps {
  blog: Blog;
  open: boolean;
  onClose: () => void;
}

export function BlogDetailModal({ blog, open, onClose }: BlogDetailModalProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Helper to parse categories/tags that might be strings or arrays
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
          .replace(/"/g, '')
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-0 right-0 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Image */}
          <div className="aspect-video relative overflow-hidden rounded-lg mb-6 bg-gray-200">
            <img
              src={blog.imageUrl}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
            {blog.exclusive && (
              <Badge className="absolute top-4 right-4 bg-purple-600">
                Exclusive
              </Badge>
            )}
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{blog.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(blog.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {blog.views} views
                </span>
                {blog.author && (
                  <span className="text-gray-700 font-medium">By {blog.author}</span>
                )}
              </div>
            </div>

            {/* Categories and Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {parseArray(blog.categories).map((cat) => {
                const cleanCat = typeof cat === 'string' ? cleanString(cat) : cat;
                if (!cleanCat) return null;
                return (
                  <Badge key={cleanCat} variant="secondary">
                    {cleanCat}
                  </Badge>
                );
              })}
              {parseArray(blog.tags).map((tag) => {
                const cleanTag = typeof tag === 'string' ? cleanString(tag) : tag;
                if (!cleanTag) return null;
                return (
                  <Badge key={cleanTag} variant="outline" className="gap-1">
                    <TagIcon className="w-3 h-3" />
                    {cleanTag}
                  </Badge>
                );
              })}
            </div>

            {/* Blog Content */}
            <div
              className="blog-content text-gray-700 leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{ __html: blog.content }}
              style={{
                fontSize: '1.125rem',
                lineHeight: '1.75rem',
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

