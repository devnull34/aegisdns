import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Check,
  CheckCircle,
  Compass,
  Copy,
  Cpu,
  Globe,
  Globe2,
  Info,
  Layers,
  Lock,
  MapPin,
  Navigation,
  Play,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Wifi,
  Zap,
} from 'lucide-react';
import {
  ConnectionType,
  DnsBenchmarkResult,
  DnsLeakTestResult,
  DnsLookupResult,
  DnsProtocol,
  DnsRecommendationResult,
  DnsServerGeoData,
  UpstreamDnsServer,
  WhoisResult,
} from '../types/blocklist';
import { DnsGeoMap } from './DnsGeoMap';

export const DnsToolsTab: React.FC = () => {
  const [activeTool, setActiveTool] = useState<
    'recommendation' | 'benchmark' | 'leak' | 'nslookup' | 'whois'
  >('recommendation');

  // Recommendation Engine & GeoIP State
  const [connectionType, setConnectionType] = useState<ConnectionType>('fiber');
  const [recommendationProtocol, setRecommendationProtocol] = useState<DnsProtocol>('regular');
  const [recommendationData, setRecommendationData] = useState<DnsRecommendationResult | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [appliedSuccessMsg, setAppliedSuccessMsg] = useState<string | null>(null);

  // Benchmark state
  const [protocol, setProtocol] = useState<DnsProtocol>('regular');
  const [benchmarkResults, setBenchmarkResults] = useState<DnsBenchmarkResult[]>([]);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);
  const [copiedUpstream, setCopiedUpstream] = useState(false);

  // Leak test state
  const [leakResult, setLeakResult] = useState<DnsLeakTestResult | null>(null);
  const [isTestingLeak, setIsTestingLeak] = useState(false);

  // NSLookup state
  const [lookupDomain, setLookupDomain] = useState('google.com');
  const [lookupType, setLookupType] = useState<
    'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'PTR' | 'SOA' | 'CAA'
  >('A');
  const [lookupServer, setLookupServer] = useState('1.1.1.1');
  const [lookupProtocol, setLookupProtocol] = useState<DnsProtocol>('regular');
  const [lookupResult, setLookupResult] = useState<DnsLookupResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // WHOIS state
  const [whoisDomain, setWhoisDomain] = useState('github.com');
  const [whoisResult, setWhoisResult] = useState<WhoisResult | null>(null);
  const [isWhoisLoading, setIsWhoisLoading] = useState(false);

  // Load initial recommendation and benchmark on mount
  useEffect(() => {
    loadRecommendations(connectionType, recommendationProtocol);
    if (benchmarkResults.length === 0) {
      runBenchmark(protocol);
    }
  }, []);

  const loadRecommendations = async (
    connType: ConnectionType = connectionType,
    proto: DnsProtocol = recommendationProtocol
  ) => {
    setIsLoadingRecommendations(true);
    setRecommendationError(null);
    try {
      const res = await fetch(
        `/api/dns/recommendations?connectionType=${connType}&protocol=${proto}`
      );
      if (!res.ok) throw new Error(`Recommendation query failed: ${res.statusText}`);
      const data: DnsRecommendationResult = await res.json();
      setRecommendationData(data);
      if (data.topRecommendations.primary) {
        setSelectedServerId(data.topRecommendations.primary.id);
      }
    } catch (err: any) {
      setRecommendationError(err.message || 'Failed to compute upstream DNS recommendations');
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const runBenchmark = async (selectedProto: DnsProtocol = protocol) => {
    setIsBenchmarking(true);
    setBenchmarkError(null);
    try {
      const res = await fetch(`/api/dns/benchmark?protocol=${selectedProto}`);
      if (!res.ok) throw new Error(`Benchmark failed: ${res.statusText}`);
      const data: DnsBenchmarkResult[] = await res.json();
      setBenchmarkResults(data);
    } catch (err: any) {
      setBenchmarkError(err.message || 'Failed to benchmark upstream DNS servers');
    } finally {
      setIsBenchmarking(false);
    }
  };

  const runLeakTest = async () => {
    setIsTestingLeak(true);
    try {
      const res = await fetch('/api/dns/leak-test');
      if (res.ok) {
        const data = await res.json();
        setLeakResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTestingLeak(false);
    }
  };

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!lookupDomain.trim()) return;
    setIsLookingUp(true);
    try {
      const res = await fetch(
        `/api/dns/lookup?domain=${encodeURIComponent(
          lookupDomain.trim()
        )}&type=${lookupType}&server=${encodeURIComponent(lookupServer)}&protocol=${lookupProtocol}`
      );
      const data = await res.json();
      setLookupResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleWhois = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!whoisDomain.trim()) return;
    setIsWhoisLoading(true);
    try {
      const res = await fetch(`/api/dns/whois?domain=${encodeURIComponent(whoisDomain.trim())}`);
      const data = await res.json();
      setWhoisResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsWhoisLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUpstream(true);
    setTimeout(() => setCopiedUpstream(false), 2000);
  };

  const applyAsUpstream = async (server: DnsServerGeoData) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upstreamDns: server.endpoint }),
      });
      if (res.ok) {
        setAppliedSuccessMsg(`Configured ${server.name} (${server.endpoint}) as active AdGuard upstream DNS!`);
        setTimeout(() => setAppliedSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fastestServer = benchmarkResults.find((r) => r.isFastest && r.reliabilityPercent > 0);

  return (
    <div className="space-y-6">
      {/* AdGuard Home Sub-Navigation for DNS Tools */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => {
              setActiveTool('recommendation');
              if (!recommendationData) loadRecommendations(connectionType, recommendationProtocol);
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTool === 'recommendation'
                ? 'bg-[var(--color-adguard)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Recommendation Engine</span>
            <span className="text-[10px] bg-amber-400 text-slate-900 font-bold px-1.5 py-0.2 rounded-full uppercase">
              GeoIP & Map
            </span>
          </button>

          <button
            onClick={() => setActiveTool('benchmark')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTool === 'benchmark'
                ? 'bg-[var(--color-adguard)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>DNS Benchmark (GRC Style)</span>
          </button>

          <button
            onClick={() => {
              setActiveTool('leak');
              if (!leakResult) runLeakTest();
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTool === 'leak'
                ? 'bg-[var(--color-adguard)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>DNS Leak Test</span>
          </button>

          <button
            onClick={() => {
              setActiveTool('nslookup');
              if (!lookupResult) handleLookup();
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTool === 'nslookup'
                ? 'bg-[var(--color-adguard)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>nslookup & dig</span>
          </button>

          <button
            onClick={() => {
              setActiveTool('whois');
              if (!whoisResult) handleWhois();
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTool === 'whois'
                ? 'bg-[var(--color-adguard)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>WHOIS / RDAP</span>
          </button>
        </div>

        <div className="text-xs text-[var(--text-muted)] pr-2">
          Diagnostic utilities & GeoIP intelligence for AdGuard Home upstream resolvers
        </div>
      </div>

      {appliedSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">{appliedSuccessMsg}</span>
          </div>
          <button
            onClick={() => setAppliedSuccessMsg(null)}
            className="text-emerald-400 hover:text-white text-xs px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TOOL 0: RECOMMENDATION ENGINE & GEOIP TOPOLOGY MAP */}
      {/* ========================================================= */}
      {activeTool === 'recommendation' && (
        <div className="space-y-6">
          {/* Engine Header & Connection Profile Selector */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col xl:flex-row xl:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-adguard)] flex items-center justify-center text-white shadow-sm">
                  <Sparkles className="w-4 h-4 fill-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span>Upstream DNS Recommendation Engine</span>
                    <span className="text-[11px] font-semibold text-[var(--color-adguard)] bg-[var(--color-adguard-subtle)] px-2 py-0.5 rounded border border-[var(--color-adguard)]/30">
                      Geodesic GeoIP + Network Weighting
                    </span>
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Synthesizes physical distance (Haversine km), speed-of-light in fiber latency, and live benchmark performance tailored to your connection type.
                  </p>
                </div>
              </div>
            </div>

            {/* Connection Type & Protocol Selector Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Connection Type */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Your Connection Profile
                </span>
                <div className="flex items-center p-1 rounded-xl bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] text-xs">
                  {(
                    [
                      { type: 'fiber', label: 'Fiber', icon: Zap },
                      { type: 'cable', label: 'Cable', icon: Wifi },
                      { type: 'cellular', label: '5G/4G', icon: Radio },
                      { type: 'satellite', label: 'Satellite', icon: Navigation },
                      { type: 'dsl', label: 'DSL', icon: Activity },
                    ] as const
                  ).map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => {
                        setConnectionType(type);
                        loadRecommendations(type, recommendationProtocol);
                      }}
                      disabled={isLoadingRecommendations}
                      className={`px-3 py-1.5 font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                        connectionType === type
                          ? 'bg-[var(--color-adguard)] text-white font-semibold shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Protocol */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Protocol
                </span>
                <div className="flex items-center p-1 rounded-xl bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] text-xs">
                  {(['regular', 'https', 'tls', 'quic'] as DnsProtocol[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setRecommendationProtocol(p);
                        loadRecommendations(connectionType, p);
                      }}
                      disabled={isLoadingRecommendations}
                      className={`px-2.5 py-1.5 font-medium rounded-lg transition-colors ${
                        recommendationProtocol === p
                          ? 'bg-[var(--color-adguard)] text-white font-semibold shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {p === 'regular' ? 'DNS:53' : p === 'https' ? 'DoH' : p === 'tls' ? 'DoT' : 'DoQ'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => loadRecommendations(connectionType, recommendationProtocol)}
                  disabled={isLoadingRecommendations}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[var(--color-adguard)] hover:bg-[var(--color-adguard-hover)] disabled:opacity-50 rounded-xl shadow-sm transition-colors mt-4 sm:mt-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRecommendations ? 'animate-spin' : ''}`} />
                  <span>{isLoadingRecommendations ? 'Analyzing...' : 'Re-Analyze'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* User Location & Upstream Detection Banner */}
          {recommendationData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Local User Location Card */}
              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-bold text-lg shrink-0">
                  {recommendationData.userLocation.flagEmoji || '📍'}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] block">
                    Your Detected Location
                  </span>
                  <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                    {recommendationData.userLocation.city}, {recommendationData.userLocation.country}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] font-mono truncate">
                    {recommendationData.userLocation.ip} · {recommendationData.userLocation.isp}
                  </div>
                </div>
              </div>

              {/* Current Upstream DNS Card */}
              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center font-bold text-lg shrink-0">
                  🏠
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] block">
                    Current Upstream Resolver
                  </span>
                  <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                    {recommendationData.currentUpstream.name}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] truncate">
                    Distance: <strong className="text-emerald-500">0 km (Local LAN)</strong> · Ping: <strong>{recommendationData.currentUpstream.rawBenchmarkLatencyMs} ms</strong>
                  </div>
                </div>
              </div>

              {/* Recommendation Rationale Callout */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[var(--color-adguard-subtle)] to-[var(--bg-surface)] border border-[var(--color-adguard)]/30 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-adguard)] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Zap className="w-5 h-5 fill-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-adguard)] block">
                    Recommended #1 Upstream
                  </span>
                  <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                    {recommendationData.topRecommendations.primary.name}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] truncate">
                    Weighed: <strong className="text-[var(--color-adguard)]">{recommendationData.topRecommendations.primary.weighedLatencyMs} ms</strong> (Distance: {recommendationData.topRecommendations.primary.distanceKm} km)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Geographic Distance Map */}
          {recommendationData && (
            <DnsGeoMap
              userLocation={recommendationData.userLocation}
              servers={recommendationData.servers}
              selectedServerId={selectedServerId}
              onSelectServer={(srv) => setSelectedServerId(srv.id)}
              activeConnectionType={connectionType}
            />
          )}

          {/* Top Recommendation Cards Grid */}
          {recommendationData && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Tailored Upstream Recommendations</span>
                </h3>
                <span className="text-xs text-[var(--text-muted)]">
                  Optimized for {recommendationData.userLocation.city} on {connectionType.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Optimal Overall Pick */}
                {(() => {
                  const s = recommendationData.topRecommendations.primary;
                  return (
                    <div className="p-4 rounded-xl bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-surface-secondary)] border-2 border-emerald-500/50 shadow-sm flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                        #1 Optimal Pick
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">{s.geo.flagEmoji}</span>
                          <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {s.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                          {s.rationale}
                        </p>
                        <div className="mt-3 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-muted)]">Distance:</span>
                            <span className="font-semibold text-sky-500">{s.distanceKm} km ({s.distanceMiles} mi)</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-muted)]">Raw GRC Score:</span>
                            <span className="font-semibold text-[var(--text-primary)]">{s.rawBenchmarkLatencyMs} ms</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-muted)]">Distance Penalty:</span>
                            <span className="font-semibold text-amber-500">+{s.distancePenaltyMs} ms</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]">
                            <span className="font-bold text-[var(--text-primary)]">Weighed Latency:</span>
                            <span className="text-sm font-extrabold text-emerald-500">{s.weighedLatencyMs} ms</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center gap-2">
                        <button
                          onClick={() => applyAsUpstream(s)}
                          className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                        >
                          Apply to AdGuard
                        </button>
                        <button
                          onClick={() => copyToClipboard(s.endpoint)}
                          title="Copy upstream endpoint"
                          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-secondary)] rounded border border-[var(--border-color)]"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Lowest Raw Ping */}
                {(() => {
                  const s = recommendationData.topRecommendations.fastest;
                  return (
                    <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex flex-col justify-between relative">
                      <div className="absolute top-0 right-0 bg-sky-500 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                        Lowest Raw Ping
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">{s.geo.flagEmoji}</span>
                          <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {s.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                          {s.rationale || 'Fastest roundtrip response time on raw benchmark.'}
                        </p>
                        <div className="mt-3 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-muted)]">Distance:</span>
                            <span className="font-semibold text-sky-500">{s.distanceKm} km</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-muted)]">Raw Ping:</span>
                            <span className="text-sm font-bold text-sky-500">{s.rawBenchmarkLatencyMs} ms</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-muted)]">Cached Latency:</span>
                            <span className="font-semibold text-emerald-500">{s.cachedLatencyMs} ms</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]">
                            <span className="font-bold text-[var(--text-primary)]">Weighed:</span>
                            <span className="font-bold text-[var(--text-primary)]">{s.weighedLatencyMs} ms</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center gap-2">
                        <button
                          onClick={() => applyAsUpstream(s)}
                          className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-surface-secondary)] hover:bg-[var(--color-adguard)] hover:text-white text-[var(--text-primary)] transition-colors border border-[var(--border-color)]"
                        >
                          Apply to AdGuard
                        </button>
                        <button
                          onClick={() => copyToClipboard(s.endpoint)}
                          title="Copy upstream endpoint"
                          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-secondary)] rounded border border-[var(--border-color)]"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Best Security & AdBlock */}
                {(() => {
                  const s = recommendationData.topRecommendations.bestSecurity;
                  return (
                    <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex flex-col justify-between relative">
                      <div className="absolute top-0 right-0 bg-[var(--color-adguard)] text-white font-bold text-[10px] px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                        Best AdBlock & Security
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">{s.geo.flagEmoji}</span>
                          <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {s.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                          {s.rationale || 'Built-in real-time malware filtering, phishing shield, and tracking blocker.'}
                        </p>
                        <div className="mt-3 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-muted)]">Distance:</span>
                            <span className="font-semibold text-sky-500">{s.distanceKm} km</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-muted)]">Threat Filter:</span>
                            <span className="font-semibold text-emerald-500">Active Enabled</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-muted)]">DNSSEC:</span>
                            <span className="font-semibold text-emerald-500">Enforced</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]">
                            <span className="font-bold text-[var(--text-primary)]">Weighed:</span>
                            <span className="font-bold text-[var(--text-primary)]">{s.weighedLatencyMs} ms</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center gap-2">
                        <button
                          onClick={() => applyAsUpstream(s)}
                          className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-surface-secondary)] hover:bg-[var(--color-adguard)] hover:text-white text-[var(--text-primary)] transition-colors border border-[var(--border-color)]"
                        >
                          Apply to AdGuard
                        </button>
                        <button
                          onClick={() => copyToClipboard(s.endpoint)}
                          title="Copy upstream endpoint"
                          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-secondary)] rounded border border-[var(--border-color)]"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Maximum Privacy / Zero-Log */}
                {(() => {
                  const s = recommendationData.topRecommendations.mostPrivate;
                  return (
                    <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex flex-col justify-between relative">
                      <div className="absolute top-0 right-0 bg-indigo-500 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                        Max Privacy
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">{s.geo.flagEmoji}</span>
                          <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {s.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                          {s.rationale || 'Strict zero-logging policy under Swiss/European privacy frameworks.'}
                        </p>
                        <div className="mt-3 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-muted)]">Distance:</span>
                            <span className="font-semibold text-sky-500">{s.distanceKm} km</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-muted)]">Logging:</span>
                            <span className="font-semibold text-emerald-500">Zero Logs (Strict)</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-muted)]">Jurisdiction:</span>
                            <span className="font-semibold text-[var(--text-primary)]">{s.geo.country}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]">
                            <span className="font-bold text-[var(--text-primary)]">Weighed:</span>
                            <span className="font-bold text-[var(--text-primary)]">{s.weighedLatencyMs} ms</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center gap-2">
                        <button
                          onClick={() => applyAsUpstream(s)}
                          className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-surface-secondary)] hover:bg-[var(--color-adguard)] hover:text-white text-[var(--text-primary)] transition-colors border border-[var(--border-color)]"
                        >
                          Apply to AdGuard
                        </button>
                        <button
                          onClick={() => copyToClipboard(s.endpoint)}
                          title="Copy upstream endpoint"
                          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-secondary)] rounded border border-[var(--border-color)]"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Full Distance & Weighed Latency Comparison Table */}
          {recommendationData && (
            <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Upstream DNS Ranking: Distance & Weighed Latency Matrix
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Click any resolver to inspect its connection path and details on the global map.
                  </p>
                </div>
                <div className="text-xs text-[var(--text-muted)] font-mono">
                  {recommendationData.servers.length} locations mapped
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] bg-[var(--bg-surface-secondary)] text-[var(--text-secondary)]">
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Rank & Provider</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Location & POP</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-right">Physical Distance</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-right">Speed-of-Light RTT</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-right">Raw Ping</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-right">Distance Penalty</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-right">Weighed Latency</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-right">Efficiency</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {recommendationData.servers
                      .sort((a, b) => {
                        if (a.isCurrentUpstream) return -1;
                        if (b.isCurrentUpstream) return 1;
                        return a.recommendationScore - b.recommendationScore;
                      })
                      .map((s, idx) => {
                        const isSelected = s.id === selectedServerId;
                        const isOptimal = s.recommendationRank === 1;

                        return (
                          <tr
                            key={s.id}
                            onClick={() => setSelectedServerId(s.id)}
                            className={`hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-sky-500/10'
                                : isOptimal
                                ? 'bg-emerald-500/5'
                                : ''
                            }`}
                          >
                            {/* Provider */}
                            <td className="py-3.5 px-4 font-medium">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                    s.isCurrentUpstream
                                      ? 'bg-indigo-600 text-white'
                                      : isOptimal
                                      ? 'bg-emerald-500 text-white'
                                      : idx <= 3
                                      ? 'bg-sky-500/20 text-sky-400'
                                      : 'bg-[var(--bg-surface-secondary)] text-[var(--text-muted)]'
                                  }`}
                                >
                                  {s.isCurrentUpstream ? 'H' : isOptimal ? '★' : s.recommendationRank}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-[var(--text-primary)]">
                                      {s.name}
                                    </span>
                                    {s.recommendationBadge && (
                                      <span
                                        className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                                          isOptimal
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-[var(--bg-surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                                        }`}
                                      >
                                        {s.recommendationBadge}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                                    {s.ip}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Location */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{s.geo.flagEmoji}</span>
                                <div>
                                  <span className="font-semibold text-[var(--text-primary)] block">
                                    {s.geo.city}
                                  </span>
                                  <span className="text-[11px] text-[var(--text-muted)] truncate block max-w-[150px]">
                                    {s.geo.country}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Distance */}
                            <td className="py-3.5 px-4 text-right tabular-nums">
                              {s.isCurrentUpstream || s.distanceKm === 0 ? (
                                <span className="text-emerald-500 font-semibold">0 km (Local)</span>
                              ) : (
                                <div>
                                  <span className="font-semibold text-sky-500">
                                    {s.distanceKm.toLocaleString()} km
                                  </span>
                                  <span className="text-[10px] text-[var(--text-muted)] block">
                                    {s.distanceMiles.toLocaleString()} mi
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Speed of Light RTT */}
                            <td className="py-3.5 px-4 text-right tabular-nums text-[var(--text-muted)]">
                              {s.theoreticalLatencyMs} ms
                            </td>

                            {/* Raw Ping */}
                            <td className="py-3.5 px-4 text-right tabular-nums font-semibold text-[var(--text-primary)]">
                              {s.rawBenchmarkLatencyMs} ms
                            </td>

                            {/* Distance Penalty */}
                            <td className="py-3.5 px-4 text-right tabular-nums">
                              {s.distancePenaltyMs > 0 ? (
                                <span className="text-amber-500 font-medium">+{s.distancePenaltyMs} ms</span>
                              ) : (
                                <span className="text-emerald-500 font-medium">0 ms</span>
                              )}
                            </td>

                            {/* Weighed Latency */}
                            <td className="py-3.5 px-4 text-right tabular-nums">
                              <span
                                className={`text-sm font-extrabold ${
                                  isOptimal
                                    ? 'text-emerald-500'
                                    : s.isCurrentUpstream
                                    ? 'text-indigo-400'
                                    : 'text-[var(--color-adguard)]'
                                }`}
                              >
                                {s.weighedLatencyMs} ms
                              </span>
                            </td>

                            {/* Efficiency */}
                            <td className="py-3.5 px-4 text-right tabular-nums font-mono text-emerald-500">
                              {s.efficiencyIndex > 100 ? '999+' : s.efficiencyIndex} km/ms
                            </td>

                            {/* Action */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    applyAsUpstream(s);
                                  }}
                                  title="Set as active AdGuard Home upstream"
                                  className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-[var(--color-adguard)] hover:bg-[var(--color-adguard-hover)] text-white transition-colors"
                                >
                                  Apply
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(s.endpoint);
                                  }}
                                  title="Copy upstream endpoint"
                                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-secondary)] rounded transition-colors"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TOOL 1: DNS BENCHMARK (GIBSON RESEARCH DNS BENCH STYLE) */}
      {/* ========================================================= */}
      {activeTool === 'benchmark' && (
        <div className="space-y-6">
          {/* Header & Protocol Bar */}
          <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>DNS Upstream Benchmark</span>
                <span className="text-[11px] font-medium text-[var(--color-adguard)] bg-[var(--color-adguard-subtle)] px-2 py-0.5 rounded border border-[var(--color-adguard)]/30">
                  GRC Methodology
                </span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Computes optimal upstream resolver based on Gibson Research Corporation weighted metrics: 40% cached, 40% uncached, and 20% dot-com lookup.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Protocol Selector */}
              <div className="flex items-center p-1 rounded-lg bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] text-xs">
                {(['regular', 'https', 'tls', 'quic'] as DnsProtocol[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setProtocol(p);
                      runBenchmark(p);
                    }}
                    disabled={isBenchmarking}
                    className={`px-3 py-1 font-medium rounded-md transition-colors ${
                      protocol === p
                        ? 'bg-[var(--color-adguard)] text-white font-semibold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {p === 'regular' ? 'DNS:53' : p === 'https' ? 'DoH' : p === 'tls' ? 'DoT' : 'DoQ'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => runBenchmark(protocol)}
                disabled={isBenchmarking}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[var(--color-adguard)] hover:bg-[var(--color-adguard-hover)] disabled:opacity-50 rounded-lg shadow-sm transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBenchmarking ? 'animate-spin' : ''}`} />
                <span>{isBenchmarking ? 'Testing Resolvers...' : 'Run Benchmark'}</span>
              </button>
            </div>
          </div>

          {/* Quick jump to recommendation engine */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-[var(--bg-surface)] to-[var(--bg-surface)] border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Want Location-Aware Distance & Connection Optimization?
                </span>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  The Recommendation Engine uses GeoIP to calculate distance penalties and speed-of-light efficiency for your specific connection line.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTool('recommendation')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 transition-colors shrink-0 flex items-center gap-1.5"
            >
              <span>Open Recommendation Engine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Optimal Upstream DNS Recommendation Card */}
          {fastestServer && !isBenchmarking && (
            <div className="p-5 rounded-xl bg-gradient-to-r from-[var(--color-adguard-subtle)] via-[var(--bg-surface)] to-[var(--bg-surface)] border border-[var(--color-adguard)]/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-adguard)] flex items-center justify-center text-white shrink-0 shadow-md">
                  <Zap className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-adguard)]">
                      Optimal Upstream Provider Recommended
                    </span>
                    <span className="text-[10px] bg-[var(--color-adguard)] text-white font-semibold px-2 py-0.2 rounded-full">
                      #1 Fastest
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                    {fastestServer.serverName} ({fastestServer.provider})
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] mt-1.5">
                    <span>
                      Weighted Score: <strong className="text-[var(--color-adguard)]">{fastestServer.weightedScoreMs} ms</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Cached: <strong>{fastestServer.cachedLatencyMs} ms</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Uncached: <strong>{fastestServer.uncachedLatencyMs} ms</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Dot-Com: <strong>{fastestServer.dotComLatencyMs} ms</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="font-mono text-xs px-3 py-2 rounded-lg bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] truncate max-w-xs">
                  {fastestServer.endpoint}
                </div>
                <button
                  onClick={() => copyToClipboard(fastestServer.endpoint)}
                  title="Copy upstream server string for AdGuard Home"
                  className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[var(--color-adguard)] text-white hover:bg-[var(--color-adguard-hover)] transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedUpstream ? 'Copied!' : 'Copy for AdGuard'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Benchmark Results Chart & Table */}
          <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Performance Ranking & Latency Breakdown
                </h3>
                <span className="text-xs text-[var(--text-muted)]">
                  ({benchmarkResults.length} known public DNS servers tested)
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[var(--text-secondary)]">Cached (40%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <span className="text-[var(--text-secondary)]">Uncached (40%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-[var(--text-secondary)]">.com (20%)</span>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[var(--border-color)]">
              {benchmarkResults.map((result, idx) => {
                return (
                  <div key={result.serverId} className="p-4 hover:bg-[var(--bg-surface-hover)] transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* Server Title & Provider */}
                      <div className="flex items-center gap-3 min-w-[260px]">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                            idx === 0
                              ? 'bg-[var(--color-adguard)] text-white'
                              : idx === 1
                              ? 'bg-slate-300 dark:bg-slate-700 text-[var(--text-primary)]'
                              : idx === 2
                              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600'
                              : 'text-[var(--text-muted)]'
                          }`}
                        >
                          #{idx + 1}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[var(--text-primary)]">
                              {result.serverName}
                            </span>
                            {result.isFastest && (
                              <span className="text-[10px] text-[var(--color-adguard)] bg-[var(--color-adguard-subtle)] px-1.5 py-0.2 rounded font-medium border border-[var(--color-adguard)]/30">
                                Fastest
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono mt-0.5">
                            <span>{result.endpoint}</span>
                            <span>·</span>
                            <span>{result.protocol.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Visual Bar representation */}
                      <div className="flex-1 max-w-md mx-2">
                        <div className="h-3 rounded-full bg-[var(--bg-surface-secondary)] overflow-hidden flex">
                          <div
                            style={{
                              width: `${Math.min(
                                100,
                                (result.cachedLatencyMs / (result.weightedScoreMs || 1)) * 40
                              )}%`,
                            }}
                            className="bg-emerald-500 h-full"
                            title={`Cached: ${result.cachedLatencyMs}ms`}
                          />
                          <div
                            style={{
                              width: `${Math.min(
                                100,
                                (result.uncachedLatencyMs / (result.weightedScoreMs || 1)) * 40
                              )}%`,
                            }}
                            className="bg-sky-500 h-full"
                            title={`Uncached: ${result.uncachedLatencyMs}ms`}
                          />
                          <div
                            style={{
                              width: `${Math.min(
                                100,
                                (result.dotComLatencyMs / (result.weightedScoreMs || 1)) * 20
                              )}%`,
                            }}
                            className="bg-amber-500 h-full"
                            title={`.com: ${result.dotComLatencyMs}ms`}
                          />
                        </div>
                      </div>

                      {/* Latencies & Weighted Score */}
                      <div className="flex items-center gap-5 text-xs tabular-nums shrink-0">
                        <div className="text-center min-w-[55px]">
                          <span className="block text-[10px] text-[var(--text-muted)]">Cached</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {result.cachedLatencyMs} ms
                          </span>
                        </div>
                        <div className="text-center min-w-[55px]">
                          <span className="block text-[10px] text-[var(--text-muted)]">Uncached</span>
                          <span className="font-semibold text-sky-600 dark:text-sky-400">
                            {result.uncachedLatencyMs} ms
                          </span>
                        </div>
                        <div className="text-center min-w-[55px]">
                          <span className="block text-[10px] text-[var(--text-muted)]">.com</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {result.dotComLatencyMs} ms
                          </span>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <span className="block text-[10px] text-[var(--text-muted)] font-sans">Weighted</span>
                          <span className="text-sm font-bold text-[var(--color-adguard)]">
                            {result.weightedScoreMs} ms
                          </span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(result.endpoint)}
                          title="Copy upstream endpoint"
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-secondary)] rounded transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TOOL 2: DNS LEAK TEST */}
      {/* ========================================================= */}
      {activeTool === 'leak' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--color-adguard)]" />
                <span>DNS Leak Test</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Inspects resolver egress IP, autonomous system (ASN), and tests for unintended leakage to unencrypted ISP servers.
              </p>
            </div>
            <button
              onClick={runLeakTest}
              disabled={isTestingLeak}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[var(--color-adguard)] hover:bg-[var(--color-adguard-hover)] disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingLeak ? 'animate-spin' : ''}`} />
              <span>{isTestingLeak ? 'Analyzing Egress...' : 'Run Leak Test'}</span>
            </button>
          </div>

          {leakResult && (
            <div className="space-y-5">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  leakResult.hasLeak
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                {leakResult.hasLeak ? (
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-[var(--color-adguard)] shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    {leakResult.hasLeak ? 'Potential DNS Leak Detected' : 'No DNS Leaks Detected (Protected)'}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {leakResult.recommendation}
                  </p>
                </div>
              </div>

              {/* Detected Resolvers Table */}
              <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-[var(--border-color)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Detected Upstream Resolvers & Transit Gateways
                  </h3>
                </div>
                <div className="divide-y divide-[var(--border-color)]">
                  {leakResult.detectedServers.map((srv, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            srv.isSafe ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <div>
                          <span className="font-mono font-semibold text-[var(--text-primary)]">
                            {srv.ip}
                          </span>
                          <span className="text-[var(--text-muted)] ml-2">
                            ({srv.hostname || srv.providerName})
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-[var(--text-secondary)]">{srv.org}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TOOL 3: NSLOOKUP & DIG */}
      {/* ========================================================= */}
      {activeTool === 'nslookup' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--color-adguard)]" />
              <span>nslookup & DNS Query Tool</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Directly query records (A, AAAA, CNAME, MX, TXT, NS, PTR, SOA, CAA) against any upstream resolver with response latency metrics.
            </p>

            <form onSubmit={handleLookup} className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Target Domain
                </label>
                <input
                  type="text"
                  value={lookupDomain}
                  onChange={(e) => setLookupDomain(e.target.value)}
                  placeholder="e.g. google.com"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-adguard)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Record Type
                </label>
                <select
                  value={lookupType}
                  onChange={(e) => setLookupType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-adguard)]"
                >
                  {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SOA', 'CAA'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  DNS Resolver
                </label>
                <select
                  value={lookupServer}
                  onChange={(e) => setLookupServer(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-adguard)]"
                >
                  <option value="192.168.1.1">Current Upstream DNS (192.168.1.1)</option>
                  <option value="94.140.14.14">AdGuard Default (94.140.14.14)</option>
                  <option value="1.1.1.1">Cloudflare (1.1.1.1)</option>
                  <option value="8.8.8.8">Google (8.8.8.8)</option>
                  <option value="9.9.9.9">Quad9 (9.9.9.9)</option>
                  <option value="127.0.0.1">Local AdGuard Home (127.0.0.1)</option>
                </select>
              </div>

              <div className="md:col-span-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isLookingUp}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[var(--color-adguard)] hover:bg-[var(--color-adguard-hover)] disabled:opacity-50 rounded-lg shadow-sm transition-colors"
                >
                  <Search className={`w-3.5 h-3.5 ${isLookingUp ? 'animate-spin' : ''}`} />
                  <span>{isLookingUp ? 'Querying...' : 'Query DNS'}</span>
                </button>
              </div>
            </form>
          </div>

          {lookupResult && (
            <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--text-primary)]">Response Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-semibold ${
                      lookupResult.status === 'NOERROR'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-rose-500/10 text-rose-500'
                    }`}
                  >
                    {lookupResult.status}
                  </span>
                  <span className="text-[var(--text-muted)]">in {lookupResult.latencyMs} ms</span>
                </div>
                <span className="font-mono text-[var(--text-muted)]">Server: {lookupResult.server}</span>
              </div>

              <div className="p-5">
                {lookupResult.answers.length > 0 ? (
                  <div className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden font-mono text-xs">
                    {lookupResult.answers.map((ans, i) => (
                      <div key={i} className="p-3 flex items-center justify-between bg-[var(--bg-surface-secondary)]">
                        <div>
                          <span className="text-[var(--color-adguard)] font-semibold">{ans.type}</span>
                          <span className="text-[var(--text-muted)] ml-3">TTL: {ans.ttl}s</span>
                        </div>
                        <div className="font-bold text-[var(--text-primary)]">{ans.data}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-xs text-[var(--text-muted)] text-center">
                    {lookupResult.error || 'No records returned for this query.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TOOL 4: WHOIS / RDAP */}
      {/* ========================================================= */}
      {activeTool === 'whois' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[var(--color-adguard)]" />
              <span>WHOIS & RDAP Domain Inspector</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Query ICANN Registry Data Access Protocol (RDAP) for verified registration records, dates, name servers, and registrar information.
            </p>

            <form onSubmit={handleWhois} className="mt-4 flex gap-3">
              <input
                type="text"
                value={whoisDomain}
                onChange={(e) => setWhoisDomain(e.target.value)}
                placeholder="e.g. adguard.com or github.com"
                className="flex-1 px-3 py-2 text-xs rounded-lg bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-adguard)]"
              />
              <button
                type="submit"
                disabled={isWhoisLoading}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[var(--color-adguard)] hover:bg-[var(--color-adguard-hover)] disabled:opacity-50 rounded-lg shadow-sm transition-colors shrink-0"
              >
                <Search className={`w-3.5 h-3.5 ${isWhoisLoading ? 'animate-spin' : ''}`} />
                <span>{isWhoisLoading ? 'Querying...' : 'Lookup WHOIS'}</span>
              </button>
            </form>
          </div>

          {whoisResult && (
            <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-hidden shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  {whoisResult.domain}
                </h3>
                <span className="text-xs text-[var(--text-muted)]">
                  Registrar: <strong className="text-[var(--text-primary)]">{whoisResult.registrar}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-[var(--bg-surface-secondary)] border border-[var(--border-color)]">
                  <span className="text-[var(--text-muted)] block mb-1">Created Date</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {whoisResult.createdDate ? new Date(whoisResult.createdDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-surface-secondary)] border border-[var(--border-color)]">
                  <span className="text-[var(--text-muted)] block mb-1">Expiration Date</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {whoisResult.expiresDate ? new Date(whoisResult.expiresDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-surface-secondary)] border border-[var(--border-color)]">
                  <span className="text-[var(--text-muted)] block mb-1">Last Updated</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {whoisResult.updatedDate ? new Date(whoisResult.updatedDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {whoisResult.nameServers.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                    Authoritative Name Servers
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {whoisResult.nameServers.map((ns, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 text-xs font-mono rounded bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]"
                      >
                        {ns}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
