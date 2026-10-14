import React, { useState } from 'react';
import { BlocklistSource, GlobalStats } from '../types/blocklist';
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  HardDrive,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface SourcesTabProps {
  sources: BlocklistSource[];
  stats: GlobalStats | null;
  onToggleSource: (id: string, enabled?: boolean) => void;
  onSyncSource: (id: string) => void;
  onDeleteSource: (id: string) => void;
  onOpenAddModal: () => void;
  onSelectTab: (tab: string) => void;
}

export const SourcesTab: React.FC<SourcesTabProps> = ({
  sources,
  stats,
  onToggleSource,
  onSyncSource,
  onDeleteSource,
  onOpenAddModal,
  onSelectTab,
}) => {
  const [copied, setCopied] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const masterUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/master.txt`
      : 'http://localhost:3000/api/master.txt';

  const copyMasterUrl = () => {
    navigator.clipboard.writeText(masterUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (iso?: string | null) => {
    if (!iso) return 'Not downloaded';
    const date = new Date(iso);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const filteredSources = sources.filter((s) => {
    let matchesCategory = true;
    if (filterCategory === 'hagezi') {
      matchesCategory = s.maintainer.toLowerCase().includes('hägezi') || s.name.toLowerCase().includes('hägezi');
    } else if (filterCategory === 'oisd') {
      matchesCategory = s.maintainer.toLowerCase().includes('oisd') || s.name.toLowerCase().includes('oisd');
    } else if (filterCategory === 'steven') {
      matchesCategory = s.maintainer.toLowerCase().includes('steven') || s.name.toLowerCase().includes('steven');
    } else if (filterCategory === 'adguard') {
      matchesCategory = s.maintainer.toLowerCase().includes('adguard') || s.name.toLowerCase().includes('adguard');
    } else if (filterCategory === 'security') {
      matchesCategory = s.category === 'security';
    } else if (filterCategory === 'custom') {
      matchesCategory = !s.isPreset;
    } else if (filterCategory !== 'all') {
      matchesCategory = s.category === filterCategory;
    }

    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.maintainer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getSourceStats = (id: string) => {
    return stats?.sourceStats.find((item) => item.id === id);
  };

  return (
    <div className="space-y-6">
      {/* AdGuard Home Master Host Banner */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>Master Blocklist URL for AdGuard Home</span>
              <span className="text-xs text-[var(--color-adguard)] font-mono font-semibold">
                Local Cache &amp; Deduplicated
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Add this endpoint directly to your local AdGuard Home or Pi-hole instance ({stats?.masterUniqueDomains.toLocaleString() || 0} unique rules active across {stats?.totalActiveLists || 0} lists).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectTab('master')}
              className="px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-surface-secondary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Format Conversion &amp; Export</span>
            </button>
            <a
              href="/api/master.txt"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[var(--color-adguard)] hover:bg-[var(--color-adguard-hover)] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Raw</span>
            </a>
          </div>
        </div>

        <div className="mt-3.5 flex items-center gap-2 bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2">
          <code className="text-xs font-mono text-[var(--color-adguard)] font-semibold flex-1 truncate select-all">
            {masterUrl}
          </code>
          <button
            onClick={copyMasterUrl}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-[var(--color-adguard)] hover:bg-[var(--color-adguard-hover)] rounded-md transition-colors shrink-0 shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy URL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sources Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Interactive Segmented Filter Control */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg overflow-x-auto">
          {[
            { id: 'all', label: 'All Sources' },
            { id: 'hagezi', label: 'Hägezi' },
            { id: 'oisd', label: 'OISD' },
            { id: 'steven', label: 'StevenBlack' },
            { id: 'adguard', label: 'AdGuard' },
            { id: 'security', label: 'Security & Threats' },
            { id: 'custom', label: 'Custom' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filterCategory === tab.id
                  ? 'bg-[var(--color-adguard)] text-white font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search blocklists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--color-adguard)] w-48 shadow-xs"
            />
          </div>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[var(--color-adguard)] hover:bg-[var(--color-adguard-hover)] rounded-lg transition-colors whitespace-nowrap shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add List</span>
          </button>
        </div>
      </div>

      {/* Sources List */}
      <div className="grid grid-cols-1 gap-3.5">
        {filteredSources.map((source) => {
          const sStat = getSourceStats(source.id);
          const isSyncing = source.lastStatus === 'syncing';
          const hasError = source.lastStatus === 'error';

          return (
            <div
              key={source.id}
              className={`bg-[var(--bg-surface)] border rounded-xl p-4.5 transition-all shadow-xs ${
                source.enabled
                  ? 'border-[var(--border-color)] hover:border-[var(--color-adguard)]/50'
                  : 'border-[var(--border-color)]/60 opacity-65 bg-[var(--bg-surface-secondary)]'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Info & Description */}
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-base font-bold text-[var(--text-primary)]">
                      {source.name}
                    </span>

                    {/* Unboxed Metadata */}
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <span>By {source.maintainer}</span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                        <span>Updated: {formatTime(source.lastDownloaded || source.lastUpdated)}</span>
                      </span>
                      {source.cacheSizeBytes ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-1 text-[var(--text-muted)]">
                            <HardDrive className="w-3 h-3 text-[var(--text-muted)]" />
                            <span>{formatFileSize(source.cacheSizeBytes)} cached</span>
                          </span>
                        </>
                      ) : null}
                      {source.homepage && (
                        <>
                          <span aria-hidden="true">·</span>
                          <a
                            href={source.homepage}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--color-adguard)] hover:underline inline-flex items-center gap-1"
                          >
                            <span>Repo</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {source.description}
                  </p>

                  <div className="text-[11px] text-[var(--text-muted)] font-mono truncate max-w-xl">
                    {source.url ? source.url : 'Custom inline raw rule list'}
                  </div>

                  {/* Inline Status Message */}
                  <div className="flex items-center gap-2 text-xs pt-1">
                    {isSyncing ? (
                      <span className="text-sky-500 font-medium flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>{source.statusMessage || 'Updating in background...'}</span>
                      </span>
                    ) : hasError ? (
                      <span className="text-amber-500 font-medium flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{source.statusMessage || source.errorMessage || 'Using local disk cache (upstream unreachable)'}</span>
                      </span>
                    ) : (
                      <span className="text-[var(--color-adguard)] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-adguard)]"></span>
                        <span>{source.statusMessage || (source.enabled ? 'Pre-loaded & active in memory' : 'Pre-loaded & ready')}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Telemetry & Actions */}
                <div className="flex items-center gap-6 self-start md:self-center shrink-0">
                  {/* Domain Counts & Uniqueness */}
                  <div className="text-right">
                    <div className="text-sm font-bold text-[var(--text-primary)] font-mono tabular-nums">
                      {source.domainCount.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-[var(--text-muted)]">domains</span>
                    </div>

                    {source.enabled && sStat ? (
                      <div className="text-xs text-[var(--text-muted)] flex items-center justify-end gap-1 font-mono tabular-nums">
                        <span className="text-[var(--color-adguard)] font-semibold">
                          {sStat.uniqueCount.toLocaleString()}
                        </span>
                        <span>unique ({sStat.uniquePercentage}%)</span>
                      </div>
                    ) : (
                      <div className="text-xs text-[var(--text-muted)]">Disabled</div>
                    )}
                  </div>

                  {/* AdGuard Style Toggle Switch */}
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={source.enabled}
                        onChange={() => onToggleSource(source.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-adguard)]"></div>
                    </label>
                  </div>

                  {/* Actions (Sync & Delete) */}
                  <div className="flex items-center gap-1.5">
                    {source.url && (
                      <button
                        onClick={() => onSyncSource(source.id)}
                        disabled={isSyncing}
                        title="Update and cache this list now"
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--color-adguard)] hover:bg-[var(--bg-surface-secondary)] rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      </button>
                    )}

                    {!source.isPreset && (
                      <button
                        onClick={() => onDeleteSource(source.id)}
                        title="Delete custom source"
                        className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-surface-secondary)] rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredSources.length === 0 && (
          <div className="text-center py-12 border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-surface)]">
            <p className="text-sm text-[var(--text-secondary)]">No blocklists match your current filter.</p>
            <button
              onClick={() => {
                setFilterCategory('all');
                setSearchQuery('');
              }}
              className="mt-2 text-xs text-[var(--color-adguard)] hover:underline font-medium"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Community Recommendations Tip */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-4.5 flex items-start gap-3 shadow-xs">
        <Sparkles className="w-4 h-4 text-[var(--color-adguard)] shrink-0 mt-0.5" />
        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
          <strong className="text-[var(--text-primary)]">Local Caching &amp; Startup Optimization:</strong> All blocklists are cached directly to local storage. On server startup, lists load instantly from cache while fresh upstream updates sync in the background according to your global schedule. Subdomain tree pruning automatically discards redundant child domains when parent domains are already blocked.
        </div>
      </div>
    </div>
  );
};
