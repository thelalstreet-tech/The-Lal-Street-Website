// client/src/data/suggestedBuckets.ts
// This file is now a wrapper for backward compatibility
// All actual operations are handled by suggestedBucketsService.ts
import type { SuggestedBucket } from '../types/suggestedBucket';
import {
  fetchSuggestedBuckets,
  createSuggestedBucket,
  updateSuggestedBucket as updateBucketAPI,
  deleteSuggestedBucket as deleteBucketAPI,
} from '../services/suggestedBucketsService';

// In-memory cache to avoid repeated API calls
let cachedBuckets: SuggestedBucket[] = [];
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the cache timestamp (for checking cache age)
 */
export function getCacheTimestamp(): number {
  return cacheTimestamp;
}

/**
 * Check if cache is still valid
 */
export function isCacheValid(): boolean {
  const now = Date.now();
  return cachedBuckets.length > 0 && (now - cacheTimestamp) < CACHE_TTL;
}

/**
 * Load suggested buckets from server
 * Uses cache to reduce API calls
 * @param activeOnly - If true, returns only active buckets
 * @returns Promise array of suggested buckets
 */
export async function loadSuggestedBuckets(activeOnly: boolean = false): Promise<SuggestedBucket[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedBuckets.length > 0 && (now - cacheTimestamp) < CACHE_TTL) {
    if (activeOnly) {
      return cachedBuckets.filter(b => b.isActive);
    }
    return cachedBuckets;
  }
  
  // Fetch from server
  try {
    cachedBuckets = await fetchSuggestedBuckets(false);
    cacheTimestamp = now;
    
    if (activeOnly) {
      return cachedBuckets.filter(b => b.isActive);
    }
    return cachedBuckets;
  } catch (error) {
    // Return cached data even if expired, as fallback
    if (cachedBuckets.length > 0) {
      if (activeOnly) {
        return cachedBuckets.filter(b => b.isActive);
      }
      return cachedBuckets;
    }
    return [];
  }
}

/**
 * Save suggested buckets (for admin) - now calls API
 */
export async function saveSuggestedBuckets(buckets: SuggestedBucket[]): Promise<void> {
  // This is now handled by individual create/update/delete functions
  // Keeping for backward compatibility but it's a no-op
  cachedBuckets = buckets;
  cacheTimestamp = Date.now();
}

/**
 * Add a new suggested bucket - now calls API
 */
export async function addSuggestedBucket(bucket: SuggestedBucket): Promise<SuggestedBucket> {
  try {
    // Remove id, createdAt, updatedAt as API will generate these
    const { id, createdAt, updatedAt, ...bucketData } = bucket;
    const created = await createSuggestedBucket(bucketData);
    // Clear cache to force refresh on next load
    cachedBuckets = [];
    cacheTimestamp = 0;
    return created;
  } catch (error) {
    throw error;
  }
}

/**
 * Update an existing suggested bucket - now calls API
 */
export async function updateSuggestedBucket(bucketId: string, updates: Partial<SuggestedBucket>): Promise<void> {
  try {
    await updateBucketAPI(bucketId, updates);
    // Clear cache to force refresh on next load
    cachedBuckets = [];
    cacheTimestamp = 0;
  } catch (error) {
    throw error;
  }
}

/**
 * Delete a suggested bucket - now calls API
 */
export async function deleteSuggestedBucket(bucketId: string): Promise<void> {
  try {
    await deleteBucketAPI(bucketId);
    // Clear cache to force refresh on next load
    cachedBuckets = [];
    cacheTimestamp = 0;
  } catch (error) {
    throw error;
  }
}

