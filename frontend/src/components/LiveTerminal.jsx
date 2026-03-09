import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { Terminal, Trash2, Info, AlertTriangle, XCircle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '../lib/utils';

const levelConfig = {
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    warn: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    error: { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
};

export function LiveTerminal() {
    const { connected, logs: wsLogs, clearLogs } = useWebSocket();
    const [filters, setFilters] = useState({ info: true, warn: true, error: true });
    const [autoScroll, setAutoScroll] = useState(true);
    const [historyLogs, setHistoryLogs] = useState([]);
    const terminalRef = useRef(null);
    const lastScrollTop = useRef(0);

    // Load historical logs from DB on mount
    useEffect(() => {
        fetch('/api/logs/recent?limit=100')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setHistoryLogs(data);
            })
            .catch(() => {});
    }, []);

    // Merge: history first, then realtime (dedup by timestamp+message)
    const allLogs = [...historyLogs, ...wsLogs];
    const filteredLogs = allLogs.filter((log) => filters[log.level]);

    // Auto-scroll logic
    useEffect(() => {
        if (!autoScroll || !terminalRef.current) return;
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }, [filteredLogs, autoScroll]);

    // Detect manual scroll
    const handleScroll = () => {
        if (!terminalRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

        // User scrolled up
        if (scrollTop < lastScrollTop.current && !isAtBottom) {
            setAutoScroll(false);
        }
        // User scrolled to bottom
        if (isAtBottom && !autoScroll) {
            setAutoScroll(true);
        }

        lastScrollTop.current = scrollTop;
    };

    const toggleFilter = (level) => {
        setFilters((prev) => ({ ...prev, [level]: !prev[level] }));
    };

    const formatTime = (iso) => {
        if (!iso) return '';
        const date = new Date(iso);
        return date.toLocaleTimeString('en-US', { hour12: false });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200/80">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center shadow-xl shadow-slate-500/30 relative">
                            <div className="absolute inset-0 bg-white/10 rounded-2xl animate-pulse" />
                            <Terminal size={22} className="text-white relative z-10" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-[32px] font-black tracking-tight text-slate-900 leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                                Live Logs
                            </h1>
                            <p className="text-slate-400 mt-1.5 text-[14px] font-semibold leading-tight flex items-center gap-2">
                                {connected ? (
                                    <>
                                        <Wifi size={14} className="text-emerald-500" />
                                        <span className="text-emerald-600">Real-time agent activity stream</span>
                                    </>
                                ) : (
                                    <>
                                        <WifiOff size={14} className="text-rose-500" />
                                        <span className="text-rose-600">Disconnected - Reconnecting...</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 self-start sm:self-auto bg-white p-2 rounded-2xl border border-slate-200/80 shadow-lg">
                    {Object.entries(levelConfig).map(([level, cfg]) => {
                        const Icon = cfg.icon;
                        return (
                            <button
                                key={level}
                                onClick={() => toggleFilter(level)}
                                className={cn(
                                    "px-4 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-2",
                                    filters[level]
                                        ? `${cfg.bg} ${cfg.color} shadow-sm`
                                        : "text-slate-300 hover:text-slate-500 hover:bg-slate-50"
                                )}
                            >
                                <Icon size={15} strokeWidth={2.5} />
                                {level}
                            </button>
                        );
                    })}
                    <div className="w-px h-7 bg-slate-200" />
                    <button
                        onClick={clearLogs}
                        className="px-4 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center gap-2"
                    >
                        <Trash2 size={15} strokeWidth={2.5} />
                        Clear
                    </button>
                </div>
            </div>

            {/* Terminal */}
            <div className="premium-card p-0 overflow-hidden shadow-2xl">
                <div
                    ref={terminalRef}
                    onScroll={handleScroll}
                    className="h-[550px] overflow-y-auto font-mono text-[13px] leading-relaxed p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 terminal-scrollbar"
                    style={{ scrollBehavior: autoScroll ? 'smooth' : 'auto' }}
                >
                    {filteredLogs.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            <div className="text-center">
                                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                                    <Terminal size={40} className="opacity-30" />
                                </div>
                                <p className="text-sm font-bold text-slate-400 mb-2">No logs yet</p>
                                <p className="text-xs text-slate-600">Waiting for agent activity...</p>
                            </div>
                        </div>
                    ) : (
                        filteredLogs.map((log, i) => {
                            const cfg = levelConfig[log.level] || levelConfig.info;
                            return (
                                <div key={i} className="flex gap-3 mb-2.5 hover:bg-slate-800/50 px-3 py-2 rounded-lg transition-colors group">
                                    <span className="text-slate-600 shrink-0 select-none font-semibold">[{formatTime(log.timestamp)}]</span>
                                    <span className={cn("font-black shrink-0 select-none", cfg.color)}>
                                        [{log.level.toUpperCase()}]
                                    </span>
                                    <span className="text-slate-300 break-all group-hover:text-slate-200 transition-colors">{log.message}</span>
                                    {log.taskId && (
                                        <span className="text-indigo-400 shrink-0 ml-auto font-bold bg-indigo-500/10 px-2 py-0.5 rounded">#{log.taskId}</span>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-t border-slate-800 text-[11px] font-semibold">
                    <div className="flex items-center gap-5 text-slate-400">
                        <span className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            {filteredLogs.length} lines
                        </span>
                        <span className="flex items-center gap-2">
                            {connected ? (
                                <>
                                    <Wifi size={15} className="text-emerald-400" />
                                    <span className="text-emerald-400 font-bold">Connected</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff size={15} className="text-rose-400" />
                                    <span className="text-rose-400 font-bold">Disconnected</span>
                                </>
                            )}
                        </span>
                    </div>
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg font-extrabold uppercase tracking-wider transition-all text-[10px]",
                            autoScroll
                                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                : "bg-slate-800 text-slate-500 hover:text-slate-300 border border-slate-700"
                        )}
                    >
                        Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>
        </div>
    );
}
