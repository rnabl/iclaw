/**
 * Result Cache
 * 
 * Caches step outputs for workflow resumability and performance.
 */

export interface CacheEntry {
  key: string;
  value: any;
  createdAt: Date;
  expiresAt?: Date;
}

export class ResultCache {
  private cache: Map<string, CacheEntry> = new Map();

  constructor() {
    // Cleanup expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Save result to cache
   */
  async save(key: string, value: any, ttl?: number): Promise<void> {
    const entry: CacheEntry = {
      key,
      value,
      createdAt: new Date(),
      expiresAt: ttl ? new Date(Date.now() + ttl * 1000) : undefined
    };

    this.cache.set(key, entry);
  }

  /**
   * Get result from cache
   */
  async get(key: string): Promise<any | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = new Date();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      total: this.cache.size,
      expired: Array.from(this.cache.values()).filter(
        e => e.expiresAt && e.expiresAt < new Date()
      ).length
    };
  }
}

// Singleton instance
export const resultCache = new ResultCache();
