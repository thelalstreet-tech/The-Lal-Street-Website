// client/src/types/blog.ts
export interface Blog {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  imagePublicId?: string;
  categories: string[];
  tags: string[];
  exclusive: boolean;
  author: string;
  views: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  formattedDate?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  slug: string;
  blogCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  blogCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlogFilters {
  category?: string;
  tags?: string[];
  exclusive?: boolean;
  search?: string;
  isPublished?: boolean;
  sortBy?: 'createdAt' | 'views';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  skip?: number;
}

export interface BlogListResponse {
  success: boolean;
  data: Blog[];
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}





