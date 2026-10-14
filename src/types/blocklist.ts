export type BlocklistCategory = 'security' | 'ads_tracking' | 'comprehensive' | 'specialized';

export type OutputFormat =
  | 'adguard'
  | 'pihole'
  | 'hosts'
  | 'rpz'
  | 'domains'
  | 'dnsmasq'
  | 'unbound'
  | 'wildcard';

export interface BlocklistSource {
  id: string;
  name: string;
  url: string;
  category: BlocklistCategory;
  enabled: boolean;
  format: 'adblock' | 'hosts' | 'domains' | 'auto';
  description: string;
  maintainer: string;
  homepage?: string;
  domainCount: number;
  lastUpdated: string;
  lastDownloaded: string | null;
  lastStatus: 'ok' | 'error' | 'syncing' | 'pending';
  errorMessage?: string;
  isPreset?: boolean;
  cacheSizeBytes?: number;
  statusMessage?: string;
  isPreloaded?: boolean;
}

export interface OverlapMetric {
  sourceIdA: string;
  sourceNameA: string;
  sourceIdB: string;
  sourceNameB: string;
  sharedCount: number;
  overlapPercentAInB: number; // What % of A is blocked by B
  overlapPercentBInA: number; // What % of B is blocked by A
}

export interface SourceStats {
  id: string;
  name: string;
  category: BlocklistCategory;
  enabled: boolean;
  rawCount: number;
  uniqueCount: number; // Domains unique to this list only (among active lists)
  uniquePercentage: number;
  redundancyPercentage: number; // Domains in this list covered by other active lists
  lastDownloaded: string | null;
}

export interface OptimizationMetrics {
  rawDomainsTotal: number;
  exactDuplicatesRemoved: number;
  redundantSubdomainsPruned: number;
  whitelistExempted: number;
  invalidSyntaxDiscarded: number;
  finalRuleCount: number;
  totalReductionPercentage: number;
  rawPayloadSizeBytes: number;
  optimizedPayloadSizeBytes: number;
  payloadReductionPercentage: number;
  estimatedRamSavedBytes: number;
}

export interface GlobalStats {
  totalActiveLists: number;
  totalConfiguredLists: number;
  totalRawDomains: number;
  masterUniqueDomains: number;
  duplicatesRemoved: number;
  duplicateReductionPercentage: number;
  lastMasterBuild: string;
  lastGlobalSync: string | null;
  nextScheduledSync: string | null;
  sourceStats: SourceStats[];
  overlapMatrix: OverlapMetric[];
  optimization: OptimizationMetrics;
}

export interface AppSettings {
  autoSyncEnabled: boolean;
  autoSyncIntervalHours: number; // 1, 2, 6, 12, 24, 48, 168 (7d)
  updateOnStartup: boolean;
  lastAutoSync: string | null;
  nextAutoSync: string | null;
  outputFormat: OutputFormat;
  whitelist: string[];
  stripSubdomains: boolean;
  enableIpv6: boolean;
  upstreamDns?: string;
  distanceUnit?: 'imperial' | 'metric';
}

export interface DomainCheckResult {
  domain: string;
  isBlocked: boolean;
  isWhitelisted: boolean;
  isPrunedSubdomain?: boolean;
  parentBlockedDomain?: string;
  blockingSources: { id: string; name: string; category: BlocklistCategory }[];
  isUniqueToSingleSource: boolean;
}

// ==========================================
// DNS TOOLS & BENCHMARK TYPES
// ==========================================

export type DnsProtocol = 'regular' | 'https' | 'tls' | 'quic';

export interface DnsSecurityOption {
  id: string;
  name: string;
  category: 'standard' | 'security' | 'family' | 'unfiltered';
  ip: string;
  ipv6?: string;
  dohUrl?: string;
  dotHost?: string;
  doqHost?: string;
  description: string;
  isDefault?: boolean;
}

export interface UpstreamDnsServer {
  id: string;
  name: string;
  provider: string;
  ip: string;
  ipv6?: string;
  dohUrl?: string;
  dotHost?: string;
  doqHost?: string;
  isFilter: boolean;
  defaultPort: number;
  description: string;
  securityOptions?: DnsSecurityOption[];
}

export interface DnsBenchmarkResult {
  serverId: string;
  serverName: string;
  provider: string;
  protocol: DnsProtocol;
  endpoint: string;
  cachedLatencyMs: number;
  uncachedLatencyMs: number;
  dotComLatencyMs: number;
  weightedScoreMs: number;
  reliabilityPercent: number;
  isFastest: boolean;
  testedAt: string;
  error?: string;
  securityOptions?: DnsSecurityOption[];
}

export interface DnsLeakCheckServer {
  ip: string;
  hostname?: string;
  asn?: string;
  org?: string;
  country?: string;
  isSafe: boolean;
  providerName?: string;
}

export interface DnsLeakTestResult {
  hasLeak: boolean;
  testedAt: string;
  primaryResolverIp: string;
  detectedServers: DnsLeakCheckServer[];
  recommendation: string;
}

export interface DnsLookupResult {
  domain: string;
  recordType: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'PTR' | 'SOA' | 'CAA';
  server: string;
  protocol: DnsProtocol;
  latencyMs: number;
  status: string;
  answers: Array<{
    name: string;
    type: string;
    ttl: number;
    data: string;
  }>;
  rawOutput?: string;
  error?: string;
}

export interface WhoisResult {
  domain: string;
  registrar?: string;
  createdDate?: string;
  expiresDate?: string;
  updatedDate?: string;
  nameServers: string[];
  status: string[];
  organization?: string;
  country?: string;
  rawWhois?: string;
  error?: string;
}

export interface PrecacheProofSample {
  id: string;
  domain: string;
  coldUncachedMs: number;
  primedCachedMs: number;
  cachedMs: number;
  differenceMs: number;
  speedupPercent: number;
  upstreamServer: string;
  timestamp: string;
  // Legacy aliases
  uncachedMs?: number;
}

export interface UpstreamDnsInfo {
  ip: string;
  name: string;
  provider: string;
  protocol: string;
  port: number;
  socketType: string;
  queriesDispatched: number;
  lastResponseStatus: string;
  isLocalGateway: boolean;
}

export interface PrecacheProofStats {
  totalTested: number; // Rolling total of all tested domains
  rollingAvgColdUncachedMs: number; // Rolling average of cold uncached across all tested domains
  rollingAvgPrimedCachedMs: number; // Rolling average of primed cached across all tested domains
  rollingAvgCachedMs: number;       // Rolling average of cached latency across all tested domains
  rollingAvgDifferenceMs: number;   // Rolling average difference in ms
  rollingAvgSpeedupPercent: number; // Rolling average speedup %
  timeSavedSeconds: number;
  // Legacy aliases
  avgUncachedMs?: number;
  avgCachedMs?: number;
  avgSpeedupPercent?: number;
}

export interface PrecacheStatus {
  isRunning: boolean;
  isPaused: boolean;
  totalTarget: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  currentDomain: string;
  targetServer: string;
  upstreamInfo: UpstreamDnsInfo;
  percent: number;
  queriesPerSec: number;
  avgLatencyMs: number;
  recentSample: PrecacheProofSample | null;
  recentProofs: PrecacheProofSample[];
  proofStats: PrecacheProofStats;
  startedAt: string | null;
  completedAt: string | null;
  majesticStatus?: MajesticStatus;
}

export interface MajesticStatus {
  sourceUrl: string;
  lastUpdated: string | null;
  nextUpdateDue: string | null;
  updateIntervalDays: number;
  totalDomains: number;
  cacheFilePath: string;
  isUpdating: boolean;
  lastError: string | null;
  source: 'bundled_software_cache' | 'live_weekly_sync';
  topSample: string[];
}

// ==========================================
// RECOMMENDATION ENGINE & GEOIP TYPES
// ==========================================

export type ConnectionType = 'fiber' | 'cable' | 'cellular' | 'satellite' | 'dsl';

export interface GeoLocation {
  ip: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  isp: string;
  org: string;
  asn?: string;
  flagEmoji: string;
  isLocal: boolean;
  source?: string;
}

export interface DnsServerFeatures {
  isFilter: boolean;
  isFamily?: boolean;
  hasDnssec: boolean;
  supportsDoH: boolean;
  supportsDoT: boolean;
  supportsDoQ: boolean;
  noLogging: boolean;
}

export interface DnsServerGeoData {
  id: string;
  name: string;
  provider: string;
  ip: string;
  endpoint: string;
  protocol: DnsProtocol;
  geo: GeoLocation;
  distanceKm: number;
  distanceMiles: number;
  theoreticalLatencyMs: number; // Speed of light in fiber (RTT min)
  rawBenchmarkLatencyMs: number; // Raw GRC weighted score
  cachedLatencyMs: number;
  uncachedLatencyMs: number;
  dotComLatencyMs: number;
  reliabilityPercent: number;
  weighedLatencyMs: number; // Distance + connection-profile weighted
  distancePenaltyMs: number;
  efficiencyIndex: number; // Ratio of latency performance vs physical distance
  features: DnsServerFeatures;
  recommendationScore: number;
  recommendationRank: number;
  recommendationBadge?: string;
  rationale?: string;
  isCurrentUpstream: boolean;
}

export interface DnsRecommendationResult {
  userLocation: GeoLocation;
  currentUpstream: DnsServerGeoData;
  connectionType: ConnectionType;
  protocol: DnsProtocol;
  servers: DnsServerGeoData[];
  topRecommendations: {
    primary: DnsServerGeoData;
    fastest: DnsServerGeoData;
    mostPrivate: DnsServerGeoData;
    bestSecurity: DnsServerGeoData;
    bestForConnection: DnsServerGeoData;
  };
  analysisSummary: string;
  generatedAt: string;
}


