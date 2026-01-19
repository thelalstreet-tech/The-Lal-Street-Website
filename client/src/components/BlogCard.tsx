// client/src/components/BlogCard.tsx
import React, { memo } from 'react';
import { Calendar, Eye, ArrowRight } from 'lucide-react';
import { Badge } from './ui/badge';
import { OptimizedImage } from './OptimizedImage';
import type { Blog } from '../types/blog';

interface BlogCardProps {
  blog: Blog;
  onClick: (blog: Blog) => void;
  parseArray: (value: string | string[] | undefined) => string[];
  truncateText: (text: string, maxLength: number) => string;
  formatDateShort: (dateString: string) => string;
}

export const BlogCard = memo(function BlogCard({
  blog,
  onClick,
  parseArray,
  truncateText,
  formatDateShort,
}: BlogCardProps) {
  const cleanString = (str: string): string => {
    return str.replace(/[\[\]"\\]/g, '').trim();
  };

  return (
    <article
      onClick={() => onClick(blog)}
      className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100"
    >
      <div className="relative h-40 overflow-hidden bg-gray-200">
        {blog.imageUrl ? (
          <OptimizedImage
            src={blog.imageUrl}
            alt={blog.title || 'Blog image'}
            lazy={true}
            className="group-hover:scale-110 transition-transform duration-500"
            fallbackSrc="https://via.placeholder.com/600x300?text=No+Image"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {blog.exclusive && (
          <Badge className="absolute top-3 right-3 bg-purple-600 text-white">
            Exclusive
          </Badge>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-2">
          {parseArray(blog.categories).slice(0, 2).map((cat) => {
            const cleanCat = typeof cat === 'string' ? cleanString(cat) : cat;
            if (!cleanCat) return null;
            return (
              <Badge key={cleanCat} variant="secondary" className="text-xs px-2 py-0.5">
                {cleanCat}
              </Badge>
            );
          })}
        </div>
        
        <h3 className="text-base font-bold text-gray-900 mb-1.5 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
          {blog.title || 'Untitled'}
        </h3>
        
        <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">
          {blog.content ? truncateText(blog.content.replace(/<[^>]*>/g, ''), 100) : 'No content available'}
        </p>
        
        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDateShort(blog.createdAt || '')}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {blog.views || 0}
            </span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </article>
  );
});




