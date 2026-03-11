import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { GitPullRequestDraft, GitBranch, Github, Clock, CheckCircle2, AlertCircle, Clock3, GitPullRequestClosed, GitMerge, MessageSquare, FileText, Code, ChevronDown, ChevronRight, BarChart3, X, ExternalLink } from 'lucide-react';
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

function PRCommentProgress({ stats }) {
  if (!stats || stats.total === 0) return null;

  const { total, processed, unprocessed, progress } = stats;

  return (
    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-600">
            Review Comments
          </span>
        </div>
        <span className="text-xs font-bold text-slate-500">
          {processed}/{total}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
        <div
          className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-emerald-600 font-medium">
          ✓ {processed} processed
        </span>
        {unprocessed > 0 && (
          <span className="text-amber-600 font-medium">
            ⏳ {unprocessed} pending
          </span>
        )}
      </div>
    </div>
  );
}

function PRCommentsModal({ pr, isOpen, onClose }) {
  const { data: commentData, loading } = useApi(`/api/prs/${pr.id}/comments`, {
    enabled: isOpen,
    interval: isOpen ? 10000 : null // Refresh every 10s when open
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <MessageSquare size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Review Comments</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-500">PR #{pr.id}</span>
                {pr.url && (
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    <ExternalLink size={14} />
                    View on GitHub
                  </a>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              <span className="ml-3 text-slate-600">Loading comments...</span>
            </div>
          ) : commentData?.comments?.length > 0 ? (
            <div className="space-y-4">
              {/* Stats */}
              {commentData.stats && commentData.stats.total > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-700">Processing Progress</h3>
                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                      {commentData.stats.progress}% Complete
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 mb-3">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-violet-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${commentData.stats.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-600 font-medium">
                      ✓ {commentData.stats.processed} processed
                    </span>
                    <span className="text-slate-500">
                      {commentData.stats.total} total comments
                    </span>
                    {commentData.stats.unprocessed > 0 && (
                      <span className="text-amber-600 font-medium">
                        ⏳ {commentData.stats.unprocessed} pending
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-3">
                {commentData.comments.map((comment, idx) => (
                  <div
                    key={comment.id}
                    className={cn(
                      "p-4 rounded-xl border",
                      comment.processed
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-amber-50 border-amber-200"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {comment.type === 'inline' ? (
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Code size={16} className="text-blue-600" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                            <FileText size={16} className="text-purple-600" />
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-slate-700 capitalize">
                            {comment.type} Comment
                          </span>
                          {comment.filePath && (
                            <div className="text-sm text-slate-500 font-mono mt-1">
                              📁 {comment.filePath}
                              {comment.lineNumber && `:${comment.lineNumber}`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {comment.processed && (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        )}
                        <span className={cn(
                          "text-xs px-3 py-1 rounded-lg font-bold uppercase tracking-wide",
                          comment.processed
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        )}>
                          {comment.processed ? 'Processed' : 'Pending'}
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-700 leading-relaxed mb-3 bg-white p-3 rounded-lg border border-slate-100">
                      {comment.body}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Created: {new Date(comment.createdAt).toLocaleString()}</span>
                      {comment.processedAt && (
                        <span className="text-emerald-600 font-medium">
                          ✓ Processed: {new Date(comment.processedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Comments Found</h3>
              <p className="text-slate-500">
                This PR doesn't have any review comments yet, or they haven't been processed by the system.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PRCommentDetails({ prId, isOpen, onToggle }) {
  const { data: commentData, loading } = useApi(`/api/prs/${prId}/comments`, {
    enabled: isOpen,
    interval: isOpen ? 10000 : null // Refresh every 10s when open
  });

  if (!isOpen) return null;

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
        </div>
      ) : commentData?.comments?.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-700">Review Comments</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-semibold">
                {commentData.stats.progress}% Complete
              </span>
            </div>
          </div>

          {commentData.comments.map((comment, idx) => (
            <div
              key={comment.id}
              className={cn(
                "p-3 rounded-lg border text-sm",
                comment.processed
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-amber-50 border-amber-200"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {comment.type === 'inline' ? (
                    <Code size={14} className="text-slate-500 mt-0.5" />
                  ) : (
                    <FileText size={14} className="text-slate-500 mt-0.5" />
                  )}
                  <span className="font-semibold text-slate-700 capitalize">
                    {comment.type} Comment
                  </span>
                  {comment.processed && (
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  )}
                </div>
                <span className={cn(
                  "text-xs px-2 py-1 rounded-lg font-bold uppercase tracking-wide",
                  comment.processed
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                )}>
                  {comment.processed ? 'Done' : 'Pending'}
                </span>
              </div>

              {comment.filePath && (
                <div className="text-xs text-slate-500 mb-2 font-mono">
                  📁 {comment.filePath}
                  {comment.lineNumber && `:${comment.lineNumber}`}
                </div>
              )}

              <p className="text-slate-600 leading-relaxed">
                {comment.body.length > 150
                  ? `${comment.body.substring(0, 150)}...`
                  : comment.body
                }
              </p>

              {comment.processedAt && (
                <div className="text-xs text-emerald-600 mt-2 font-medium">
                  ✓ Processed {new Date(comment.processedAt).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-500">
          <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No review comments found</p>
        </div>
      )}
    </div>
  );
}

function PRItem({ pr, index }) {
  const [showComments, setShowComments] = useState(false);
  const review = reviewBadge[pr.review_decision] || reviewBadge.pending;
  const status = prStatusBadge[pr.status] || prStatusBadge.open;
  const ReviewIcon = review.icon;

  const hasComments = pr.commentStats && pr.commentStats.total > 0;

  return (
    <div
      className="premium-card p-5 flex flex-col group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Main PR Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

      {/* Comment Progress */}
      {hasComments && <PRCommentProgress stats={pr.commentStats} />}

      {/* Toggle Comments Button */}
      {hasComments && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            {showComments ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
            <MessageSquare size={14} />
            View Comments ({pr.commentStats.total})
          </button>
        </div>
      )}

      {/* Comment Details */}
      <PRCommentDetails
        prId={pr.id}
        isOpen={showComments}
        onToggle={() => setShowComments(!showComments)}
      />
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
