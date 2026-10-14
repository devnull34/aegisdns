import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MajesticStatus } from '../types/blocklist';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
export const MAJESTIC_MILLION_URL = 'https://downloads.majestic.com/majestic_million.csv';
const DEFAULT_INTERVAL_DAYS = 7; // Default: Weekly update
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check hourly if weekly update is due

export class MajesticManager {
  private primaryCachePath: string;
  private seedCachePath: string;
  private statusFilePath: string;
  private domains: string[] = [];
  private isUpdating: boolean = false;
  private lastUpdated: string | null = null;
  private nextUpdateDue: string | null = null;
  private updateIntervalDays: number = DEFAULT_INTERVAL_DAYS;
  private lastError: string | null = null;
  private source: 'bundled_software_cache' | 'live_weekly_sync' = 'bundled_software_cache';
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    const projectRoot = path.resolve(__dirname, '../../');
    this.primaryCachePath = path.resolve(projectRoot, 'data', 'majestic_million.csv');
    this.seedCachePath = path.resolve(__dirname, 'data', 'majestic_million.csv');
    this.statusFilePath = path.resolve(projectRoot, 'data', 'majestic_status.json');

    // Ensure data directory exists
    const dataDir = path.dirname(this.primaryCachePath);
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }

    this.loadInitialStatus();
    this.loadLocalCache();
    this.startWeeklyScheduler();
  }

  private loadInitialStatus() {
    try {
      if (fs.existsSync(this.statusFilePath)) {
        const raw = fs.readFileSync(this.statusFilePath, 'utf8');
        const data = JSON.parse(raw);
        if (data.lastUpdated) this.lastUpdated = data.lastUpdated;
        if (data.nextUpdateDue) this.nextUpdateDue = data.nextUpdateDue;
        if (data.updateIntervalDays) this.updateIntervalDays = data.updateIntervalDays;
        if (data.source) this.source = data.source;
      }
    } catch (err) {
      console.warn('[MajesticManager] Failed to read majestic_status.json:', err);
    }
  }

  private saveStatus() {
    try {
      const data = {
        lastUpdated: this.lastUpdated,
        nextUpdateDue: this.nextUpdateDue,
        updateIntervalDays: this.updateIntervalDays,
        totalDomains: this.domains.length,
        source: this.source,
      };
      fs.writeFileSync(this.statusFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.warn('[MajesticManager] Failed to save status:', err);
    }
  }

  // Load from local disk cache or bundled seed
  public loadLocalCache(): boolean {
    let targetPath = '';

    if (fs.existsSync(this.primaryCachePath)) {
      targetPath = this.primaryCachePath;
    } else if (fs.existsSync(this.seedCachePath)) {
      targetPath = this.seedCachePath;
      // Copy bundled seed to primary cache for future weekly updates
      try {
        fs.copyFileSync(this.seedCachePath, this.primaryCachePath);
        targetPath = this.primaryCachePath;
      } catch {}
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      console.warn('[MajesticManager] No local cache found at', this.primaryCachePath);
      return false;
    }

    try {
      console.log(`[MajesticManager] Loading local Majestic Million cache from: ${targetPath}`);
      const content = fs.readFileSync(targetPath, 'utf8');
      const lines = content.split('\n');
      const parsedDomains: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (i === 0 && (line.startsWith('GlobalRank') || line.toLowerCase().includes('domain'))) {
          continue; // Skip CSV header
        }

        const parts = line.split(',');
        if (parts.length >= 3) {
          const domain = parts[2]?.trim().toLowerCase();
          if (domain && domain.includes('.')) {
            parsedDomains.push(domain);
          }
        } else if (line.includes('.')) {
          // If stored as raw domain list
          parsedDomains.push(line.toLowerCase());
        }
      }

      if (parsedDomains.length > 0) {
        this.domains = parsedDomains;
        console.log(`[MajesticManager] Successfully loaded ${this.domains.length} top domains from local cache`);
        if (!this.lastUpdated) {
          try {
            const stat = fs.statSync(targetPath);
            this.lastUpdated = stat.mtime.toISOString();
            const nextDue = new Date(stat.mtime.getTime() + this.updateIntervalDays * 24 * 60 * 60 * 1000);
            this.nextUpdateDue = nextDue.toISOString();
          } catch {
            this.lastUpdated = new Date().toISOString();
          }
        }
        return true;
      }
    } catch (err: any) {
      console.error('[MajesticManager] Error reading local cache:', err.message);
      this.lastError = err.message;
    }
    return false;
  }

  // Periodic scheduler: checks if weekly update is due
  private startWeeklyScheduler() {
    // Check if initial update is due immediately
    this.checkWeeklyUpdateDue();

    // Setup periodic hourly check
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.checkWeeklyUpdateDue();
    }, CHECK_INTERVAL_MS);
  }

  private checkWeeklyUpdateDue() {
    if (!this.lastUpdated) {
      // No record of update, perform update in background
      this.fetchAndCacheMajesticMillion(false).catch(() => {});
      return;
    }

    const lastTime = new Date(this.lastUpdated).getTime();
    const intervalMs = this.updateIntervalDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (now - lastTime >= intervalMs) {
      console.log(`[MajesticManager] Weekly update is due (last updated ${this.lastUpdated}). Fetching latest Majestic Million...`);
      this.fetchAndCacheMajesticMillion(false).catch(() => {});
    }
  }

  // Fetch from https://downloads.majestic.com/majestic_million.csv, stream top domains, cache locally
  public async fetchAndCacheMajesticMillion(force: boolean = false, maxDomains: number = 50000): Promise<{ success: boolean; count: number; error?: string }> {
    if (this.isUpdating) {
      return { success: false, count: this.domains.length, error: 'Majestic update already in progress' };
    }

    this.isUpdating = true;
    this.lastError = null;
    const startTime = Date.now();

    try {
      console.log(`[MajesticManager] Fetching latest Majestic Million from ${MAJESTIC_MILLION_URL} (Target: ${maxDomains} domains)...`);
      const response = await fetch(MAJESTIC_MILLION_URL);

      if (!response.ok || !response.body) {
        throw new Error(`Failed to fetch Majestic Million: HTTP ${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const collectedLines: string[] = [];
      const collectedDomains: string[] = [];
      let count = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (count === 0 && (trimmed.startsWith('GlobalRank') || trimmed.toLowerCase().includes('domain'))) {
            collectedLines.push(trimmed);
            count++;
            continue;
          }

          const parts = trimmed.split(',');
          if (parts.length >= 3) {
            const domain = parts[2]?.trim().toLowerCase();
            if (domain && domain.includes('.')) {
              collectedLines.push(trimmed);
              collectedDomains.push(domain);
              count++;
            }
          }

          if (count > maxDomains) {
            break;
          }
        }

        if (count > maxDomains) {
          try {
            await reader.cancel();
          } catch {}
          break;
        }
      }

      if (collectedDomains.length === 0) {
        throw new Error('Downloaded Majestic Million file did not contain valid domain entries');
      }

      // Write to primary cache
      fs.writeFileSync(this.primaryCachePath, collectedLines.join('\n'), 'utf8');

      // Update in-memory pool
      this.domains = collectedDomains;
      this.lastUpdated = new Date().toISOString();
      const nextDue = new Date(Date.now() + this.updateIntervalDays * 24 * 60 * 60 * 1000);
      this.nextUpdateDue = nextDue.toISOString();
      this.source = 'live_weekly_sync';
      this.saveStatus();

      const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[MajesticManager] Successfully updated Majestic Million cache: ${collectedDomains.length} domains in ${durationSec}s`);

      this.isUpdating = false;
      return { success: true, count: collectedDomains.length };
    } catch (err: any) {
      console.error('[MajesticManager] Update failed:', err.message);
      this.lastError = err.message;
      this.isUpdating = false;

      // Ensure we retain whatever local cached domains we had
      if (this.domains.length === 0) {
        this.loadLocalCache();
      }

      return { success: false, count: this.domains.length, error: err.message };
    }
  }

  // Get domains for Precache Engine, Benchmark, or Inspector
  public getDomains(maxCount?: number): string[] {
    if (this.domains.length === 0) {
      this.loadLocalCache();
    }

    if (!maxCount || maxCount >= this.domains.length) {
      return [...this.domains];
    }

    return this.domains.slice(0, maxCount);
  }

  // Return public status for API and UI
  public getStatus(): MajesticStatus {
    return {
      sourceUrl: MAJESTIC_MILLION_URL,
      lastUpdated: this.lastUpdated,
      nextUpdateDue: this.nextUpdateDue,
      updateIntervalDays: this.updateIntervalDays,
      totalDomains: this.domains.length,
      cacheFilePath: this.primaryCachePath,
      isUpdating: this.isUpdating,
      lastError: this.lastError,
      source: this.source,
      topSample: this.domains.slice(0, 8),
    };
  }

  public setUpdateInterval(days: number) {
    if (days >= 1 && days <= 30) {
      this.updateIntervalDays = days;
      if (this.lastUpdated) {
        const nextDue = new Date(new Date(this.lastUpdated).getTime() + days * 24 * 60 * 60 * 1000);
        this.nextUpdateDue = nextDue.toISOString();
      }
      this.saveStatus();
    }
  }
}

// Global Singleton
export const majesticManager = new MajesticManager();
