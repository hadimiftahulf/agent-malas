import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { GitPullRequestDraft, GitBranch, Github, Clock, CheckCircle2, AlertCircle, Clock3, GitPullRequestClosed, GitMerge } from 'lucide-react';
import { cn } from '../lib/utils';

const reviewBadge = {
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Approved', icon: CheckCircle2 },
  changes_requested: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Changes Req', icon: AlertCircle },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Pending Rev', icon: Clock3 },
};

const prStatusBadge = {
  open: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'Open' },
  merged: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Merged' },
  closed: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', label: 'Closed' },
};

function relativeTime(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function PRItem({ pr, index }) {
  const review = reviewBadge[pr.review_decision] || reviewBadge.pending;
  const status = prStatusBadge[pr.status] || prStatusBadge.open;
  const ReviewIcon = review.icon;

  return (
    <div 
      className="premium-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* PR Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap mb-2.5">
          <GitPullRequestDraft size={16} className={cn("shrink-0", status.text)} strokeWidth={2.2} />
          {pr.url ? (
            <a
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] font-bold text-slate-800 group-hover:text-indigo-600 transition-colors tracking-tight truncate"
            >
              {pr.title || `Update: Task #${pr.task_id}`}
            </a>
          ) : (
             <span className="text-[14px] font-bold text-slate-800 tracking-tight truncate">
              {pr.title || `PR #${pr.id}`}
            </span>
          )}
          <span className="text-slate-400 bg-slate-50 px-2.5 py-1 text-[11px] rounded-lg border border-slate-200/80 font-mono font-bold tracking-tight">#{pr.id}</span>
        </div>
        
        <div className="flex items-center gap-2.5 flex-wrap">
          {pr.repo && (
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
              <Github size={12} className="text-slate-400" />
              {pr.repo}
            </div>
          )}
          {pr.task_id && (
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
              <GitBranch size={12} className="opacity-70" />
              Task #{pr.task_id}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-400">
            <Clock size={12} className="text-slate-300" />
            {relativeTime(pr.updated_at || pr.created_at)}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
        <span className={cn(
          "text-[10px] font-bold px-3.5 py-2 rounded-xl border tracking-wider uppercase inline-flex items-center transition-all",
          status.bg, status.text, status.border
        )}>
          {status.label}
        </span>
        <span className={cn(
          "flex items-center gap-1.5 text-[10px] font-bold px-3.5 py-2 rounded-xl border tracking-wider uppercase transition-all",
          review.bg, review.text, review.border
        )}>
          <ReviewIcon size={14} strokeWidth={2.2} />
          {review.label}
        </span>
      </div>
    </div>
  );
}

export function PRTracker() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data, loading } = useApi('/api/prs', {
    interval: 30000,
    params: { limit: 50, ...(statusFilter && { status: statusFilter }) },
  });

  const prs = data?.data || [];

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <GitMerge size={16} className="text-white" />
            </div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Pull Requests
            </h1>
          </div>
          <p className="text-slate-400 mt-1 text-[13px] font-medium leading-tight pl-11">Tracking PRs generated by the agent and pending reviews.</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center h-full px-3.5 py-2 text-[11px] font-bold text-indigo-700 bg-indigo-50 rounded-xl border border-indigo-200 uppercase tracking-wider">
            {data?.total || 0} PRs
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-[13px] font-bold rounded-xl bg-transparent text-slate-600 outline-none appearance-none cursor-pointer pr-8 hover:text-slate-800 transition-colors"
            style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.2em 1.2em' }}
          >
            <option value="" className="bg-white text-slate-600">All Statuses</option>
            <option value="open" className="bg-white text-indigo-600">Open</option>
            <option value="merged" className="bg-white text-purple-600">Merged</option>
            <option value="closed" className="bg-white text-slate-500">Closed</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading && !prs.length ? (
          Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="rounded-2xl h-[96px] animate-pulse bg-white border border-slate-100 shadow-sm" />
          ))
        ) : prs.length === 0 ? (
          <div className="premium-card p-16 text-center flex flex-col items-center justify-center min-h-[300px]">
             <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center border border-slate-100 mb-5 shadow-sm">
              <GitPullRequestClosed size={28} className="text-slate-300" />
            </div>
            <h3 className="text-[20px] text-slate-700 font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
               No Pull Requests Yet
            </h3>
            <p className="text-slate-400 text-[14px] font-medium max-w-[320px]">
              The agent hasn't generated any pull requests or none match current filters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
             {prs.map((pr, i) => <PRItem key={pr.id} pr={pr} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}
