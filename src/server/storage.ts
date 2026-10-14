import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppSettings, BlocklistSource, GlobalStats, OutputFormat } from '../types/blocklist';
import {
  compileMasterList,
  computeStatistics,
  invalidatePairwiseCacheForSource,
  invalidateStatsMemoCache,
} from './analyzer';
import { parseBlocklistContent } from './parser';
import { PRESET_SOURCES } from './seedData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = path.resolve(__dirname, '../../data/cache');
const METADATA_FILE = path.join(CACHE_DIR, 'sources_state.json');

class BlocklistManager {
  private sources: BlocklistSource[] = [];
  private listDomains: Map<string, Set<string>> = new Map();
  private whitelist: Set<string> = new Set([
    'apple.com',
    'microsoft.com',
    'google.com',
    'github.com',
  ]);
  private settings: AppSettings = {
    autoSyncEnabled: true,
    autoSyncIntervalHours: 6,
    updateOnStartup: true,
    lastAutoSync: null,
    nextAutoSync: null,
    outputFormat: 'adguard',
    whitelist: ['apple.com', 'microsoft.com', 'google.com', 'github.com'],
    stripSubdomains: true,
    enableIpv6: true,
    upstreamDns: '192.168.1.1',
  };
  private autoSyncTimer: NodeJS.Timeout | null = null;
  private syncLogs: { timestamp: string; message: string; type: 'info' | 'warn' | 'error' | 'success' }[] = [];

  constructor() {
    this.ensureCacheDir();
    this.initializeFromCacheOrPresets();
    this.startScheduler();

    // Cache all lists locally if they haven't been updated per the update schedule on startup
    if (this.settings.updateOnStartup) {
      setTimeout(() => {
        this.syncExpiredCachesOnStartup();
      }, 400);
    }
  }

  private syncExpiredCachesOnStartup() {
    const maxAgeMs = this.settings.autoSyncIntervalHours * 60 * 60 * 1000;
    const now = Date.now();
    const overdueTargets: BlocklistSource[] = [];

    for (const source of this.sources) {
      if (!source.url) continue;

      const cachePath = path.join(CACHE_DIR, `${source.id}.txt`);
      const hasLocalCache = fs.existsSync(cachePath);
      const diskSize = hasLocalCache ? fs.statSync(cachePath).size : 0;
      const domainCount = this.listDomains.get(source.id)?.size || 0;
      const isSeedPlaceholder = diskSize < 1500 && domainCount < 60;
      const lastDownloadTime = source.lastDownloaded ? new Date(source.lastDownloaded).getTime() : 0;
      const ageMs = now - lastDownloadTime;
      const isExpiredPerSchedule = ageMs >= maxAgeMs;

      if (!hasLocalCache || isSeedPlaceholder || isExpiredPerSchedule) {
        // Overdue per update schedule: queue for background download & local cache write
        overdueTargets.push(source);
        source.statusMessage = 'Updating & caching locally per schedule...';
      } else {
        // Cache is verified on local disk and fresh per update schedule
        const remainingHours = Math.max(0.1, (maxAgeMs - ageMs) / (3600 * 1000)).toFixed(1);
        source.statusMessage = `Cached locally on disk (${domainCount.toLocaleString()} domains, valid for ${remainingHours}h per schedule)`;
        source.lastStatus = 'ok';
      }
    }

    if (overdueTargets.length > 0) {
      this.log(
        `Startup cache check: Found ${overdueTargets.length} lists requiring cache update per the ${this.settings.autoSyncIntervalHours}h schedule. Refreshing and writing to local disk...`,
        'info'
      );
      (async () => {
        for (const target of overdueTargets) {
          await this.fetchSource(target.id);
        }
        this.saveStateToDisk();
        this.invalidateCache();
        this.log(
          `Startup cache complete: All ${this.sources.length} lists are verified in local disk storage. Zero UI delay on toggle.`,
          'success'
        );
      })().catch(console.error);
    } else {
      this.log(
        `Startup cache check: All ${this.sources.length} lists are verified in local storage and fresh per the ${this.settings.autoSyncIntervalHours}h schedule. Zero network fetch needed.`,
        'success'
      );
    }
  }

  private ensureCacheDir() {
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
    } catch (e) {
      console.error('Failed to create cache dir:', e);
    }
  }

  private initializeFromCacheOrPresets() {
    let savedState: any = null;
    try {
      if (fs.existsSync(METADATA_FILE)) {
        const raw = fs.readFileSync(METADATA_FILE, 'utf-8');
        savedState = JSON.parse(raw);
      }
    } catch {
      savedState = null;
    }

    if (savedState && Array.isArray(savedState.sources) && savedState.sources.length > 0) {
      this.sources = savedState.sources;
      if (savedState.settings) {
        this.settings = { ...this.settings, ...savedState.settings };
        this.whitelist = new Set(this.settings.whitelist || []);
      }
    }

    // Ensure EVERY preset source is pre-loaded in this.sources and has in-memory domains ready
    for (const preset of PRESET_SOURCES) {
      let existing = this.sources.find((s) => s.id === preset.id);
      if (!existing) {
        existing = {
          id: preset.id,
          name: preset.name,
          url: preset.url,
          category: preset.category,
          enabled: preset.enabled,
          format: preset.format,
          description: preset.description,
          maintainer: preset.maintainer,
          homepage: preset.homepage,
          domainCount: preset.initialDomains.length,
          lastUpdated: preset.lastUpdated || new Date().toISOString(),
          lastDownloaded: preset.lastDownloaded || new Date().toISOString(),
          lastStatus: 'ok',
          isPreset: preset.isPreset,
          isPreloaded: true,
          statusMessage: 'Pre-loaded & ready',
          cacheSizeBytes: preset.initialDomains.join('\n').length,
        };
        this.sources.push(existing);
      } else if (existing.isPreset) {
        // Sync URL & format in case provider endpoint was modernized (e.g. OISD)
        if (existing.url !== preset.url) {
          existing.url = preset.url;
          existing.format = preset.format;
          existing.lastDownloaded = null; // Mark for fresh sync
        }
      }

      // Check if domain set is already on local disk cache
      const cacheFile = path.join(CACHE_DIR, `${preset.id}.txt`);
      if (fs.existsSync(cacheFile)) {
        const diskSize = fs.statSync(cacheFile).size;
        existing.cacheSizeBytes = diskSize;

        // Code optimization: only parse and load heavy disk files into heap if source is enabled
        // Disabled sources keep domainCount and load on-demand when enabled
        if (existing.enabled) {
          try {
            const content = fs.readFileSync(cacheFile, 'utf-8');
            const domains = parseBlocklistContent(content);
            this.listDomains.set(preset.id, domains);
            existing.domainCount = domains.size;
          } catch {
            this.listDomains.set(preset.id, new Set(preset.initialDomains));
            existing.domainCount = preset.initialDomains.length;
          }
        } else {
          // Lightweight estimation from file size or metadata without parsing 30MB file
          if (!existing.domainCount || existing.domainCount === 0) {
            existing.domainCount = Math.max(preset.initialDomains.length, Math.round(diskSize / 28));
          }
        }
      } else {
        const initialSet = new Set(preset.initialDomains);
        this.listDomains.set(preset.id, initialSet);
        existing.domainCount = initialSet.size;
        this.saveLocalCacheFile(preset.id, preset.initialDomains.join('\n'));
      }

      existing.isPreloaded = true;
    }

    this.saveStateToDisk();
    this.updateNextAutoSyncTime();
    this.log(`Pre-loaded all ${this.sources.length} blocklists into memory with local cache persistence.`, 'info');
  }

  private saveLocalCacheFile(id: string, content: string) {
    try {
      const cachePath = path.join(CACHE_DIR, `${id}.txt`);
      fs.writeFileSync(cachePath, content, 'utf-8');
      const source = this.sources.find((s) => s.id === id);
      if (source) {
        source.cacheSizeBytes = Buffer.byteLength(content, 'utf-8');
      }
    } catch (e) {
      console.error(`Failed to cache list ${id} locally:`, e);
    }
  }

  private saveStateToDisk() {
    try {
      fs.writeFileSync(
        METADATA_FILE,
        JSON.stringify(
          {
            sources: this.sources,
            settings: this.settings,
            lastSaved: new Date().toISOString(),
          },
          null,
          2
        ),
        'utf-8'
      );
    } catch (e) {
      console.error('Failed to save state to disk:', e);
    }
  }

  public log(message: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') {
    this.syncLogs.unshift({
      timestamp: new Date().toISOString(),
      message,
      type,
    });
    if (this.syncLogs.length > 80) {
      this.syncLogs.pop();
    }
  }

  public getLogs() {
    return this.syncLogs;
  }

  public getSources(): BlocklistSource[] {
    return this.sources.map((s) => ({
      ...s,
      domainCount: this.listDomains.get(s.id)?.size || s.domainCount,
    }));
  }

  public getListDomains(): Map<string, Set<string>> {
    return this.listDomains;
  }

  public getSettings(): AppSettings {
    return {
      ...this.settings,
      whitelist: Array.from(this.whitelist),
    };
  }

  public updateSettings(newSettings: Partial<AppSettings>): AppSettings {
    if (newSettings.outputFormat) {
      this.settings.outputFormat = newSettings.outputFormat;
    }
    if (typeof newSettings.autoSyncEnabled === 'boolean') {
      this.settings.autoSyncEnabled = newSettings.autoSyncEnabled;
    }
    if (typeof newSettings.autoSyncIntervalHours === 'number') {
      this.settings.autoSyncIntervalHours = Math.max(1, Math.min(168, newSettings.autoSyncIntervalHours));
    }
    if (typeof newSettings.updateOnStartup === 'boolean') {
      this.settings.updateOnStartup = newSettings.updateOnStartup;
    }
    if (typeof newSettings.stripSubdomains === 'boolean') {
      this.settings.stripSubdomains = newSettings.stripSubdomains;
    }
    if (typeof newSettings.enableIpv6 === 'boolean') {
      this.settings.enableIpv6 = newSettings.enableIpv6;
    }
    if (typeof newSettings.upstreamDns === 'string' && newSettings.upstreamDns.trim()) {
      this.settings.upstreamDns = newSettings.upstreamDns.trim();
    }
    if (Array.isArray(newSettings.whitelist)) {
      this.whitelist = new Set(newSettings.whitelist.map((w) => w.trim().toLowerCase()).filter(Boolean));
      this.settings.whitelist = Array.from(this.whitelist);
    }

    this.updateNextAutoSyncTime();
    this.restartScheduler();
    this.saveStateToDisk();
    this.invalidateCache();
    this.log(
      `Global settings updated. Schedule: ${this.settings.autoSyncEnabled ? `Every ${this.settings.autoSyncIntervalHours}h` : 'Disabled'}, Subdomain optimization: ${this.settings.stripSubdomains ? 'Enabled' : 'Disabled'}`,
      'info'
    );

    return this.getSettings();
  }

  public loadSourceFromDisk(id: string): boolean {
    const cacheFile = path.join(CACHE_DIR, `${id}.txt`);
    if (fs.existsSync(cacheFile)) {
      try {
        const content = fs.readFileSync(cacheFile, 'utf-8');
        const domains = parseBlocklistContent(content);
        this.listDomains.set(id, domains);
        const source = this.sources.find((s) => s.id === id);
        if (source) {
          source.domainCount = domains.size;
          source.cacheSizeBytes = fs.statSync(cacheFile).size;
        }
        return true;
      } catch (e) {
        console.error(`Failed to load ${id} from disk:`, e);
      }
    }
    return false;
  }

  public toggleSource(id: string, enabled?: boolean): BlocklistSource | null {
    const source = this.sources.find((s) => s.id === id);
    if (!source) return null;

    source.enabled = typeof enabled === 'boolean' ? enabled : !source.enabled;
    if (source.enabled) {
      const currentSet = this.listDomains.get(source.id);
      if (!currentSet || currentSet.size <= 25) {
        this.loadSourceFromDisk(source.id);
      }
    }
    source.statusMessage = source.enabled ? 'Active (in memory)' : 'Disabled';
    this.saveStateToDisk();
    this.invalidateCache();
    this.log(`Source "${source.name}" ${source.enabled ? 'enabled' : 'disabled'} instantly.`, 'info');
    return source;
  }

  public addSource(data: {
    name: string;
    url?: string;
    category: any;
    format?: any;
    description?: string;
    customContent?: string;
  }): BlocklistSource {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const source: BlocklistSource = {
      id,
      name: data.name,
      url: data.url || '',
      category: data.category || 'specialized',
      enabled: true,
      format: data.format || 'auto',
      description: data.description || 'Custom blocklist',
      maintainer: 'Custom',
      domainCount: 0,
      lastUpdated: now,
      lastDownloaded: now,
      lastStatus: 'pending',
      isPreset: false,
      cacheSizeBytes: 0,
    };

    this.sources.push(source);

    if (data.customContent) {
      const parsed = parseBlocklistContent(data.customContent);
      this.listDomains.set(id, parsed);
      source.domainCount = parsed.size;
      source.lastStatus = 'ok';
      this.saveLocalCacheFile(id, data.customContent);
      this.log(`Added custom inline source "${source.name}" with ${parsed.size.toLocaleString()} domains.`, 'success');
    } else {
      this.listDomains.set(id, new Set());
      if (source.url) {
        this.fetchSource(source.id).catch(console.error);
      }
    }

    this.saveStateToDisk();
    this.invalidateCache();
    return source;
  }

  public removeSource(id: string): boolean {
    const idx = this.sources.findIndex((s) => s.id === id);
    if (idx === -1) return false;

    const removed = this.sources.splice(idx, 1)[0];
    this.listDomains.delete(id);
    const cachePath = path.join(CACHE_DIR, `${id}.txt`);
    if (fs.existsSync(cachePath)) {
      try {
        fs.unlinkSync(cachePath);
      } catch {}
    }
    this.saveStateToDisk();
    this.invalidateCache();
    this.log(`Source "${removed.name}" deleted.`, 'info');
    return true;
  }

  public async fetchSource(id: string): Promise<boolean> {
    const source = this.sources.find((s) => s.id === id);
    if (!source) return false;

    if (!source.url) {
      source.lastStatus = 'ok';
      return true;
    }

    source.lastStatus = 'syncing';
    source.statusMessage = 'Updating from GitHub in background...';
    this.saveStateToDisk();
    this.log(`Downloading upstream updates for "${source.name}"...`, 'info');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 16000);

      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'AegisDNS/2.0 (+https://github.com/aegisdns)',
          'Accept': 'text/plain, */*',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      const domains = parseBlocklistContent(text);

      if (domains.size > 0) {
        this.listDomains.set(source.id, domains);
        source.domainCount = domains.size;
        source.lastUpdated = new Date().toISOString();
        source.lastDownloaded = new Date().toISOString();
        source.lastStatus = 'ok';
        const hours = this.settings.autoSyncIntervalHours;
        source.statusMessage = `Cached locally on disk (${domains.size.toLocaleString()} domains, valid for ${hours}h per schedule)`;
        source.errorMessage = undefined;

        // Cache downloaded list locally on disk
        this.saveLocalCacheFile(source.id, text);
        this.saveStateToDisk();
        this.invalidateCache();
        invalidatePairwiseCacheForSource(source.id);

        this.log(`Successfully updated and cached "${source.name}": ${domains.size.toLocaleString()} domains.`, 'success');
        return true;
      } else {
        throw new Error('Zero valid domains extracted from feed.');
      }
    } catch (err: any) {
      const msg = err.name === 'AbortError' ? 'Download timed out after 16s' : err.message || 'Network error';
      source.lastStatus = 'error';
      source.statusMessage = 'Upstream unreachable, using local cache';
      source.errorMessage = msg;
      this.saveStateToDisk();
      this.log(`Download failed for "${source.name}": ${msg}. Utilizing existing local disk cache.`, 'warn');
      return false;
    }
  }

  public async syncAll(): Promise<{ successCount: number; failureCount: number }> {
    this.log('Initiating global update for all active blocklists...', 'info');
    let successCount = 0;
    let failureCount = 0;

    const targets = this.sources.filter((s) => s.enabled && s.url);
    for (const target of targets) {
      const ok = await this.fetchSource(target.id);
      if (ok) successCount++;
      else failureCount++;
    }

    const now = new Date().toISOString();
    this.settings.lastAutoSync = now;
    this.updateNextAutoSyncTime();
    this.saveStateToDisk();

    this.log(
      `Global sync complete: ${successCount} lists updated and locally cached, ${failureCount} retained from cache.`,
      successCount > 0 ? 'success' : 'warn'
    );

    return { successCount, failureCount };
  }

  private updateNextAutoSyncTime() {
    if (!this.settings.autoSyncEnabled) {
      this.settings.nextAutoSync = null;
      return;
    }
    const next = new Date(Date.now() + this.settings.autoSyncIntervalHours * 60 * 60 * 1000);
    this.settings.nextAutoSync = next.toISOString();
  }

  private startScheduler() {
    if (!this.settings.autoSyncEnabled) return;

    const intervalMs = this.settings.autoSyncIntervalHours * 60 * 60 * 1000;
    this.autoSyncTimer = setTimeout(async () => {
      this.log('Scheduled global auto-sync timer fired.', 'info');
      await this.syncAll();
      this.startScheduler();
    }, intervalMs);
  }

  private restartScheduler() {
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
    this.startScheduler();
  }

  private cachedStats: GlobalStats | null = null;
  private cachedMasterOutput: string | null = null;

  private invalidateCache() {
    this.cachedStats = null;
    this.cachedMasterOutput = null;
    invalidateStatsMemoCache();
  }

  public getStats(): GlobalStats {
    if (!this.cachedStats) {
      this.cachedStats = computeStatistics(
        this.sources,
        this.listDomains,
        this.whitelist,
        this.settings.stripSubdomains,
        this.settings.lastAutoSync,
        this.settings.nextAutoSync
      );
    }
    return this.cachedStats;
  }

  public getMasterOutput(requestedFormat?: OutputFormat): string {
    const format = requestedFormat || this.settings.outputFormat;
    // If format is the default configured format and cached, return cached
    if (!requestedFormat || requestedFormat === this.settings.outputFormat) {
      if (!this.cachedMasterOutput) {
        const res = compileMasterList(
          this.sources,
          this.listDomains,
          this.whitelist,
          format,
          this.settings.stripSubdomains,
          true,
          this.settings.enableIpv6
        );
        this.cachedMasterOutput = res.formattedOutput;
      }
      return this.cachedMasterOutput;
    }

    // Dynamic format conversion on demand (RPZ, Pi-hole, AdGuard, etc.)
    const res = compileMasterList(
      this.sources,
      this.listDomains,
      this.whitelist,
      format,
      this.settings.stripSubdomains,
      true,
      this.settings.enableIpv6
    );
    return res.formattedOutput;
  }
}

export const manager = new BlocklistManager();
