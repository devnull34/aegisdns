import React from 'react';
import { Moon, RefreshCw, SlidersHorizontal, Sun, Terminal } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSyncAll: () => void;
  isSyncing: boolean;
  onOpenSettings: () => void;
  onOpenLogs: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  ipv6Enabled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onSyncAll,
  isSyncing,
  onOpenSettings,
  onOpenLogs,
  isDark,
  onToggleTheme,
  ipv6Enabled = true,
}) => {
  const navItems = [
    { id: 'sources', label: 'DNS Blocklists' },
    { id: 'analytics', label: 'Analysis' },
    { id: 'master', label: 'Master & Formats' },
    { id: 'tools', label: 'DNS Benchmark' },
    { id: 'precache', label: 'Pre-Cache 1M' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border-color)] px-6 py-4 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        {/* Brand identity: AEGIS_LOCAL */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-pulse" />
          <button
            onClick={() => setActiveTab('sources')}
            className="flex flex-col text-left group"
          >
            <div className="font-bold text-xl tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors font-mono">
              AEGIS_LOCAL
            </div>
            <span className="label-mono text-[9px] -mt-0.5">
              SYSTEM SINKHOLE CURATOR
            </span>
          </button>
        </div>

        {/* Monospace nav links as in Variation 7 */}
        <nav className="hidden md:flex items-center gap-7">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`font-mono text-xs uppercase tracking-[0.14em] transition-all py-1 cursor-pointer ${
                  isActive
                    ? 'text-[var(--accent)] font-semibold border-b-2 border-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border-b-2 border-transparent'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right tools and SYNC NOW button */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* IPv6 Status */}
          <span
            className="hidden sm:inline-flex items-center font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] px-2.5 py-1 bg-[var(--bg-surface)] border border-[var(--border-color)]"
            title={ipv6Enabled ? 'IPv6 resolution enabled' : 'IPv6 resolution disabled'}
          >
            IPv6:&nbsp;
            <span className={`font-semibold ${ipv6Enabled ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
              {ipv6Enabled ? 'ON' : 'OFF'}
            </span>
          </span>

          {/* Theme switcher */}
          <button
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light Mode' : 'Dark Mode'}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] transition-colors"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
          </button>

          {/* Logs */}
          <button
            onClick={onOpenLogs}
            title="System Terminal Logs"
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            title="System Settings"
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* SYNC NOW Action */}
          <button
            onClick={onSyncAll}
            disabled={isSyncing}
            className="btn-mono btn-mono-accent disabled:opacity-50 disabled:cursor-not-allowed text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'SYNCING...' : 'SYNC NOW'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav Links */}
      <div className="md:hidden flex items-center gap-3 overflow-x-auto pt-3 border-t border-[var(--border-color)] mt-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`font-mono text-[11px] uppercase tracking-wider whitespace-nowrap px-2.5 py-1 ${
              activeTab === item.id
                ? 'bg-[var(--accent)] text-white font-semibold'
                : 'text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-color)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
