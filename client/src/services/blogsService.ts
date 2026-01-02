// client/src/services/blogsService.ts
import { API_ENDPOINTS } from '../config/api';
import type { Blog, Category, Tag, BlogFilters, BlogListResponse } from '../types/blog';
import { getAdminToken } from '../hooks/useAuth';

/**
 * Build query string from filters
 */
function buildQueryString(filters: BlogFilters): string {
  const params = new URLSearchParams();
  
  if (filters.category) params.append('category', filters.category);
  if (filters.tags && filters.tags.length > 0) {
    filters.tags.forEach(tag => params.append('tags', tag));
  }
  if (filters.exclusive !== undefined) params.append('exclusive', String(filters.exclusive));
  if (filters.search) params.append('search', filters.search);
  if (filters.isPublished !== undefined) params.append('isPublished', String(filters.isPublished));
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.skip) params.append('skip', String(filters.skip));
  
  return params.toString();
}

/**
 * Get all blogs with optional filters
 */
export async function fetchBlogs(filters: BlogFilters = {}): Promise<BlogListResponse> {
  try {
    const queryString = buildQueryString(filters);
    const url = `${API_ENDPOINTS.BLOGS}${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch blogs: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return {
      success: false,
      data: [],
      pagination: {
        total: 0,
        limit: 50,
        skip: 0,
        hasMore: false,
      },
    };
  }
}

/**
 * Get a single blog by ID
 */
export async function fetchBlogById(id: string): Promise<Blog | null> {
  try {
    const url = `${API_ENDPOINTS.BLOGS}/${id}`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch blog: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error('Error fetching blog:', error);
    return null;
  }
}

/**
 * Get all categories
 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const url = `${API_ENDPOINTS.BLOGS}/categories/all`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Get all tags
 */
export async function fetchTags(): Promise<Tag[]> {
  try {
    const url = `${API_ENDPOINTS.BLOGS}/tags/all`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tags: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
}

/**
 * Create a new blog (admin only)
 */
export async function createBlog(blogData: {
  title: string;
  content: string;
  image?: File;
  imageUrl?: string;
  categories: string[];
  tags: string[];
  exclusive: boolean;
  author?: string;
  isPublished?: boolean;
}): Promise<Blog> {
  const token = getAdminToken();
  if (!token) {
    throw new Error('Admin authentication required');
  }
  
  try {
    const formData = new FormData();
    formData.append('title', blogData.title);
    formData.append('content', blogData.content);
    
    if (blogData.image) {
      formData.append('image', blogData.image);
    } else if (blogData.imageUrl) {
      formData.append('imageUrl', blogData.imageUrl);
    }
    
    if (blogData.categories.length > 0) {
      formData.append('categories', JSON.stringify(blogData.categories));
    }
    if (blogData.tags.length > 0) {
      formData.append('tags', JSON.stringify(blogData.tags));
    }
    
    formData.append('exclusive', String(blogData.exclusive));
    if (blogData.author) {
      formData.append('author', blogData.author);
    }
    if (blogData.isPublished !== undefined) {
      formData.append('isPublished', String(blogData.isPublished));
    }
    
    const response = await fetch(API_ENDPOINTS.BLOGS, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to create blog: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error creating blog:', error);
    throw error;
  }
}

/**
 * Update an existing blog (admin only)
 */
export async function updateBlog(
  id: string,
  updates: {
    title?: string;
    content?: string;
    image?: File;
    imageUrl?: string;
    categories?: string[];
    tags?: string[];
    exclusive?: boolean;
    author?: string;
    isPublished?: boolean;
  }
): Promise<Blog> {
  const token = getAdminToken();
  if (!token) {
    throw new Error('Admin authentication required');
  }
  
  try {
    const formData = new FormData();
    
    if (updates.title) formData.append('title', updates.title);
    if (updates.content) formData.append('content', updates.content);
    
    if (updates.image) {
      formData.append('image', updates.image);
    } else if (updates.imageUrl) {
      formData.append('imageUrl', updates.imageUrl);
    }
    
    if (updates.categories) {
      formData.append('categories', JSON.stringify(updates.categories));
    }
    if (updates.tags) {
      formData.append('tags', JSON.stringify(updates.tags));
    }
    
    if (updates.exclusive !== undefined) {
      formData.append('exclusive', String(updates.exclusive));
    }
    if (updates.author) {
      formData.append('author', updates.author);
    }
    if (updates.isPublished !== undefined) {
      formData.append('isPublished', String(updates.isPublished));
    }
    
    const response = await fetch(`${API_ENDPOINTS.BLOGS}/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to update blog: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error updating blog:', error);
    throw error;
  }
}

/**
 * Delete a blog (admin only)
 */
export async function deleteBlog(id: string): Promise<void> {
  const token = getAdminToken();
  if (!token) {
    throw new Error('Admin authentication required');
  }
  
  try {
    const response = await fetch(`${API_ENDPOINTS.BLOGS}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to delete blog: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting blog:', error);
    throw error;
  }
}



