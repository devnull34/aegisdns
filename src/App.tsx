/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MetricsOverview } from './components/MetricsOverview';
import { SourcesTab } from './components/SourcesTab';
import { OverlapAnalyticsTab } from './components/OverlapAnalyticsTab';
import { AdGuardExportTab } from './components/AdGuardExportTab';
import { DnsToolsTab } from './components/DnsToolsTab';
import { PrecacheTab } from './components/PrecacheTab';
import { AddSourceModal } from './components/AddSourceModal';
import { SettingsModal } from './components/SettingsModal';
import { LogsDrawer } from './components/LogsDrawer';
import { AppSettings, BlocklistSource, GlobalStats, OutputFormat } from './types/blocklist';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('sources');
  const [sources, setSources] = useState<BlocklistSource[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Theme state (AdGuard Home Light / Dark mode)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aegis_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aegis_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aegis_theme', 'light');
    }
  }, [isDark]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLogsDrawerOpen, setIsLogsDrawerOpen] = useState(false);

  // Temporary notification toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const loadAllData = useCallback(async () => {
    try {
      const [sourcesRes, statsRes, settingsRes] = await Promise.all([
        fetch('/api/sources'),
        fetch('/api/stats'),
        fetch('/api/settings'),
      ]);

      if (sourcesRes.ok) {
        const sourcesData = await sourcesRes.json();
        setSources(sourcesData);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }
    } catch (err) {
      console.error('Failed to load AegisDNS data:', err);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Automatically refresh sources and stats while any list is syncing/updating in the background
  useEffect(() => {
    const hasSyncing = sources.some((s) => s.lastStatus === 'syncing');
    if (!hasSyncing) return;

    const timer = setInterval(() => {
      loadAllData();
    }, 2000);

    return () => clearInterval(timer);
  }, [sources, loadAllData]);

  // Instant optimistic toggle with zero lag
  const handleToggleSource = async (id: string, enabled?: boolean) => {
    const currentSource = sources.find((s) => s.id === id);
    if (!currentSource) return;

    const targetEnabled = typeof enabled === 'boolean' ? enabled : !currentSource.enabled;

    // Optimistically update UI immediately (0 ms perceived lag)
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: targetEnabled } : s))
    );

    showToast(`List "${currentSource.name}" ${targetEnabled ? 'activated' : 'deactivated'}`, 'info');

    try {
      const res = await fetch(`/api/sources/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: targetEnabled }),
      });
      if (res.ok) {
        const updatedSource = await res.json();
        setSources((prev) => prev.map((s) => (s.id === id ? updatedSource : s)));
        // Refresh global stats in background without blocking UI
        fetch('/api/stats')
          .then((r) => r.json())
          .then((st) => setStats(st))
          .catch(console.error);
      } else {
        // Rollback on failure
        setSources((prev) =>
          prev.map((s) => (s.id === id ? { ...s, enabled: !targetEnabled } : s))
        );
        showToast('Failed to toggle source state', 'error');
      }
    } catch {
      setSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled: !targetEnabled } : s))
      );
      showToast('Network error while toggling source', 'error');
    }
  };

  const handleSyncSource = async (id: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, lastStatus: 'syncing', statusMessage: 'Syncing...' } : s))
    );
    showToast('Updating source in background...', 'info');

    try {
      const res = await fetch(`/api/sources/${id}/sync`, { method: 'POST' });
      if (res.ok) {
        await loadAllData();
        showToast('Source updated successfully', 'success');
      } else {
        showToast('Failed to download source from provider', 'error');
      }
    } catch {
      showToast('Network failure during sync', 'error');
    }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      const res = await fetch(`/api/sources/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadAllData();
        showToast('Source removed', 'success');
      } else {
        showToast('Could not delete preset source', 'error');
      }
    } catch {
      showToast('Network error while deleting source', 'error');
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    showToast('Starting global background sync...', 'info');
    try {
      const res = await fetch('/api/sync-all', { method: 'POST' });
      if (res.ok) {
        await loadAllData();
        showToast('All blocklists updated and cached locally', 'success');
      } else {
        showToast('Some sources encountered sync errors', 'error');
      }
    } catch {
      showToast('Network error triggering global sync', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddSource = async (data: any) => {
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await loadAllData();
        showToast(`Added source "${data.name}"`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add source', 'error');
      }
    } catch {
      showToast('Network error while adding source', 'error');
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        await loadAllData();
        showToast('Configuration updated', 'success');
      } else {
        showToast('Failed to save settings', 'error');
      }
    } catch {
      showToast('Failed to save settings', 'error');
    }
  };

  const handleUpdateFormat = (format: OutputFormat) => {
    handleUpdateSettings({ outputFormat: format });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors">
      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 transition-all transform animate-in fade-in slide-in-from-bottom-2">
          <div
            className={`px-4 py-2.5 rounded-lg border text-xs font-semibold shadow-xl flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* AdGuard Home Styled Header with Light/Dark Mode */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSyncAll={handleSyncAll}
        isSyncing={isSyncing}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenLogs={() => setIsLogsDrawerOpen(true)}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        ipv6Enabled={settings?.enableIpv6}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-7">
        {/* Top KPI Metrics Strip */}
        <MetricsOverview stats={stats} settings={settings} />

        {/* Tab Views */}
        {activeTab === 'sources' && (
          <SourcesTab
            sources={sources}
            stats={stats}
            onToggleSource={handleToggleSource}
            onSyncSource={handleSyncSource}
            onDeleteSource={handleDeleteSource}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === 'analytics' && (
          <OverlapAnalyticsTab stats={stats} sources={sources} />
        )}

        {activeTab === 'master' && (
          <AdGuardExportTab
            stats={stats}
            settings={settings}
            onUpdateFormat={handleUpdateFormat}
            onUpdateSubdomainPruning={(enabled) =>
              handleUpdateSettings({ stripSubdomains: enabled })
            }
          />
        )}

        {activeTab === 'tools' && <DnsToolsTab />}

        {activeTab === 'precache' && <PrecacheTab />}
      </main>

      {/* Variation 7 System Dashboard Footer */}
      <footer className="border-t border-[var(--border-color)] px-6 py-5 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px] text-[var(--text-muted)] tracking-wider uppercase transition-colors">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="text-[var(--text-primary)] font-semibold">STATUS: ACTIVE</span>
          </span>
          <span>|</span>
          <span>IPv6: {settings?.enableIpv6 ? 'ENABLED' : 'DISABLED'}</span>
          <span>|</span>
          <span>DAEMON: LOCALHOST:3000</span>
        </div>
        <div className="flex items-center gap-3">
          <span>LAST SYNC: {stats?.lastGlobalSync ? new Date(stats.lastGlobalSync).toLocaleTimeString() : 'PENDING'}</span>
          <span>|</span>
          <span>CADENCE: {settings?.autoSyncEnabled ? `${settings.autoSyncIntervalHours}H` : 'MANUAL'}</span>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <AddSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddSource}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSave={handleUpdateSettings}
      />

      <LogsDrawer
        isOpen={isLogsDrawerOpen}
        onClose={() => setIsLogsDrawerOpen(false)}
      />
    </div>
  );
}
