import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { Search, Filter, Github, Clock, Coffee, Sparkles, ListChecks } from 'lucide-react';
import { cn } from '../lib/utils';

const statusBadge = {
  queued: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', label: 'Queued', dot: 'bg-slate-400' },
  processing: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'Processing', dot: 'bg-indigo-500 animate-pulse shadow-[0_0_6px_rgba(99,102,241,0.5)]' },
  done: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Done', dot: 'bg-emerald-500' },
  failed: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Failed', dot: 'bg-rose-500' },
  skipped: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Skipped', dot: 'bg-amber-400' },
};

function relativeTime(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function TaskItem({ task, index }) {
  const badge = statusBadge[task.status] || statusBadge.queued;

  return (
    <div 
      className="premium-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap mb-2.5">
          <span className="text-slate-400 bg-slate-50 px-2.5 py-1 text-[11px] rounded-lg border border-slate-200/80 font-mono font-bold tracking-tight">#{task.id}</span>
          <h3 className="text-[14px] font-bold text-slate-800 tracking-tight truncate group-hover:text-indigo-600 transition-colors">
            {task.title}
          </h3>
        </div>
        
        <div className="flex items-center gap-2.5 flex-wrap">
          {task.repo && (
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
              <Github size={12} className="text-slate-400" />
              {task.repo}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-400">
            <Clock size={12} className="text-slate-300" />
            {relativeTime(task.created_at)}
          </div>
        </div>
      </div>

      <div className={cn(
        "flex items-center gap-2 px-3.5 py-2 rounded-xl border shrink-0 text-[10px] font-bold uppercase tracking-wider transition-all",
        badge.bg, badge.border, badge.text
      )}>
        <span className={cn("w-2 h-2 rounded-full", badge.dot)} />
        {badge.label}
      </div>
    </div>
  );
}

export function TaskQueue() {
  const [tab, setTab] = useState('history');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: queueData, loading: queueLoading } = useApi('/api/queue', { interval: 15000 });
  const { data: historyData, loading: historyLoading } = useApi('/api/tasks', {
    interval: 30000,
    params: { limit: 50, ...(statusFilter && { status: statusFilter }) },
  });

  const queueTasks = queueData || [];
  const historyTasks = historyData?.data || [];
  const displayed = tab === 'queue' ? queueTasks : historyTasks;
  const filtered = search
    ? displayed.filter((t) => t.title?.toLowerCase().includes(search.toLowerCase()))
    : displayed;
  const isLoading = tab === 'queue' ? queueLoading : historyLoading;

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <ListChecks size={16} className="text-white" />
            </div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Task Explorer
            </h1>
          </div>
          <p className="text-slate-400 mt-1 text-[13px] font-medium leading-tight pl-11">Manage pending queue and action history.</p>
        </div>

        {/* Segmented Control */}
        <div className="flex p-1 bg-slate-100 rounded-2xl inline-flex self-start sm:self-auto shadow-inner">
          {['queue', 'history'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-5 py-2 text-[12px] font-bold rounded-xl transition-all duration-300 capitalize min-w-[100px] text-center",
                tab === t
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {t} {t === 'queue' && <span className={cn("ml-1.5 rounded-lg px-2 py-0.5 text-[10px] font-bold", tab === t ? "bg-indigo-100 text-indigo-700" : "bg-slate-200/80 text-slate-500")}>{queueTasks.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-2.5 border border-slate-200/80 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[14px] font-medium bg-slate-50 text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
          />
        </div>
        
        {tab === 'history' && (
          <>
            <div className="w-px h-8 bg-slate-200 hidden sm:block self-center" />
            <div className="relative w-full sm:w-48 shrink-0">
               <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 text-[13px] font-bold bg-slate-50 text-slate-600 rounded-xl border border-slate-200/60 focus:outline-none appearance-none cursor-pointer transition-colors hover:text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em 1em' }}
              >
                <option value="" className="bg-white text-slate-600">All Statuses</option>
                <option value="done" className="bg-white text-emerald-600">Done</option>
                <option value="failed" className="bg-white text-rose-600">Failed</option>
                <option value="processing" className="bg-white text-indigo-600">Processing</option>
                <option value="queued" className="bg-white text-slate-500">Queued</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading && !filtered.length ? (
          Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="rounded-2xl h-[96px] animate-pulse bg-white border border-slate-100 shadow-sm" />
          ))
        ) : filtered.length === 0 ? (
          <div className="premium-card p-16 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center border border-slate-100 mb-5 shadow-sm">
              {tab === 'queue' ? <Coffee size={28} className="text-slate-300" /> : <Sparkles size={28} className="text-slate-300" />}
            </div>
            <h3 className="text-[20px] text-slate-700 font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              {tab === 'queue' ? 'Queue is clear' : 'No tasks found'}
            </h3>
            <p className="text-slate-400 text-[14px] font-medium max-w-[280px]">
              {tab === 'queue' ? 'The agent is awaiting new operations.' : 'Adjust search terms or clear filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
             {filtered.map((task, i) => <TaskItem key={task.id} task={task} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}
