import React, { useState, useRef, useMemo } from 'react';
import {
  Compass,
  Maximize2,
  Minimize2,
  Navigation,
  RefreshCw,
  Zap,
  Shield,
  Lock,
  Layers,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import { DnsServerGeoData, GeoLocation } from '../types/blocklist';

interface DnsGeoMapProps {
  userLocation: GeoLocation;
  servers: DnsServerGeoData[];
  selectedServerId: string | null;
  onSelectServer: (server: DnsServerGeoData) => void;
  activeConnectionType: string;
}

// Convert geographic coordinates to SVG coordinates (Miller cylindrical / Equirectangular projection)
const SVG_WIDTH = 1000;
const SVG_HEIGHT = 520;

function geoToSvg(lat: number, lon: number): [number, number] {
  // Clamped latitude between -80 and 80 degrees for pleasant world view
  const clampedLat = Math.max(-75, Math.min(75, lat));
  // Normalize lon from -180..180 to 0..SVG_WIDTH
  const x = ((lon + 180) / 360) * SVG_WIDTH;
  // Equirectangular projection scaled
  const y = ((75 - clampedLat) / 150) * SVG_HEIGHT;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

// World Continents Geo Vector Paths (Lightweight, simplified high-res world topography)
const WORLD_CONTINENTS_PATHS = [
  // North America
  "M 120 70 L 160 55 L 210 45 L 280 50 L 320 70 L 300 110 L 260 140 L 230 180 L 210 220 L 235 240 L 245 270 L 220 280 L 195 240 L 160 210 L 130 170 L 105 130 L 110 90 Z",
  // Greenland
  "M 330 35 L 390 30 L 410 65 L 360 85 L 330 65 Z",
  // South America
  "M 240 280 L 290 290 L 330 330 L 350 380 L 320 440 L 280 480 L 260 450 L 240 370 L 225 320 Z",
  // Europe
  "M 460 85 L 520 75 L 560 90 L 580 130 L 530 155 L 490 170 L 460 150 L 440 120 L 450 95 Z",
  // Africa
  "M 460 180 L 540 180 L 570 230 L 580 290 L 540 370 L 500 410 L 460 370 L 440 280 L 440 220 Z",
  // Asia
  "M 570 70 L 680 60 L 790 70 L 860 110 L 880 160 L 840 210 L 780 230 L 720 210 L 670 240 L 620 220 L 580 160 Z",
  // Australia & New Zealand
  "M 780 340 L 860 330 L 890 380 L 860 430 L 800 420 L 770 380 Z",
  // Japan & Archipelagos
  "M 865 140 L 880 155 L 870 190 L 855 170 Z M 800 270 L 830 290 L 790 310 Z M 840 290 L 870 310 L 830 330 Z"
];

export const DnsGeoMap: React.FC<DnsGeoMapProps> = ({
  userLocation,
  servers,
  selectedServerId,
  onSelectServer,
  activeConnectionType,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [filterMode, setFilterMode] = useState<'all' | 'top3' | 'recommended'>('all');
  const [showArcs, setShowArcs] = useState(true);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // User coordinate on SVG
  const [userX, userY] = useMemo(
    () => geoToSvg(userLocation.latitude, userLocation.longitude),
    [userLocation.latitude, userLocation.longitude]
  );

  // Filtered servers based on view mode
  const displayedServers = useMemo(() => {
    if (filterMode === 'recommended') {
      return servers.filter(
        (s) => s.recommendationRank === 1 || s.isCurrentUpstream || s.recommendationBadge?.includes('#1')
      );
    }
    if (filterMode === 'top3') {
      return servers.filter((s) => s.recommendationRank <= 3 || s.isCurrentUpstream);
    }
    return servers;
  }, [servers, filterMode]);

  // Selected server details
  const activeServer = useMemo(
    () => servers.find((s) => s.id === selectedServerId) || servers.find((s) => s.recommendationRank === 1) || servers[0],
    [servers, selectedServerId]
  );

  // Pan & Zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoomIn = () => setZoom((z) => Math.min(3.5, Math.round((z + 0.3) * 10) / 10));
  const handleZoomOut = () => setZoom((z) => Math.max(0.8, Math.round((z - 0.3) * 10) / 10));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCenterOnUser = () => {
    setZoom(1.6);
    // Center SVG coords (userX, userY) at viewport center
    const centerX = SVG_WIDTH / 2;
    const centerY = SVG_HEIGHT / 2;
    setPan({
      x: (centerX - userX) * 1.6,
      y: (centerY - userY) * 1.6,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(text);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  return (
    <div className="relative rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-hidden shadow-md">
      {/* Top Map Toolbar */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface-secondary)]/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Global DNS Topology & Geodesic Distance Map
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--text-muted)] border-l border-[var(--border-color)] pl-3">
            <span>Your Egress:</span>
            <span className="font-semibold text-[var(--text-primary)]">{userLocation.city}, {userLocation.country}</span>
            <span className="text-[11px] font-mono opacity-80">({userLocation.ip})</span>
          </div>
        </div>

        {/* View Controls & Filter Pills */}
        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center p-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[11px]">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-[var(--color-adguard)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All Resolvers ({servers.length})
            </button>
            <button
              onClick={() => setFilterMode('top3')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterMode === 'top3'
                  ? 'bg-[var(--color-adguard)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Top 3 Lowest
            </button>
            <button
              onClick={() => setFilterMode('recommended')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterMode === 'recommended'
                  ? 'bg-[var(--color-adguard)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              #1 Optimal
            </button>
          </div>

          {/* Toggle Arcs */}
          <button
            onClick={() => setShowArcs(!showArcs)}
            title="Toggle geodesic distance connection paths"
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              showArcs
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Arcs</span>
          </button>

          {/* Map Nav Buttons */}
          <div className="flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-0.5 text-xs">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-secondary)] rounded"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-secondary)] rounded"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCenterOnUser}
              title="Center on My Location"
              className="p-1.5 text-[var(--color-adguard)] hover:bg-[var(--bg-surface-secondary)] rounded"
            >
              <Navigation className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              title="Reset Map View"
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-secondary)] rounded"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative w-full h-[440px] select-none overflow-hidden bg-slate-950 cursor-${
          isDragging ? 'grabbing' : 'grab'
        }`}
      >
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <defs>
            {/* Background Grid Pattern */}
            <pattern id="dnsMapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
            </pattern>

            {/* Glowing Gradient for Arcs */}
            <linearGradient id="arcGradOptimal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
            </linearGradient>

            <linearGradient id="arcGradDefault" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.4" />
            </linearGradient>

            {/* Glowing filter */}
            <filter id="glowOptimal" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Deep Ocean Background */}
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="#090d16" />
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#dnsMapGrid)" />

          {/* Latitude / Longitude Equator & Prime Meridian subtle guide lines */}
          <line x1="0" y1={SVG_HEIGHT / 2} x2={SVG_WIDTH} y2={SVG_HEIGHT / 2} stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1={SVG_WIDTH / 2} y1="0" x2={SVG_WIDTH / 2} y2={SVG_HEIGHT} stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" strokeDasharray="4 4" />

          {/* Continents Outlines */}
          <g fill="rgba(30, 41, 59, 0.85)" stroke="rgba(71, 85, 105, 0.4)" strokeWidth="1.2">
            {WORLD_CONTINENTS_PATHS.map((pathD, idx) => (
              <path key={idx} d={pathD} className="transition-colors hover:fill-slate-800" />
            ))}
          </g>

          {/* Geodesic Distance Curved Arcs Connecting Local IP to Each Upstream DNS */}
          {showArcs &&
            displayedServers.map((srv) => {
              if (srv.isCurrentUpstream && srv.distanceKm === 0) return null;
              const [srvX, srvY] = geoToSvg(srv.geo.latitude, srv.geo.longitude);

              // Quadratic Bezier Control Point (curving upward or downward based on distance)
              const midX = (userX + srvX) / 2;
              const midY = Math.min(userY, srvY) - Math.min(90, Math.max(30, srv.distanceKm * 0.015));

              const isOptimal = srv.recommendationRank === 1;
              const isSelected = srv.id === selectedServerId;

              return (
                <g key={`arc-${srv.id}`} className="transition-opacity duration-300">
                  {/* Subtle Background Glow Arc */}
                  <path
                    d={`M ${userX} ${userY} Q ${midX} ${midY} ${srvX} ${srvY}`}
                    fill="none"
                    stroke={isOptimal ? '#10b981' : isSelected ? '#38bdf8' : 'rgba(99, 102, 241, 0.4)'}
                    strokeWidth={isOptimal || isSelected ? '2.5' : '1.2'}
                    strokeDasharray={isOptimal ? '6 3' : '4 4'}
                    filter={isOptimal ? 'url(#glowOptimal)' : undefined}
                    opacity={isSelected ? 1 : isOptimal ? 0.95 : 0.45}
                  />

                  {/* Midpoint Distance Badge */}
                  {(isOptimal || isSelected) && (
                    <g transform={`translate(${midX}, ${midY + 10})`}>
                      <rect
                        x="-48"
                        y="-12"
                        width="96"
                        height="20"
                        rx="10"
                        fill="#0f172a"
                        stroke={isOptimal ? '#10b981' : '#38bdf8'}
                        strokeWidth="1.2"
                      />
                      <text
                        x="0"
                        y="2"
                        textAnchor="middle"
                        fill="#f8fafc"
                        fontSize="9.5"
                        fontWeight="600"
                        fontFamily="monospace"
                      >
                        {srv.distanceKm} km · {srv.weighedLatencyMs}ms
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

          {/* Server Markers */}
          {displayedServers.map((srv) => {
            const [srvX, srvY] = geoToSvg(srv.geo.latitude, srv.geo.longitude);
            const isOptimal = srv.recommendationRank === 1;
            const isSelected = srv.id === selectedServerId;
            const isLocal = srv.isCurrentUpstream;

            return (
              <g
                key={srv.id}
                transform={`translate(${srvX}, ${srvY})`}
                onClick={() => onSelectServer(srv)}
                className="cursor-pointer group"
              >
                {/* Ping animation on recommended or selected */}
                {(isOptimal || isSelected) && (
                  <circle r="16" fill="none" stroke={isOptimal ? '#10b981' : '#38bdf8'} strokeWidth="1.5" opacity="0.6">
                    <animate attributeName="r" values="8;24" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Marker Outer Pin Ring */}
                <circle
                  r={isOptimal ? 11 : isSelected ? 10 : isLocal ? 9 : 7.5}
                  fill={
                    isLocal
                      ? '#6366f1'
                      : isOptimal
                      ? '#10b981'
                      : isSelected
                      ? '#0284c7'
                      : srv.recommendationRank <= 3
                      ? '#0ea5e9'
                      : '#475569'
                  }
                  stroke="#ffffff"
                  strokeWidth="2"
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                />

                {/* Rank number or icon inside */}
                <text
                  x="0"
                  y="3.5"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={isOptimal ? '10' : '8.5'}
                  fontWeight="bold"
                >
                  {isLocal ? 'H' : isOptimal ? '★' : srv.recommendationRank <= 9 ? srv.recommendationRank : ''}
                </text>

                {/* Floating Label on Hover or Active */}
                <g
                  transform="translate(0, -18)"
                  className={`${isSelected || isOptimal ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity pointer-events-none`}
                >
                  <rect
                    x="-60"
                    y="-16"
                    width="120"
                    height="18"
                    rx="4"
                    fill="rgba(15, 23, 42, 0.95)"
                    stroke={isOptimal ? '#10b981' : 'rgba(148, 163, 184, 0.4)'}
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="-4"
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="9.5"
                    fontWeight="600"
                  >
                    {srv.name.split(' ')[0]} ({srv.weighedLatencyMs} ms)
                  </text>
                </g>
              </g>
            );
          })}

          {/* User Local Location Beacon (Beacon Pin with Pulsing Radar Ring) */}
          <g transform={`translate(${userX}, ${userY})`} className="cursor-pointer">
            <circle r="22" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.6">
              <animate attributeName="r" values="8;30" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0" dur="2.4s" repeatCount="indefinite" />
            </circle>

            {/* Radar Center Pin */}
            <circle r="8" fill="#16a34a" stroke="#ffffff" strokeWidth="2.5" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.7))" />
            <circle r="3" fill="#ffffff" />

            {/* Local Beacon Label */}
            <g transform="translate(0, 22)">
              <rect x="-65" y="-10" width="130" height="20" rx="10" fill="#0f172a" stroke="#22c55e" strokeWidth="1.5" />
              <text x="0" y="4" textAnchor="middle" fill="#4ade80" fontSize="9.5" fontWeight="bold">
                📍 YOU ({userLocation.city || 'Local IP'})
              </text>
            </g>
          </g>
        </svg>

        {/* Floating Mini Legend */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl p-3 text-[11px] text-slate-300 shadow-xl flex flex-col gap-1.5 max-w-xs pointer-events-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Map Legend</div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shrink-0"></span>
            <span><strong className="text-emerald-400">#1 Optimal Resolver</strong> (Best composite latency & distance)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-sky-500 border border-white shrink-0"></span>
            <span><strong className="text-sky-400">Top 3 Candidates</strong> (Alternative high-speed Anycast nodes)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500 border border-white shrink-0"></span>
            <span><strong className="text-indigo-400">Current Upstream</strong> (192.168.1.1 Local LAN)</span>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-slate-700/60 text-[10px] text-slate-400">
            <span>Dashed Arcs = Geodesic Light-in-Fiber Path</span>
          </div>
        </div>
      </div>

      {/* Selected Resolver Inspector Bar */}
      {activeServer && (
        <div className="p-4 bg-[var(--bg-surface)] border-t border-[var(--border-color)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-sm ${
              activeServer.recommendationRank === 1
                ? 'bg-emerald-500'
                : activeServer.isCurrentUpstream
                ? 'bg-indigo-600'
                : 'bg-[var(--color-adguard)]'
            }`}>
              {activeServer.recommendationRank === 1 ? '★' : activeServer.geo.flagEmoji || '🌐'}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {activeServer.name}
                </span>
                {activeServer.recommendationBadge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeServer.recommendationRank === 1
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[var(--color-adguard-subtle)] text-[var(--color-adguard)] border border-[var(--color-adguard)]/30'
                  }`}>
                    {activeServer.recommendationBadge}
                  </span>
                )}
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {activeServer.ip}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)] mt-1">
                <span>Location: <strong className="text-[var(--text-primary)]">{activeServer.geo.city}, {activeServer.geo.country}</strong></span>
                <span>·</span>
                <span>Distance: <strong className="text-sky-500">{activeServer.distanceKm.toLocaleString()} km</strong> ({activeServer.distanceMiles.toLocaleString()} mi)</span>
                <span>·</span>
                <span>Fiber Transit RTT: <strong>{activeServer.theoreticalLatencyMs} ms</strong></span>
                <span>·</span>
                <span>Efficiency: <strong className="text-emerald-500">{activeServer.efficiencyIndex} km/ms</strong></span>
              </div>
            </div>
          </div>

          {/* Latency Metrics & Action */}
          <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end shrink-0">
            <div className="flex items-center gap-4 text-xs tabular-nums">
              <div className="text-right">
                <span className="block text-[10px] text-[var(--text-muted)]">Raw Ping</span>
                <span className="font-semibold text-[var(--text-primary)]">{activeServer.rawBenchmarkLatencyMs} ms</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-[var(--text-muted)]">Distance Penalty</span>
                <span className="font-semibold text-amber-500">+{activeServer.distancePenaltyMs} ms</span>
              </div>
              <div className="text-right pl-2 border-l border-[var(--border-color)]">
                <span className="block text-[10px] font-bold text-[var(--text-muted)] uppercase">Weighed Latency</span>
                <span className="text-base font-extrabold text-[var(--color-adguard)]">{activeServer.weighedLatencyMs} ms</span>
              </div>
            </div>

            <button
              onClick={() => copyToClipboard(activeServer.endpoint)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[var(--color-adguard)] hover:bg-[var(--color-adguard-hover)] text-white shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              {copiedEndpoint === activeServer.endpoint ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Upstream</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
