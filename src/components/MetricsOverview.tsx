import React from 'react';
import { GlobalStats, AppSettings } from '../types/blocklist';

interface MetricsOverviewProps {
  stats: GlobalStats | null;
  settings: AppSettings | null;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ stats, settings }) => {
  if (!stats) return null;

  const opt = stats.optimization;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getRelativeTime = (isoString: string | null) => {
    if (!isoString) return 'PENDING';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'JUST NOW';
    if (diffMins < 60) return `${diffMins}M AGO`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}H AGO`;
    return new Date(isoString).toLocaleDateString().toUpperCase();
  };

  const redundancyRate = opt ? opt.totalReductionPercentage : stats.duplicateReductionPercentage;

  return (
    <div className="space-y-4 mb-7">
      {/* Variation 7 Hero Box */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 sm:p-8 transition-colors">
        <span className="label-mono block mb-2">[01] SYSTEM CURATOR</span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)] mb-6 leading-tight">
          Curated Network Defense.
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-box">
            <span className="label-mono">MASTER RULES</span>
            <div className="stat-huge text-[var(--text-primary)] mt-1 tabular-nums">
              {stats.masterUniqueDomains.toLocaleString()}
            </div>
            <div className="font-mono text-[11px] text-[var(--accent)] mt-1">
              {stats.totalActiveLists} OF {stats.totalConfiguredLists} ACTIVE LISTS
            </div>
          </div>

          <div className="stat-box">
            <span className="label-mono">REDUNDANCY</span>
            <div className="stat-huge text-[var(--accent)] mt-1 tabular-nums">
              -{redundancyRate}%
            </div>
            <div className="font-mono text-[11px] text-[var(--text-muted)] mt-1">
              {(opt ? opt.exactDuplicatesRemoved + opt.redundantSubdomainsPruned : stats.duplicatesRemoved).toLocaleString()} PRUNED
            </div>
          </div>

          <div className="stat-box">
            <span className="label-mono">MEMORY SAVED</span>
            <div className="stat-huge text-emerald-400 mt-1 tabular-nums">
              {opt ? formatBytes(opt.estimatedRamSavedBytes) : '0 KB'}
            </div>
            <div className="font-mono text-[11px] text-[var(--text-muted)] mt-1">
              PAYLOAD -{opt ? opt.payloadReductionPercentage : 0}%
            </div>
          </div>

          <div className="stat-box">
            <span className="label-mono">SYNC CADENCE</span>
            <div className="stat-huge text-[var(--text-primary)] mt-1 tabular-nums text-2xl">
              {settings?.autoSyncEnabled ? `${settings.autoSyncIntervalHours}H` : 'MANUAL'}
            </div>
            <div className="font-mono text-[11px] text-[var(--text-muted)] mt-1">
              LAST: {getRelativeTime(stats.lastGlobalSync)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
