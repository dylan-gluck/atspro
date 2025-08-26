import { createHash } from 'crypto';

interface CacheEntry<T> {
	value: T;
	timestamp: number;
	accessCount: number;
	lastAccessed: number;
}

interface CacheOptions {
	maxSize?: number;
	ttl?: number; // Time to live in milliseconds
	enableMetrics?: boolean;
}

interface CacheMetrics {
	hits: number;
	misses: number;
	evictions: number;
	totalRequests: number;
	hitRate: number;
	avgAccessTime: number;
}

export class LRUCache<T = any> {
	private cache: Map<string, CacheEntry<T>>;
	private readonly maxSize: number;
	private readonly ttl: number;
	private readonly enableMetrics: boolean;
	private metrics: CacheMetrics;
	private accessTimes: number[] = [];

	constructor(options: CacheOptions = {}) {
		this.maxSize = options.maxSize || 100;
		this.ttl = options.ttl || 3600000; // 1 hour default
		this.enableMetrics = options.enableMetrics ?? true;
		this.cache = new Map();
		this.metrics = {
			hits: 0,
			misses: 0,
			evictions: 0,
			totalRequests: 0,
			hitRate: 0,
			avgAccessTime: 0
		};
	}

	private generateKey(params: any): string {
		const normalized = JSON.stringify(params, Object.keys(params).sort());
		return createHash('sha256').update(normalized).digest('hex');
	}

	get(params: any): T | null {
		const startTime = Date.now();
		const key = this.generateKey(params);
		const entry = this.cache.get(key);

		this.metrics.totalRequests++;

		if (!entry) {
			this.metrics.misses++;
			this.updateMetrics(Date.now() - startTime);
			return null;
		}

		// Check TTL
		if (Date.now() - entry.timestamp > this.ttl) {
			this.cache.delete(key);
			this.metrics.misses++;
			this.updateMetrics(Date.now() - startTime);
			return null;
		}

		// Update access info
		entry.accessCount++;
		entry.lastAccessed = Date.now();

		// Move to front (most recently used)
		this.cache.delete(key);
		this.cache.set(key, entry);

		this.metrics.hits++;
		this.updateMetrics(Date.now() - startTime);

		return entry.value;
	}

	set(params: any, value: T): void {
		const key = this.generateKey(params);

		// Check if we need to evict
		if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
			// Evict least recently used (first item in map)
			const firstKey = this.cache.keys().next().value;
			if (firstKey) {
				this.cache.delete(firstKey);
				this.metrics.evictions++;
			}
		}

		const entry: CacheEntry<T> = {
			value,
			timestamp: Date.now(),
			accessCount: 0,
			lastAccessed: Date.now()
		};

		this.cache.set(key, entry);
	}

	has(params: any): boolean {
		const key = this.generateKey(params);
		const entry = this.cache.get(key);

		if (!entry) return false;

		// Check TTL
		if (Date.now() - entry.timestamp > this.ttl) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	clear(): void {
		this.cache.clear();
		this.resetMetrics();
	}

	size(): number {
		return this.cache.size;
	}

	private updateMetrics(accessTime: number): void {
		if (!this.enableMetrics) return;

		this.accessTimes.push(accessTime);
		if (this.accessTimes.length > 1000) {
			this.accessTimes = this.accessTimes.slice(-500);
		}

		this.metrics.hitRate =
			this.metrics.totalRequests > 0 ? this.metrics.hits / this.metrics.totalRequests : 0;

		this.metrics.avgAccessTime =
			this.accessTimes.length > 0
				? this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length
				: 0;
	}

	private resetMetrics(): void {
		this.metrics = {
			hits: 0,
			misses: 0,
			evictions: 0,
			totalRequests: 0,
			hitRate: 0,
			avgAccessTime: 0
		};
		this.accessTimes = [];
	}

	getMetrics(): CacheMetrics {
		return { ...this.metrics };
	}

	// Get cache statistics
	getStats() {
		const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
			key: key.substring(0, 8) + '...',
			accessCount: entry.accessCount,
			age: Math.floor((Date.now() - entry.timestamp) / 1000) + 's',
			lastAccessed: Math.floor((Date.now() - entry.lastAccessed) / 1000) + 's ago'
		}));

		return {
			size: this.cache.size,
			maxSize: this.maxSize,
			ttl: this.ttl / 1000 + 's',
			metrics: this.getMetrics(),
			entries: entries.slice(0, 10) // Top 10 entries
		};
	}
}

// Singleton cache instances for different AI operations
export const resumeCache = new LRUCache({
	maxSize: 50,
	ttl: 3600000, // 1 hour
	enableMetrics: true
});

export const jobCache = new LRUCache({
	maxSize: 100,
	ttl: 7200000, // 2 hours
	enableMetrics: true
});

export const optimizationCache = new LRUCache({
	maxSize: 30,
	ttl: 1800000, // 30 minutes
	enableMetrics: true
});

export const coverLetterCache = new LRUCache({
	maxSize: 20,
	ttl: 1800000, // 30 minutes
	enableMetrics: true
});

// Helper to get cache statistics
export function getCacheStats() {
	return {
		resume: resumeCache.getStats(),
		job: jobCache.getStats(),
		optimization: optimizationCache.getStats(),
		coverLetter: coverLetterCache.getStats()
	};
}

// Helper to clear all caches
export function clearAllCaches() {
	resumeCache.clear();
	jobCache.clear();
	optimizationCache.clear();
	coverLetterCache.clear();
}
