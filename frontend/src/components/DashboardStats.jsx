import { useEffect, useState } from 'react';
import {
  CheckCircle2, XCircle, GitPullRequest, RotateCw, ListFilter, Bot,
  TrendingUp, Sparkles, Activity, Clock, Github, Layers,
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { cn } from '../lib/utils';

/* ─── Animated Counter ─── */
function CountUp({ value, duration = 600 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0 || value === undefined) { setDisplay(0); return; }
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value, duration]);
  return <span>{display}</span>;
}

/* ─── Mini Sparkline ─── */
function Sparkline({ data = [], color = '#6366F1' }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[3px] h-8 opacity-60">
      {data.map((v, i) => (
        <div key={i} className="w-[4px] rounded-full" style={{ height: `${Math.max((v / max) * 100, 10)}%`, backgroundColor: color }} />
      ))}
    </div>
  );
}

/* ─── Skeleton ─── */
function Skeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl h-32 animate-pulse bg-white/60 border border-slate-100 shadow-sm relative overflow-hidden"><div className="shimmer absolute inset-0" /></div>
      ))}</div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-2xl h-64 animate-pulse bg-white/60 border border-slate-100" />
        <div className="lg:col-span-2 rounded-2xl h-64 animate-pulse bg-white/60 border border-slate-100" />
      </div>
    </div>
  );
}

/* ─── Status badges ─── */
const statusBadge = {
  queued: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Queued' },
  processing: { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-500 animate-pulse', label: 'Processing' },
  done: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', label: 'Done' },
  failed: { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500', label: 'Failed' },
};

/* ─── Cards config ─── */
const cards = [
  { key: 'tasksCompleted', label: 'Completed', icon: CheckCircle2, cls: 'stat-icon-emerald', accent: 'card-accent-emerald', color: '#10B981' },
  { key: 'tasksFailed', label: 'Failed', icon: XCircle, cls: 'stat-icon-rose', accent: 'card-accent-rose', color: '#F43F5E' },
  { key: 'prsCreated', label: 'PRs Created', icon: GitPullRequest, cls: 'stat-icon-indigo', accent: 'card-accent-indigo', color: '#6366F1' },
  { key: 'prsRevised', label: 'PRs Revised', icon: RotateCw, cls: 'stat-icon-amber', accent: 'card-accent-amber', color: '#F59E0B' },
];

function relativeTime(iso) {
  if (!iso) return '—';
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);   if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ═══════════════════════════════ MAIN ═══════════════════════════════ */
export function DashboardStats() {
  const { data, loading, error } = useApi('/api/dashboard', { interval: 15000 });

  if (loading && !data) return <Skeleton />;
  if (error) return (
    <div className="p-5 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold flex items-center gap-3">
      <XCircle size={18} className="shrink-0" /> Error: {error}
    </div>
  );

  const today       = data?.today || {};
  const queue       = data?.queue || {};
  const agent       = data?.agent || {};
  const recentTasks = data?.recentTasks || [];
  const sparkline   = data?.sparkline || [];
  const prStats     = data?.prStats || {};

  const sparkData = sparkline.map(d => d.completed || 0).reverse();
  const totalPRs  = (prStats.open || 0) + (prStats.merged || 0) + (prStats.closed || 0);

  const agentCfg = {
    running:    { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Running',    dot: 'bg-emerald-500', border: 'border-emerald-200' },
    idle:       { color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Idle',       dot: 'bg-amber-500',   border: 'border-amber-200' },
    processing: { color: 'text-indigo-600',  bg: 'bg-indigo-50',  label: 'Processing', dot: 'bg-indigo-500',  border: 'border-indigo-200' },
    stopped:    { color: 'text-slate-500',   bg: 'bg-slate-50',   label: 'Offline',    dot: 'bg-slate-400',   border: 'border-slate-200' },
  };
  const as = agentCfg[agent.status] || agentCfg.stopped;
  const isPulse = agent.status === 'running' || agent.status === 'processing';

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 relative shrink-0">
            <TrendingUp size={20} className="text-white relative z-10" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>Command Center</h1>
            <p className="text-slate-400 text-xs font-semibold flex items-center gap-1.5 mt-0.5"><Activity size={12} />Real-time overview</p>
          </div>
        </div>
        <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold uppercase tracking-wider shrink-0", as.bg, as.border)}>
          <div className="relative flex h-2 w-2">
            {isPulse && <span className={cn("animate-ping absolute inset-0 rounded-full opacity-75", as.dot)} />}
            <span className={cn("relative rounded-full h-2 w-2", as.dot)} />
          </div>
          <span className={as.color}>{as.label}</span>
        </div>
      </div>

      {/* ── Row 1: Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={c.key} className={cn("premium-card p-4 group cursor-default relative overflow-hidden", c.accent)} style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.12em]">{c.label}</p>
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", c.cls)}>
                  <Icon size={15} strokeWidth={2.2} />
                </div>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-3xl font-black text-slate-800 tracking-tighter leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                    <CountUp value={today[c.key] || 0} />
                  </p>
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-1">Today</p>
                </div>
                {c.key === 'tasksCompleted' && sparkData.length > 1 && <Sparkline data={sparkData} color={c.color} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Row 2: Activity + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Recent Activity — col 1-3 */}
        <div className="lg:col-span-3 premium-card p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Layers size={14} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Recent Activity</h3>
                <p className="text-[10px] font-semibold text-slate-400">Last 5 operations</p>
              </div>
            </div>
            {queue.currentTask && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-bold text-indigo-700 max-w-[180px] truncate">
                <Sparkles size={10} className="shrink-0 animate-pulse" />
                <span className="truncate">{queue.currentTask}</span>
              </div>
            )}
          </div>

          {recentTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles size={24} className="text-slate-200 mb-2" />
              <p className="text-sm font-bold text-slate-400">No activity yet</p>
              <p className="text-xs text-slate-300 mt-0.5">Tasks will appear here when processed.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentTasks.map((t, i) => {
                const b = statusBadge[t.status] || statusBadge.queued;
                return (
                  <div key={t.id} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group/row">
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", b.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate group-hover/row:text-indigo-600 transition-colors">{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {t.repo && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Github size={9} />{t.repo.split('/').pop()}</span>}
                        <span className="text-[9px] text-slate-300 flex items-center gap-0.5"><Clock size={8} />{relativeTime(t.completedAt || t.createdAt)}</span>
                      </div>
                    </div>
                    <span className={cn("text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0", b.bg, b.text)}>{b.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar — col 4-5 */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Queue */}
          <div className="premium-card p-4 group cursor-default">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.12em]">Queue</p>
              <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ListFilter size={13} />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800 tracking-tighter leading-none" style={{ fontFamily: 'var(--font-display)' }}>
              <CountUp value={queue.size || 0} />
            </p>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-1">pending tasks</p>
          </div>

          {/* PR Overview */}
          <div className="premium-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.12em]">PR Overview</p>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{totalPRs} total</span>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Open',        val: prStats.open,             color: 'bg-indigo-500',  tc: 'text-indigo-600' },
                { label: 'Changes Req', val: prStats.changesRequested, color: 'bg-rose-500',    tc: 'text-rose-600' },
                { label: 'Approved',    val: prStats.approved,         color: 'bg-emerald-500', tc: 'text-emerald-600' },
                { label: 'Merged',      val: prStats.merged,           color: 'bg-purple-500',  tc: 'text-purple-600' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <span className={cn("w-1.5 h-1.5 rounded-full", r.color)} />{r.label}
                  </span>
                  <span className={cn("text-sm font-black tabular-nums", r.tc)}>{r.val || 0}</span>
                </div>
              ))}
            </div>
            {totalPRs > 0 && (
              <div className="mt-3 flex h-1.5 rounded-full overflow-hidden bg-slate-100">
                {prStats.open > 0 && <div className="bg-indigo-500" style={{ width: `${(prStats.open / totalPRs) * 100}%` }} />}
                {prStats.changesRequested > 0 && <div className="bg-rose-500" style={{ width: `${(prStats.changesRequested / totalPRs) * 100}%` }} />}
                {prStats.approved > 0 && <div className="bg-emerald-500" style={{ width: `${(prStats.approved / totalPRs) * 100}%` }} />}
                {prStats.merged > 0 && <div className="bg-purple-500" style={{ width: `${(prStats.merged / totalPRs) * 100}%` }} />}
              </div>
            )}
          </div>

          {/* Agent */}
          <div className={cn("premium-card p-4 border-2 group cursor-default relative overflow-hidden", as.border)}>
            <div className="absolute right-[-10%] bottom-[-25%] opacity-[0.04] pointer-events-none group-hover:opacity-[0.08] transition-opacity">
              <Bot size={100} className="text-slate-900" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.12em] mb-1.5">Agent</p>
              <div className="flex items-center gap-2.5">
                <div className={cn("w-3.5 h-3.5 rounded-full border-2 border-white shadow-md", as.dot, isPulse && "status-dot-animated")} style={{ '--pulse-rgb': '99, 102, 241' }} />
                <p className={cn("text-xl font-black tracking-tight capitalize leading-none", as.color)} style={{ fontFamily: 'var(--font-display)' }}>{as.label}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
