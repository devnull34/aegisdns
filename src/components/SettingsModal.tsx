import React, { useState } from 'react';
import {
  Check,
  Clock,
  Globe2,
  HardDrive,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { AppSettings, OutputFormat } from '../types/blocklist';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings | null;
  onSave: (settings: Partial<AppSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  if (!isOpen || !settings) return null;

  const [autoSyncEnabled, setAutoSyncEnabled] = useState(settings.autoSyncEnabled);
  const [autoSyncIntervalHours, setAutoSyncIntervalHours] = useState(settings.autoSyncIntervalHours);
  const [updateOnStartup, setUpdateOnStartup] = useState(settings.updateOnStartup ?? true);
  const [stripSubdomains, setStripSubdomains] = useState(settings.stripSubdomains ?? true);
  const [enableIpv6, setEnableIpv6] = useState(settings.enableIpv6 ?? true);
  const [upstreamDns, setUpstreamDns] = useState(settings.upstreamDns || '192.168.1.1');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>(settings.outputFormat);
  const [whitelist, setWhitelist] = useState<string[]>(settings.whitelist || []);
  const [newWhitelistDomain, setNewWhitelistDomain] = useState('');

  const handleAddDomain = () => {
    const clean = newWhitelistDomain.trim().toLowerCase();
    if (!clean) return;
    if (!whitelist.includes(clean)) {
      setWhitelist([...whitelist, clean]);
    }
    setNewWhitelistDomain('');
  };

  const handleRemoveDomain = (domain: string) => {
    setWhitelist(whitelist.filter((d) => d !== domain));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      autoSyncEnabled,
      autoSyncIntervalHours,
      updateOnStartup,
      stripSubdomains,
      enableIpv6,
      upstreamDns,
      outputFormat,
      whitelist,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[var(--color-adguard)]" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              AdGuard Home &amp; Global Optimizer Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface-secondary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* IPv6 Global Support Option */}
          <div className="bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-[var(--color-adguard)]" />
                  <span>Global IPv6 DNS Support</span>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Enables IPv6 AAAA record resolution, queries IPv6 endpoints, and formats IPv6 loopback entries (::) in hosts files.
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                <input
                  type="checkbox"
                  checked={enableIpv6}
                  onChange={(e) => setEnableIpv6(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-adguard)]"></div>
              </label>
            </div>
          </div>

          {/* Default Upstream DNS Resolver */}
          <div className="bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] rounded-lg p-4 space-y-2">
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-sky-500" />
                <span>Default Upstream DNS Resolver IP</span>
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Primary gateway or upstream DNS used for pre-caching, diagnostics, and resolution verification.
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={upstreamDns}
                onChange={(e) => setUpstreamDns(e.target.value)}
                placeholder="192.168.1.1"
                className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-md px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-[var(--color-adguard)]"
              />
              <button
                type="button"
                onClick={() => setUpstreamDns('192.168.1.1')}
                className="px-2.5 py-1.5 text-[11px] font-mono rounded border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                192.168.1.1
              </button>
              <button
                type="button"
                onClick={() => setUpstreamDns('127.0.0.1')}
                className="px-2.5 py-1.5 text-[11px] font-mono rounded border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                127.0.0.1
              </button>
            </div>
          </div>

          {/* Periodic Auto-Sync Section */}
          <div className="bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--color-adguard)]" />
                  <span>Scheduled Auto-Sync</span>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Periodic background daemon to re-download and refresh upstream blocklists
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-adguard)]"></div>
              </label>
            </div>

            {autoSyncEnabled && (
              <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Sync Interval:</span>
                <select
                  value={autoSyncIntervalHours}
                  onChange={(e) => setAutoSyncIntervalHours(Number(e.target.value))}
                  className="bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-md px-3 py-1 text-xs focus:outline-none focus:border-[var(--color-adguard)]"
                >
                  <option value={1}>Every 1 hour</option>
                  <option value={2}>Every 2 hours</option>
                  <option value={6}>Every 6 hours (Recommended)</option>
                  <option value={12}>Every 12 hours</option>
                  <option value={24}>Every 24 hours (Daily)</option>
                  <option value={48}>Every 48 hours</option>
                  <option value={168}>Every 7 days (Weekly)</option>
                </select>
              </div>
            )}
          </div>

          {/* Subdomain Pruning & Output Format */}
          <div className="bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Hierarchical Subdomain Pruning</span>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Discards redundant subdomains when the root apex domain is already blocked
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                <input
                  type="checkbox"
                  checked={stripSubdomains}
                  onChange={(e) => setStripSubdomains(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-adguard)]"></div>
              </label>
            </div>

            <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Default Output Format:</span>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                className="bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-md px-3 py-1 text-xs focus:outline-none focus:border-[var(--color-adguard)]"
              >
                <option value="adguard">AdGuard Home (||domain^)</option>
                <option value="pihole">Pi-hole (0.0.0.0 domain)</option>
                <option value="rpz">RPZ (Response Policy Zone)</option>
                <option value="dnsmasq">Dnsmasq (address=/domain/0.0.0.0)</option>
                <option value="unbound">Unbound (local-zone static)</option>
                <option value="domains">Plain Domains (domain)</option>
                <option value="wildcard">Wildcard (*.domain)</option>
              </select>
            </div>
          </div>

          {/* Global Whitelist */}
          <div className="bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] rounded-lg p-4 space-y-2.5">
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-sky-500" />
                <span>Global Domain Whitelist</span>
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                Exempt vital services from being blocked across all aggregated lists.
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newWhitelistDomain}
                onChange={(e) => setNewWhitelistDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDomain();
                  }
                }}
                placeholder="e.g. microsoft.com or apple.com"
                className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--color-adguard)] font-mono"
              />
              <button
                type="button"
                onClick={handleAddDomain}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[var(--color-adguard)] hover:bg-[var(--color-adguard-hover)] rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
              {whitelist.map((domain) => (
                <span
                  key={domain}
                  className="inline-flex items-center gap-1 text-[11px] font-mono bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-md px-2 py-0.5"
                >
                  <span>{domain}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDomain(domain)}
                    className="text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[var(--color-adguard)] hover:bg-[var(--color-adguard-hover)] rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save &amp; Apply</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
