import {
  BlocklistSource,
  DomainCheckResult,
  GlobalStats,
  OptimizationMetrics,
  OutputFormat,
  OverlapMetric,
  SourceStats,
} from '../types/blocklist';
import { formatDomain } from './parser';

export interface CompilationResult {
  domains: Set<string>;
  formattedOutput: string;
  optimization: OptimizationMetrics;
}

/**
 * Checks if domain is a subdomain of any domain present in the given set.
 * E.g., if set contains 'doubleclick.net', isSubdomainOfSet('ad.doubleclick.net', set) returns 'doubleclick.net'
 */
export function getParentBlockedDomain(domain: string, domainSet: Set<string>): string | null {
  const parts = domain.split('.');
  if (parts.length <= 2) return null;

  for (let i = 1; i < parts.length - 1; i++) {
    const parentCandidate = parts.slice(i).join('.');
    if (domainSet.has(parentCandidate)) {
      return parentCandidate;
    }
  }
  return null;
}

/**
 * Advanced Multi-Stage Master List Optimizer:
 * Stage 1: Whitelist Exclusion
 * Stage 2: Exact Cross-Source Deduplication
 * Stage 3: Hierarchical Subdomain Pruning (Tree optimization for DNS sinkholes)
 * Stage 4: Resource & RAM Footprint Calculation
 */
export function compileMasterList(
  sources: BlocklistSource[],
  listDomains: Map<string, Set<string>>,
  whitelist: Set<string>,
  format: OutputFormat,
  stripSubdomains: boolean = true,
  generateFormattedText: boolean = true,
  enableIpv6: boolean = true
): CompilationResult {
  const activeSources = sources.filter((s) => s.enabled);
  let rawDomainsTotal = 0;
  let rawPayloadBytes = 0;
  let invalidSyntaxDiscarded = 0;
  let whitelistExempted = 0;

  // Temporary pool for Stage 1 & 2
  const consolidatedDeduplicated = new Set<string>();

  for (const source of activeSources) {
    const domains = listDomains.get(source.id);
    if (!domains) continue;
    rawDomainsTotal += domains.size;

    for (const domain of domains) {
      rawPayloadBytes += domain.length + 10; // avg line overhead (e.g., ||domain^\n)

      // Stage 1: Whitelist check
      if (whitelist.has(domain)) {
        whitelistExempted++;
        continue;
      }

      // Check if subdomain of a whitelisted domain (e.g. sub.apple.com whitelisted if apple.com is)
      const parentWhitelisted = getParentBlockedDomain(domain, whitelist);
      if (parentWhitelisted) {
        whitelistExempted++;
        continue;
      }

      consolidatedDeduplicated.add(domain);
    }
  }

  const exactDuplicatesRemoved = Math.max(0, rawDomainsTotal - consolidatedDeduplicated.size - whitelistExempted);

  // Stage 3: Hierarchical Subdomain Pruning
  const finalOptimizedSet = new Set<string>();
  let redundantSubdomainsPruned = 0;

  if (stripSubdomains) {
    // Ultra-fast index of base parent domains (domains with exactly 1 dot, e.g. 'doubleclick.net')
    const potentialParents = new Set<string>();
    for (const d of consolidatedDeduplicated) {
      let dots = 0;
      for (let i = 0; i < d.length; i++) {
        if (d.charCodeAt(i) === 46) {
          dots++;
          if (dots > 1) break;
        }
      }
      if (dots === 1) {
        potentialParents.add(d);
      }
    }

    for (const candidate of consolidatedDeduplicated) {
      const lastDot = candidate.lastIndexOf('.');
      if (lastDot === -1) {
        finalOptimizedSet.add(candidate);
        continue;
      }
      const secondLastDot = candidate.lastIndexOf('.', lastDot - 1);
      if (secondLastDot === -1) {
        // Only 1 dot: root/base domain cannot be a subdomain of another blocked domain
        finalOptimizedSet.add(candidate);
        continue;
      }

      // Base 2-segment domain (e.g. 'doubleclick.net' in 'sub.ad.doubleclick.net')
      const baseDomain = candidate.substring(secondLastDot + 1);
      if (!potentialParents.has(baseDomain)) {
        // Fast-path: base domain is not in the set, so no parent can exist!
        finalOptimizedSet.add(candidate);
        continue;
      }

      // Check if candidate itself or its parent is redundant
      let isRedundant = false;
      let dot = candidate.indexOf('.');
      while (dot !== -1 && dot < lastDot) {
        const parent = candidate.substring(dot + 1);
        if (potentialParents.has(parent) || consolidatedDeduplicated.has(parent)) {
          isRedundant = true;
          break;
        }
        dot = candidate.indexOf('.', dot + 1);
      }

      if (isRedundant) {
        redundantSubdomainsPruned++;
      } else {
        finalOptimizedSet.add(candidate);
      }
    }
  } else {
    for (const d of consolidatedDeduplicated) {
      finalOptimizedSet.add(d);
    }
  }

  const finalRuleCount = finalOptimizedSet.size;
  const totalEliminated = exactDuplicatesRemoved + redundantSubdomainsPruned;
  const totalReductionPercentage =
    rawDomainsTotal > 0 ? Number(((totalEliminated / rawDomainsTotal) * 100).toFixed(1)) : 0;

  let formattedOutput = '';
  let optimizedPayloadSizeBytes = 0;

  if (generateFormattedText) {
    // Stage 4: Output Rendering & Header Generation
    const commentPrefix = format === 'adguard' ? '!' : format === 'rpz' ? ';' : '#';
    const lines: string[] = [];
    lines.push(`${commentPrefix} -------------------------------------------------------------`);
    lines.push(`${commentPrefix} AegisDNS Master Blocklist (${format.toUpperCase()})`);
    lines.push(`${commentPrefix} Compiled: ${new Date().toISOString()}`);
    lines.push(`${commentPrefix} Active Sources: ${activeSources.length}`);
    lines.push(`${commentPrefix} Total Raw Rules Processed: ${rawDomainsTotal.toLocaleString()}`);
    lines.push(`${commentPrefix} Final Optimized Unique Rules: ${finalRuleCount.toLocaleString()}`);
    lines.push(`${commentPrefix} IPv6 Support: ${enableIpv6 ? 'Enabled' : 'Disabled'}`);
    lines.push(`${commentPrefix} -------------------------------------------------------------`);
    lines.push(`${commentPrefix} Optimization Breakdown:`);
    lines.push(`${commentPrefix}   - Exact duplicates eliminated: ${exactDuplicatesRemoved.toLocaleString()}`);
    lines.push(`${commentPrefix}   - Redundant subdomains pruned: ${redundantSubdomainsPruned.toLocaleString()}`);
    lines.push(`${commentPrefix}   - Whitelist entries exempted: ${whitelistExempted.toLocaleString()}`);
    lines.push(`${commentPrefix}   - Overall rule reduction: ${totalReductionPercentage}%`);
    lines.push(`${commentPrefix} -------------------------------------------------------------`);
    lines.push(`${commentPrefix} Contributing Lists:`);
    for (const s of activeSources) {
      lines.push(`${commentPrefix}   - ${s.name} (${s.domainCount.toLocaleString()} domains)`);
    }
    lines.push(`${commentPrefix} -------------------------------------------------------------`);

    if (format === 'rpz') {
      const serial = Math.floor(Date.now() / 1000);
      lines.push('$TTL 300');
      lines.push(`@ IN SOA localhost. root.localhost. ( ${serial} 3600 600 604800 300 )`);
      lines.push('@ IN NS localhost.');
      lines.push('');
    } else {
      lines.push('');
    }

    const sortedFinal = Array.from(finalOptimizedSet).sort();
    for (const domain of sortedFinal) {
      lines.push(formatDomain(domain, format, enableIpv6));
    }

    formattedOutput = lines.join('\n');
    optimizedPayloadSizeBytes = formattedOutput.length;
  } else {
    // Fast path for stats: avoid allocating 2+ million string lines and 50MB string
    optimizedPayloadSizeBytes = finalRuleCount * 22;
  }
  const payloadReductionPercentage =
    rawPayloadBytes > 0
      ? Number((((rawPayloadBytes - optimizedPayloadSizeBytes) / rawPayloadBytes) * 100).toFixed(1))
      : 0;

  // In AdGuard Home and CoreDNS, each blocked rule occupies ~96 bytes of RAM in the trie
  const estimatedRamSavedBytes = totalEliminated * 96;

  const optimization: OptimizationMetrics = {
    rawDomainsTotal,
    exactDuplicatesRemoved,
    redundantSubdomainsPruned,
    whitelistExempted,
    invalidSyntaxDiscarded,
    finalRuleCount,
    totalReductionPercentage,
    rawPayloadSizeBytes: rawPayloadBytes,
    optimizedPayloadSizeBytes,
    payloadReductionPercentage: Math.max(0, payloadReductionPercentage),
    estimatedRamSavedBytes,
  };

  return {
    domains: finalOptimizedSet,
    formattedOutput,
    optimization,
  };
}

const pairwiseSharedCache = new Map<string, number>();

export function invalidatePairwiseCacheForSource(sourceId?: string) {
  if (!sourceId) {
    pairwiseSharedCache.clear();
    return;
  }
  for (const key of pairwiseSharedCache.keys()) {
    if (key.includes(sourceId)) {
      pairwiseSharedCache.delete(key);
    }
  }
}

export function invalidateStatsMemoCache() {
  pairwiseSharedCache.clear();
}

export function computeStatistics(
  sources: BlocklistSource[],
  listDomains: Map<string, Set<string>>,
  whitelist: Set<string>,
  stripSubdomains: boolean = true,
  lastGlobalSync: string | null = null,
  nextScheduledSync: string | null = null
): GlobalStats {
  const activeSources = sources.filter((s) => s.enabled);
  const compilation = compileMasterList(sources, listDomains, whitelist, 'adguard', stripSubdomains, false);

  // Ultra-fast single-pass domain uniqueness tracker
  // Avoids double-looping over 2+ million domains and allocating millions of occurrence numbers
  const domainOwner = new Map<string, string>();
  const sourceUniqueCounts = new Map<string, number>();
  for (const s of activeSources) {
    sourceUniqueCounts.set(s.id, 0);
  }

  for (const s of activeSources) {
    const domains = listDomains.get(s.id) || new Set();
    for (const d of domains) {
      if (whitelist.has(d)) continue;
      const owner = domainOwner.get(d);
      if (owner === undefined) {
        domainOwner.set(d, s.id);
        sourceUniqueCounts.set(s.id, (sourceUniqueCounts.get(s.id) || 0) + 1);
      } else if (owner !== 'SHARED') {
        sourceUniqueCounts.set(owner, Math.max(0, (sourceUniqueCounts.get(owner) || 1) - 1));
        domainOwner.set(d, 'SHARED');
      }
    }
  }

  // Calculate per-source statistics instantly from computed unique counts
  const sourceStats: SourceStats[] = sources.map((s) => {
    const domains = listDomains.get(s.id) || new Set();
    const rawCount = domains.size;

    if (!s.enabled || rawCount === 0) {
      return {
        id: s.id,
        name: s.name,
        category: s.category,
        enabled: s.enabled,
        rawCount,
        uniqueCount: 0,
        uniquePercentage: 0,
        redundancyPercentage: 0,
        lastDownloaded: s.lastDownloaded,
      };
    }

    const uniqueCount = sourceUniqueCounts.get(s.id) || 0;
    const uniquePercentage = Number(((uniqueCount / rawCount) * 100).toFixed(1));
    const redundancyPercentage = Number((100 - uniquePercentage).toFixed(1));

    return {
      id: s.id,
      name: s.name,
      category: s.category,
      enabled: s.enabled,
      rawCount,
      uniqueCount,
      uniquePercentage,
      redundancyPercentage,
      lastDownloaded: s.lastDownloaded,
    };
  });

  // Calculate pairwise overlap matrix (with memoized shared count cache)
  const overlapMatrix: OverlapMetric[] = [];
  for (let i = 0; i < activeSources.length; i++) {
    const sourceA = activeSources[i];
    const domainsA = listDomains.get(sourceA.id) || new Set();
    const sizeA = domainsA.size;

    for (let j = 0; j < activeSources.length; j++) {
      if (i === j) continue;
      const sourceB = activeSources[j];
      const domainsB = listDomains.get(sourceB.id) || new Set();
      const sizeB = domainsB.size;

      const cacheKey = sourceA.id < sourceB.id ? `${sourceA.id}:${sourceB.id}` : `${sourceB.id}:${sourceA.id}`;
      let sharedCount: number;

      if (pairwiseSharedCache.has(cacheKey)) {
        sharedCount = pairwiseSharedCache.get(cacheKey)!;
      } else {
        sharedCount = 0;
        const [smaller, larger] = sizeA < sizeB ? [domainsA, domainsB] : [domainsB, domainsA];
        for (const d of smaller) {
          if (!whitelist.has(d) && larger.has(d)) {
            sharedCount++;
          }
        }
        pairwiseSharedCache.set(cacheKey, sharedCount);
      }

      const overlapPercentAInB = sizeA > 0 ? Number(((sharedCount / sizeA) * 100).toFixed(1)) : 0;
      const overlapPercentBInA = sizeB > 0 ? Number(((sharedCount / sizeB) * 100).toFixed(1)) : 0;

      overlapMatrix.push({
        sourceIdA: sourceA.id,
        sourceNameA: sourceA.name,
        sourceIdB: sourceB.id,
        sourceNameB: sourceB.name,
        sharedCount,
        overlapPercentAInB,
        overlapPercentBInA,
      });
    }
  }

  return {
    totalActiveLists: activeSources.length,
    totalConfiguredLists: sources.length,
    totalRawDomains: compilation.optimization.rawDomainsTotal,
    masterUniqueDomains: compilation.optimization.finalRuleCount,
    duplicatesRemoved: compilation.optimization.exactDuplicatesRemoved + compilation.optimization.redundantSubdomainsPruned,
    duplicateReductionPercentage: compilation.optimization.totalReductionPercentage,
    lastMasterBuild: new Date().toISOString(),
    lastGlobalSync,
    nextScheduledSync,
    sourceStats,
    overlapMatrix,
    optimization: compilation.optimization,
  };
}

export function checkDomainInSources(
  domainInput: string,
  sources: BlocklistSource[],
  listDomains: Map<string, Set<string>>,
  whitelist: Set<string>
): DomainCheckResult {
  const target = domainInput.trim().toLowerCase();
  const isWhitelisted = whitelist.has(target) || !!getParentBlockedDomain(target, whitelist);

  const blockingSources: { id: string; name: string; category: any }[] = [];
  const activeSources = sources.filter((s) => s.enabled);

  // Check direct hits
  for (const s of activeSources) {
    const set = listDomains.get(s.id);
    if (set && set.has(target)) {
      blockingSources.push({
        id: s.id,
        name: s.name,
        category: s.category,
      });
    }
  }

  // Check if target is blocked by parent domain
  let parentBlockedDomain: string | undefined;
  if (blockingSources.length === 0) {
    for (const s of activeSources) {
      const set = listDomains.get(s.id);
      if (set) {
        const parent = getParentBlockedDomain(target, set);
        if (parent) {
          parentBlockedDomain = parent;
          blockingSources.push({
            id: s.id,
            name: s.name,
            category: s.category,
          });
        }
      }
    }
  }

  const isBlocked = blockingSources.length > 0 && !isWhitelisted;
  const isUniqueToSingleSource = blockingSources.length === 1;

  return {
    domain: target,
    isBlocked,
    isWhitelisted,
    isPrunedSubdomain: !!parentBlockedDomain,
    parentBlockedDomain,
    blockingSources,
    isUniqueToSingleSource,
  };
}
