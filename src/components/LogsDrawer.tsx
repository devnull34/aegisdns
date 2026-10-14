import React, { useEffect, useState } from 'react';
import { X, Terminal, RefreshCw } from 'lucide-react';

interface LogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogsDrawer: React.FC<LogsDrawerProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<{ timestamp: string; message: string; type: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-emerald-400';
      case 'warn':
        return 'text-amber-400';
      case 'error':
        return 'text-rose-400';
      case 'info':
      default:
        return 'text-sky-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[var(--color-adguard)]" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">Engine Activity &amp; Sync Logs</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              title="Refresh logs"
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-surface-secondary)] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-surface-secondary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-[var(--bg-surface-secondary)] border border-[var(--border-color)] rounded-lg p-3.5 flex-1 overflow-y-auto font-mono text-xs space-y-2 select-all">
          {logs.map((log, index) => (
            <div key={index} className="flex items-start gap-2.5 leading-relaxed">
              <span className="text-[var(--text-muted)] tabular-nums shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`shrink-0 font-bold uppercase text-[10px] px-1 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] ${getTypeColor(log.type)}`}>
                {log.type}
              </span>
              <span className="text-[var(--text-primary)] break-all">{log.message}</span>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="text-center py-8 text-[var(--text-muted)]">
              No recent log entries recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
