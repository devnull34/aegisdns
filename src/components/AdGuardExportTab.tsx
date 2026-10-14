import React, { useState, useEffect } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { AppSettings, GlobalStats, OutputFormat } from '../types/blocklist';

interface AdGuardExportTabProps {
  stats: GlobalStats | null;
  settings: AppSettings | null;
  onUpdateFormat: (format: OutputFormat) => void;
  onUpdateSubdomainPruning: (enabled: boolean) => void;
}

export const AdGuardExportTab: React.FC<AdGuardExportTabProps> = ({
  stats,
  settings,
  onUpdateFormat,
  onUpdateSubdomainPruning,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>(
    settings?.outputFormat || 'adguard'
  );
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [rawPreview, setRawPreview] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (settings?.outputFormat) {
      setSelectedFormat(settings.outputFormat);
    }
  }, [settings?.outputFormat]);

  const masterUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/master.txt?format=${selectedFormat}`
      : `http://localhost:3000/api/master.txt?format=${selectedFormat}`;

  const opt = stats?.optimization;

  const fetchPreview = async (fmt: OutputFormat) => {
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/master.txt?format=${fmt}`);
      const text = await res.text();
      const lines = text.split('\n');
      const head = lines.slice(0, 45).join('\n');
      setRawPreview(
        head +
          (lines.length > 45
            ? `\n\n# ... [${(lines.length - 45).toLocaleString()} more rules in live stream]`
            : '')
      );
    } catch {
      setRawPreview('# Failed to fetch live master buffer stream.');
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchPreview(selectedFormat);
  }, [selectedFormat, settings?.stripSubdomains, stats?.lastMasterBuild]);

  const handleSelectFormat = (fmt: OutputFormat) => {
    setSelectedFormat(fmt);
    onUpdateFormat(fmt);
    fetchPreview(fmt);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(masterUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(`curl -s "${masterUrl}" | head -n 30`);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const downloadMasterFile = () => {
    window.open(`/api/master.txt?format=${selectedFormat}&download=true`, '_blank');
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatsList: Array<{
    id: OutputFormat;
    name: string;
    example: string;
    desc: string;
    target: string;
  }> = [
    {
      id: 'adguard',
      name: 'AdGuard Home',
      example: '||example.com^',
      desc: 'Native wildcard format for AdGuard Home DNS sinkhole',
      target: 'AdGuard Home',
    },
    {
      id: 'pihole',
      name: 'Pi-hole / Hosts',
      example: '0.0.0.0 example.com',
      desc: 'Standard IPv4 / IPv6 hosts file format for Pi-hole gravity adlists',
      target: 'Pi-hole FTL',
    },
    {
      id: 'rpz',
      name: 'RPZ (Response Policy Zone)',
      example: 'example.com CNAME .\n*.example.com CNAME .',
      desc: 'Standard DNS Response Policy Zone for BIND 9, Knot, and PowerDNS',
      target: 'BIND 9 / Knot',
    },
    {
      id: 'dnsmasq',
      name: 'Dnsmasq',
      example: 'address=/example.com/0.0.0.0',
      desc: 'Server address block rules for dnsmasq and OpenWrt routers',
      target: 'OpenWrt / Dnsmasq',
    },
    {
      id: 'unbound',
      name: 'Unbound DNS',
      example: 'local-zone: "example.com" static',
      desc: 'Local-zone static declarations for Unbound validating resolvers',
      target: 'Unbound / OPNsense',
    },
    {
      id: 'domains',
      name: 'Plain Domains',
      example: 'example.com',
      desc: 'Raw domain list with one domain per line',
      target: 'Generic Sinkholes',
    },
    {
      id: 'wildcard',
      name: 'Wildcard Regex',
      example: '*.example.com',
      desc: 'Glob wildcard pattern for proxies and firewalls',
      target: 'Custom Proxies',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Variation 7 Grid Layout: Main Column + Aside Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section: URL Bar as in Variation 7 */}
          <div className="stat-box flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <span className="label-mono text-[10px] shrink-0 sm:w-24">MASTER FEED</span>
            <input
              type="text"
              readOnly
              value={masterUrl}
              className="flex-1 bg-transparent border border-[var(--border-color)] px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none select-all truncate"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={copyUrl}
                className="btn-mono btn-mono-accent text-xs px-4 py-2"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>COPY</span>
                  </>
                )}
              </button>
              <button
                onClick={downloadMasterFile}
                className="btn-mono text-xs px-3 py-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)]"
                title="Download Master List"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Section: Output Format Selector */}
          <div className="stat-box space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <span className="label-mono">OUTPUT FORMAT SPECIFICATION</span>
                <h3 className="text-base font-bold text-[var(--text-primary)] mt-1">
                  Format Conversion Engine
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-[var(--text-muted)]">SUBDOMAINS:</span>
                <button
                  onClick={() => onUpdateSubdomainPruning(!(settings?.stripSubdomains ?? true))}
                  className={`btn-mono text-[10px] py-1 px-2.5 ${
                    (settings?.stripSubdomains ?? true)
                      ? 'btn-mono-accent'
                      : 'bg-[var(--bg-surface-secondary)] text-[var(--text-muted)]'
                  }`}
                >
                  {(settings?.stripSubdomains ?? true) ? 'PRUNE ACTIVE' : 'RAW PRESERVED'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {formatsList.map((fmt) => {
                const isSelected = selectedFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => handleSelectFormat(fmt.id)}
                    className={`p-3 text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-faint)] ring-1 ring-[var(--accent)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--border-subtle)]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                      <span>{fmt.name}</span>
                      {isSelected && (
                        <span className="font-mono text-[9px] text-[var(--accent)] border border-[var(--accent)] px-1">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-[var(--accent)] bg-[var(--bg-page)] p-1.5 mt-2 border border-[var(--border-color)] truncate">
                      {fmt.example.split('\n')[0]}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-1.5 line-clamp-1">
                      {fmt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Platform Integration Quick Cards (AdGuard, Pi-hole, RPZ/BIND) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-box space-y-2">
              <span className="label-mono">ADGUARD HOME</span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Filters &gt; DNS blocklists &gt; Add custom blocklist.<br />
                Enter URL: <span className="font-mono text-[11px] text-[var(--accent)]">{masterUrl}</span>
              </p>
            </div>

            <div className="stat-box space-y-2">
              <span className="label-mono">PI-HOLE</span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Add feed to Adlists: <span className="font-mono text-[11px] text-[var(--accent)]">format=pihole</span>.<br />
                Run <code className="font-mono text-[11px] text-[var(--text-primary)]">pihole -g</code> (gravity).
              </p>
            </div>

            <div className="stat-box space-y-2">
              <span className="label-mono">RPZ / BIND</span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Define <code className="font-mono text-[11px] text-[var(--text-primary)]">response-policy</code> in named.conf.<br />
                Stream BIND master zone on port 3000.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar as in Variation 7 (4 cols on lg) */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Filter Pipeline Panel */}
          <div className="stat-box space-y-3">
            <span className="label-mono">FILTER PIPELINE</span>
            <div className="space-y-2.5 pt-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[var(--text-muted)]">Raw Ingest</span>
                <span className="text-[var(--text-primary)] font-semibold">
                  {(opt?.rawDomainsTotal || stats?.totalRawDomains || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[var(--text-muted)]">De-duplicated</span>
                <span className="text-[var(--accent)] font-semibold">
                  -{(opt?.exactDuplicatesRemoved || stats?.duplicatesRemoved || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[var(--text-muted)]">Subdomains Pruned</span>
                <span className="text-sky-400 font-semibold">
                  -{(opt?.redundantSubdomainsPruned || 0).toLocaleString()}
                </span>
              </div>
              <div className="border-t border-[var(--border-color)] pt-2.5 flex justify-between items-center font-mono">
                <span className="text-xs font-bold text-[var(--text-primary)]">TOTAL ACTIVE</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {(opt?.finalRuleCount || stats?.masterUniqueDomains || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Live Buffer Panel */}
          <div className="stat-box space-y-3">
            <div className="flex items-center justify-between">
              <span className="label-mono">LIVE BUFFER</span>
              <button
                onClick={() => fetchPreview(selectedFormat)}
                disabled={loadingPreview}
                className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingPreview ? 'animate-spin' : ''}`} />
                <span>REFRESH</span>
              </button>
            </div>
            <pre className="font-mono text-[11px] leading-relaxed bg-[var(--bg-page)] border border-[var(--border-color)] p-3 max-h-56 overflow-x-auto text-[var(--accent)] select-all">
              {loadingPreview ? '# Streaming live buffer...' : rawPreview}
            </pre>
          </div>

          {/* Memory Footprint Panel */}
          <div className="stat-box space-y-1">
            <span className="label-mono">MEMORY FOOTPRINT SAVINGS</span>
            <div className="stat-huge text-emerald-400 mt-1">
              {opt ? formatBytes(opt.estimatedRamSavedBytes) : '0 KB'}
            </div>
            <p className="font-mono text-[10px] text-[var(--text-muted)]">
              REDUCED PAYLOAD BY -{opt ? opt.payloadReductionPercentage : 0}% OVER WIRE
            </p>
          </div>

          {/* Quick cURL Bar */}
          <div className="stat-box space-y-2">
            <span className="label-mono">QUICK VERIFICATION</span>
            <div className="font-mono text-[10px] bg-[var(--bg-page)] p-2 border border-[var(--border-color)] text-[var(--text-secondary)] break-all">
              curl -s &quot;{masterUrl}&quot; | head -n 30
            </div>
            <button
              onClick={copyCurl}
              className="btn-mono w-full text-[10px] py-1.5"
            >
              {copiedCurl ? 'COMMAND COPIED' : 'COPY CURL COMMAND'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
