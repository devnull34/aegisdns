import React, { useState } from 'react';
import { X, Globe, AlignLeft, ShieldCheck, Plus } from 'lucide-react';
import { BlocklistCategory } from '../types/blocklist';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    name: string;
    url?: string;
    category: BlocklistCategory;
    format: any;
    description: string;
    customContent?: string;
  }) => void;
}

const EXTENDED_CATALOG_PRESETS = [
  // Hägezi
  {
    name: 'Hägezi Multi NORMAL',
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/normal.txt',
    category: 'comprehensive' as BlocklistCategory,
    format: 'adblock',
    description: 'Hägezi balanced filter with extensive tracker protection and safe defaults.',
  },
  {
    name: 'Hägezi Multi PRO++',
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/pro.plus.txt',
    category: 'comprehensive' as BlocklistCategory,
    format: 'adblock',
    description: 'Extreme ad and tracker filter including aggressive mobile and smart TV telemetry.',
  },
  {
    name: 'Hägezi DoH / VPN / Tor Bypass',
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/doh-vpn-tor-bypass.txt',
    category: 'security' as BlocklistCategory,
    format: 'adblock',
    description: 'Prevents smart home devices and spyware from bypassing your local DNS sinkhole.',
  },
  {
    name: 'Hägezi Popup Ads',
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/popupads.txt',
    category: 'ads_tracking' as BlocklistCategory,
    format: 'adblock',
    description: 'Dedicated list filtering intrusive popups, popunders, and notification spam.',
  },
  // OISD
  {
    name: 'OISD Big',
    url: 'https://big.oisd.nl/',
    category: 'ads_tracking' as BlocklistCategory,
    format: 'adblock',
    description: 'High-coverage OISD variant designed for maximum network protection.',
  },
  {
    name: 'OISD Small',
    url: 'https://small.oisd.nl/',
    category: 'ads_tracking' as BlocklistCategory,
    format: 'adblock',
    description: 'Zero-false positive lightweight ad and tracking blocklist.',
  },
  {
    name: 'OISD NSFW (Adult Content)',
    url: 'https://nsfw.oisd.nl/',
    category: 'specialized' as BlocklistCategory,
    format: 'adblock',
    description: 'High-confidence adult content, porn, and cam site blocking filter.',
  },
  // StevenBlack
  {
    name: 'StevenBlack + Gambling',
    url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/gambling/hosts',
    category: 'specialized' as BlocklistCategory,
    format: 'hosts',
    description: 'StevenBlack unified hosts extended with online gambling and casino sites.',
  },
  {
    name: 'StevenBlack + Porn',
    url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn/hosts',
    category: 'specialized' as BlocklistCategory,
    format: 'hosts',
    description: 'StevenBlack unified hosts extended with adult entertainment websites.',
  },
  {
    name: 'StevenBlack All Extensions (Porn+Gambling+Social+FakeNews)',
    url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-porn-social/hosts',
    category: 'comprehensive' as BlocklistCategory,
    format: 'hosts',
    description: 'Maximum coverage StevenBlack hosts consolidating all specialized categories.',
  },
  // AdGuard
  {
    name: 'AdGuard Mobile Ads Filter',
    url: 'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_11_Mobile/filter.txt',
    category: 'ads_tracking' as BlocklistCategory,
    format: 'adblock',
    description: 'AdGuard filter specializing in in-app mobile advertising networks and SDKs.',
  },
  {
    name: 'AdGuard Popups Filter',
    url: 'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_18_Popups/filter.txt',
    category: 'ads_tracking' as BlocklistCategory,
    format: 'adblock',
    description: 'Blocks irritating popups, new-tab hijacking, and push notification spam.',
  },
  // Extra Providers
  {
    name: '1Hosts (Pro)',
    url: 'https://raw.githubusercontent.com/badmojr/1Hosts/master/Pro/domains.wildcards',
    category: 'comprehensive' as BlocklistCategory,
    format: 'domains',
    description: 'Deep wildcard list filtering tracking, phishing, telemetry, and web push spam.',
  },
];

export const AddSourceModal: React.FC<AddSourceModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [tab, setTab] = useState<'url' | 'raw' | 'preset'>('url');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<BlocklistCategory>('ads_tracking');
  const [format, setFormat] = useState<'auto' | 'adblock' | 'hosts' | 'domains'>('auto');
  const [description, setDescription] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a source name.');
      return;
    }
    if (tab === 'url' && !url.trim()) {
      setError('Please provide a valid blocklist URL.');
      return;
    }
    if (tab === 'raw' && !customContent.trim()) {
      setError('Please enter at least one domain or rule.');
      return;
    }

    onAdd({
      name: name.trim(),
      url: tab === 'url' ? url.trim() : undefined,
      category,
      format,
      description: description.trim() || 'Custom blocklist',
      customContent: tab === 'raw' ? customContent : undefined,
    });

    onClose();
  };

  const handleSelectPreset = (preset: typeof EXTENDED_CATALOG_PRESETS[0]) => {
    onAdd({
      name: preset.name,
      url: preset.url,
      category: preset.category,
      format: preset.format,
      description: preset.description,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111722] border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">Add DNS Blocklist Source</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#090d14] border border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'url' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Remote URL</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('raw')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'raw' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Paste Raw Rules</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('preset')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'preset' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Extended Catalog ({EXTENDED_CATALOG_PRESETS.length})</span>
          </button>
        </div>

        {error && (
          <div className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded-lg p-2.5">
            {error}
          </div>
        )}

        {tab === 'preset' ? (
          <div className="space-y-2.5">
            <p className="text-xs text-slate-400">
              Select an additional community-maintained list to import into your pool:
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {EXTENDED_CATALOG_PRESETS.map((p) => (
                <div
                  key={p.name}
                  className="bg-[#090d14] border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 max-w-sm">
                    <div className="text-xs font-semibold text-white">{p.name}</div>
                    <div className="text-[11px] text-slate-400">{p.description}</div>
                  </div>
                  <button
                    onClick={() => handleSelectPreset(p)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shrink-0"
                  >
                    Add to Pool
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Source Name *
              </label>
              <input
                type="text"
                placeholder="e.g. My Custom Tracker List"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#090d14] border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {tab === 'url' ? (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Blocklist URL *
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/blocklist.txt"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#090d14] border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Raw Rules / Domains (one per line, hosts or ||domain^)
                </label>
                <textarea
                  rows={5}
                  placeholder={`0.0.0.0 tracking-test.com\n||adservice.network.io^\nanalytics.telemetry.cc`}
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#090d14] border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BlocklistCategory)}
                  className="w-full px-3 py-2 text-xs bg-[#090d14] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ads_tracking">Ads &amp; Tracking</option>
                  <option value="security">Malware &amp; Security</option>
                  <option value="comprehensive">Comprehensive</option>
                  <option value="specialized">Specialized</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Input Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-[#090d14] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="auto">Auto-detect</option>
                  <option value="adblock">Adblock / AdGuard (||domain^)</option>
                  <option value="hosts">Hosts file (0.0.0.0 domain)</option>
                  <option value="domains">Plain domain list</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                placeholder="Brief summary of what this list filters"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#090d14] border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
              >
                Save &amp; Add Source
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
