import React, { useState } from 'react';
import { GlobalStats, BlocklistSource } from '../types/blocklist';
import { PieChart, ArrowRight, Info, ShieldAlert, Sparkles, Filter } from 'lucide-react';

interface OverlapAnalyticsTabProps {
  stats: GlobalStats | null;
  sources: BlocklistSource[];
}

export const OverlapAnalyticsTab: React.FC<OverlapAnalyticsTabProps> = ({ stats, sources }) => {
  const activeSources = sources.filter((s) => s.enabled);
  const [selectedPair, setSelectedPair] = useState<{ idA: string; idB: string } | null>(() => {
    if (activeSources.length >= 2) {
      return { idA: activeSources[0].id, idB: activeSources[1].id };
    }
    return null;
  });

  if (!stats || activeSources.length === 0) {
    return (
      <div className="text-center py-16 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-8 shadow-xs">
        <PieChart className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
        <h3 className="text-base font-bold text-[var(--text-primary)]">No Active Lists to Analyze</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Enable at least two blocklist sources to inspect cross-source overlap and uniqueness metrics.
        </p>
      </div>
    );
  }

  // Find metric for selected pair
  const currentPairMetric = selectedPair
    ? stats.overlapMatrix.find(
        (m) => m.sourceIdA === selectedPair.idA && m.sourceIdB === selectedPair.idB
      )
    : null;

  const sourceA = activeSources.find((s) => s.id === selectedPair?.idA);
  const sourceB = activeSources.find((s) => s.id === selectedPair?.idB);

  // Helper for matrix cell color
  const getCellColor = (percent: number) => {
    if (percent === 0) return 'bg-[var(--bg-surface-secondary)] text-[var(--text-muted)]';
    if (percent < 20) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
    if (percent < 50) return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30';
    if (percent < 75) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30';
    return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Overview Intro Banner */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>Multi-Source Redundancy &amp; Uniqueness Analysis</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-3xl">
              Inspect cross-list overlap to understand which lists bring unique, indispensable rules versus which are redundant. AegisDNS deduplicates these automatically for AdGuard Home.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-[var(--text-muted)]">Duplicate Elimination Efficiency</div>
            <div className="text-xl font-bold text-amber-500 font-mono tabular-nums">
              {stats.duplicateReductionPercentage}%
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {stats.duplicatesRemoved.toLocaleString()} duplicates saved
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Source Uniqueness & Redundancy Breakdown */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Domain Uniqueness Distribution by Source
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Unique domains are rules found <em>only</em> in that specific list among your currently enabled sources.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
              <span>Unique Rules</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[var(--border-color)]"></span>
              <span>Overlapping Rules</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {stats.sourceStats
            .filter((s) => s.enabled)
            .sort((a, b) => b.uniquePercentage - a.uniquePercentage)
            .map((sStat) => {
              return (
                <div
                  key={sStat.id}
                  className="bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] rounded-lg p-3.5 space-y-2 hover:border-[var(--color-adguard)]/50 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--text-primary)]">{sStat.name}</span>
                      <span className="text-[var(--text-muted)] font-mono tabular-nums">
                        ({sStat.rawCount.toLocaleString()} total)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono tabular-nums">
                      <span className="text-emerald-500 font-semibold">
                        {sStat.uniqueCount.toLocaleString()} unique ({sStat.uniquePercentage}%)
                      </span>
                      <span className="text-[var(--text-muted)]">·</span>
                      <span className="text-[var(--text-secondary)]">
                        {sStat.redundancyPercentage}% shared
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Stacked Bar */}
                  <div className="w-full h-2.5 bg-[var(--border-color)] rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${Math.max(1, sStat.uniquePercentage)}%` }}
                      className="h-full bg-emerald-500"
                      title={`${sStat.uniquePercentage}% Unique`}
                    />
                    <div
                      style={{ width: `${sStat.redundancyPercentage}%` }}
                      className="h-full bg-slate-400 dark:bg-slate-600"
                      title={`${sStat.redundancyPercentage}% Overlapping`}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Section 2: Pairwise Matrix Heatmap */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-5 space-y-4 shadow-xs overflow-x-auto">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Cross-Source Overlap Matrix Heatmap
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Click any cell to compare intersections between the row list and column list.
          </p>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border-color)]">
                  List / Coverage
                </th>
                {activeSources.map((s) => (
                  <th
                    key={s.id}
                    className="p-2 text-center font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] whitespace-nowrap max-w-[120px] truncate"
                    title={s.name}
                  >
                    {s.name.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeSources.map((rowSrc) => (
                <tr key={rowSrc.id} className="border-b border-[var(--border-color)]">
                  <td
                    className="p-2 font-bold text-[var(--text-primary)] whitespace-nowrap max-w-[160px] truncate"
                    title={rowSrc.name}
                  >
                    {rowSrc.name}
                  </td>
                  {activeSources.map((colSrc) => {
                    if (rowSrc.id === colSrc.id) {
                      return (
                        <td key={colSrc.id} className="p-2 text-center bg-[var(--bg-surface-secondary)] text-[var(--text-muted)] font-mono">
                          100%
                        </td>
                      );
                    }

                    const metric = stats.overlapMatrix.find(
                      (m) =>
                        (m.sourceIdA === rowSrc.id && m.sourceIdB === colSrc.id) ||
                        (m.sourceIdA === colSrc.id && m.sourceIdB === rowSrc.id)
                    );

                    const percent = metric
                      ? metric.sourceIdA === rowSrc.id
                        ? metric.overlapPercentAInB
                        : metric.overlapPercentBInA
                      : 0;

                    return (
                      <td key={colSrc.id} className="p-1.5 text-center">
                        <button
                          onClick={() => setSelectedPair({ idA: rowSrc.id, idB: colSrc.id })}
                          className={`w-full py-1 px-1.5 rounded font-mono text-[11px] font-semibold transition-all hover:scale-105 ${getCellColor(
                            percent
                          )}`}
                          title={`${rowSrc.name} shares ${metric?.sharedCount.toLocaleString() || 0} domains with ${colSrc.name} (${percent}%)`}
                        >
                          {percent}%
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Deep Pairwise Comparison Inspector */}
      {selectedPair && sourceA && sourceB && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>Pairwise Deep Inspector</span>
                <span className="text-xs text-[var(--color-adguard)] font-mono font-semibold">
                  {sourceA.name} vs {sourceB.name}
                </span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Detailed intersection breakdown between two selected sources.
              </p>
            </div>

            {/* Quick selectors */}
            <div className="flex items-center gap-2 text-xs">
              <select
                value={selectedPair.idA}
                onChange={(e) => setSelectedPair({ ...selectedPair, idA: e.target.value })}
                className="bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded px-2.5 py-1.5 focus:outline-none focus:border-[var(--color-adguard)]"
              >
                {activeSources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />

              <select
                value={selectedPair.idB}
                onChange={(e) => setSelectedPair({ ...selectedPair, idB: e.target.value })}
                className="bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded px-2.5 py-1.5 focus:outline-none focus:border-[var(--color-adguard)]"
              >
                {activeSources
                  .filter((s) => s.id !== selectedPair.idA)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Box 1: In List A Only */}
            <div className="bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] rounded-lg p-4 space-y-1.5">
              <div className="text-xs text-[var(--text-secondary)]">Exclusive to {sourceA.name}</div>
              <div className="text-xl font-bold text-[var(--text-primary)] font-mono tabular-nums">
                {currentPairMetric
                  ? (sourceA.domainCount - currentPairMetric.sharedCount).toLocaleString()
                  : 0}
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {currentPairMetric
                  ? `${(100 - currentPairMetric.overlapPercentAInB).toFixed(1)}% not in ${sourceB.name}`
                  : ''}
              </div>
            </div>

            {/* Box 2: Shared Intersection */}
            <div className="bg-[var(--color-adguard-subtle)] border border-[var(--color-adguard)]/40 rounded-lg p-4 space-y-1.5">
              <div className="text-xs text-[var(--color-adguard)] font-semibold">Shared in Both Lists</div>
              <div className="text-xl font-bold text-[var(--color-adguard)] font-mono tabular-nums">
                {currentPairMetric ? currentPairMetric.sharedCount.toLocaleString() : 0}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                {currentPairMetric
                  ? `${currentPairMetric.overlapPercentAInB}% of ${sourceA.name} · ${currentPairMetric.overlapPercentBInA}% of ${sourceB.name}`
                  : ''}
              </div>
            </div>

            {/* Box 3: In List B Only */}
            <div className="bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] rounded-lg p-4 space-y-1.5">
              <div className="text-xs text-[var(--text-secondary)]">Exclusive to {sourceB.name}</div>
              <div className="text-xl font-bold text-[var(--text-primary)] font-mono tabular-nums">
                {currentPairMetric
                  ? (sourceB.domainCount - currentPairMetric.sharedCount).toLocaleString()
                  : 0}
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {currentPairMetric
                  ? `${(100 - currentPairMetric.overlapPercentBInA).toFixed(1)}% not in ${sourceA.name}`
                  : ''}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
