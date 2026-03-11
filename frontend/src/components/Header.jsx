import { Menu, Activity, Clock, Cpu, Bell } from 'lucide-react';
import { cn } from '../lib/utils';
import { useApprovalNotifications } from '../hooks/useApprovalNotifications';

const statusConfig = {
  running: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Running', dot: '16, 185, 129', dotClass: 'bg-emerald-500' },
  idle: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Idle', dot: '245, 158, 11', dotClass: 'bg-amber-500' },
  processing: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Processing', dot: '99, 102, 241', dotClass: 'bg-indigo-500' },
  stopped: { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Offline', dot: '239, 68, 68', dotClass: 'bg-rose-500' },
};

function formatUptime(seconds) {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function Header({ health, onMenuToggle, onNavigate }) {
  const status = statusConfig[health?.agent] || statusConfig.stopped;
  const isPulsing = health?.agent === 'running' || health?.agent === 'processing';
  const { pendingCount } = useApprovalNotifications();

  return (
    <header className="sticky top-0 z-40 shrink-0 h-[68px] glass-panel border-b border-slate-200/60 flex items-center justify-between px-5 sm:px-8 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">

      {/* Left: Mobile Menu + Breadcrumb area */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2.5 -ml-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl transition-all active:scale-95"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Right: Status + Metrics + Actions */}
      <div className="flex items-center gap-3 ml-auto">

        {/* Status Badge */}
        <div className={cn(
          "flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[11px] font-bold tracking-wide uppercase transition-all",
          status.bg
        )}>
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              status.dotClass,
              isPulsing && "status-dot-animated"
            )}
            style={{ '--pulse-rgb': status.dot }}
          />
          <span>{status.label}</span>
        </div>

        <div className="hidden sm:block w-px h-6 bg-slate-200/80" />

        {/* Metrics */}
        <div className="hidden sm:flex items-center gap-1">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all cursor-default" title="Uptime">
            <Activity size={14} className="text-slate-400" />
            <span className="text-[12px] font-semibold tracking-tight tabular-nums">{formatUptime(health?.uptime)}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all cursor-default" title="Last Active">
            <Clock size={14} className="text-slate-400" />
            <span className="text-[12px] font-semibold tracking-tight tabular-nums">{formatTime(health?.lastRun)}</span>
          </div>
        </div>

        <div className="hidden lg:block w-px h-6 bg-slate-200/80" />

        {/* Node Runtime Tag */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-200/60 transition-colors cursor-default">
          <Cpu size={12} className="text-slate-400" />
          Node Runtime
        </div>

        {/* Notification Bell with Badge */}
        <button
          onClick={() => onNavigate && onNavigate('approvals')}
          className="relative p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all active:scale-95"
          title={`${pendingCount} pending approval${pendingCount !== 1 ? 's' : ''}`}
        >
          <Bell size={18} />
          {pendingCount > 0 && (
            <>
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white animate-pulse"></span>
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-indigo-600 text-white text-[10px] font-bold rounded-full border-2 border-white">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
