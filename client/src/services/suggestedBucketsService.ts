// client/src/services/suggestedBucketsService.ts
import { API_ENDPOINTS } from '../config/api';
import type { SuggestedBucket } from '../types/suggestedBucket';
import { getAdminToken } from '../hooks/useAuth';

/**
 * Get all suggested buckets from the server
 * @param activeOnly - If true, returns only active buckets
 */
export async function fetchSuggestedBuckets(activeOnly: boolean = false): Promise<SuggestedBucket[]> {
  try {
    const url = `${API_ENDPOINTS.SUGGESTED_BUCKETS}?activeOnly=${activeOnly}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch suggested buckets: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching suggested buckets:', error);
    // Return empty array on error to prevent crashes
    return [];
  }
}

/**
 * Get a single suggested bucket by ID
 */
export async function fetchSuggestedBucketById(id: string): Promise<SuggestedBucket | null> {
  try {
    const url = `${API_ENDPOINTS.SUGGESTED_BUCKETS}/${id}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch suggested bucket: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error('Error fetching suggested bucket:', error);
    return null;
  }
}

/**
 * Create a new suggested bucket (admin only)
 */
export async function createSuggestedBucket(bucketData: Omit<SuggestedBucket, 'id' | 'createdAt' | 'updatedAt'>): Promise<SuggestedBucket> {
  const token = getAdminToken();
  if (!token) {
    throw new Error('Admin authentication required');
  }
  
  try {
    const response = await fetch(API_ENDPOINTS.SUGGESTED_BUCKETS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(bucketData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to create suggested bucket: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error creating suggested bucket:', error);
    throw error;
  }
}

/**
 * Update an existing suggested bucket (admin only)
 */
export async function updateSuggestedBucket(id: string, updates: Partial<SuggestedBucket>): Promise<SuggestedBucket> {
  const token = getAdminToken();
  if (!token) {
    throw new Error('Admin authentication required');
  }
  
  try {
    const response = await fetch(`${API_ENDPOINTS.SUGGESTED_BUCKETS}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to update suggested bucket: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error updating suggested bucket:', error);
    throw error;
  }
}

/**
 * Delete a suggested bucket (admin only)
 */
export async function deleteSuggestedBucket(id: string): Promise<void> {
  const token = getAdminToken();
  if (!token) {
    throw new Error('Admin authentication required');
  }
  
  try {
    const response = await fetch(`${API_ENDPOINTS.SUGGESTED_BUCKETS}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to delete suggested bucket: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting suggested bucket:', error);
    throw error;
  }
}

