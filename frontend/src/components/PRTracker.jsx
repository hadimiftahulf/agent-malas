import { useState } from 'react';
import React from 'react';
import { createPortal } from 'react-dom';
import { useApi } from '../hooks/useApi';
import { GitPullRequestDraft, GitBranch, Github, Clock, CheckCircle2, AlertCircle, Clock3, GitPullRequestClosed, GitMerge, MessageSquare, FileText, Code, X, ExternalLink, BarChart3 } from 'lucide-react';
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

function PRCommentsModal({ pr, isOpen, onClose }) {
    const { data: commentData, loading } = useApi(`/api/prs/${pr.id}/comments`, {
        enabled: isOpen,
        interval: isOpen ? 10000 : null // Refresh every 10s when open
    });

    // Handle ESC key to close modal
    React.useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscKey);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Add CSS animation for spinner
    const spinnerStyle = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    `;

    // Create portal to render modal at document.body level
    const modalContent = (
        <>
            <style>{spinnerStyle}</style>
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99999,
                    padding: '16px'
                }}
                onClick={(e) => {
                    // Close modal when clicking backdrop
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}
            >
                <div
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        width: '100%',
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        overflow: 'hidden',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        position: 'relative'
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '24px',
                            borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                            background: 'linear-gradient(to right, #f1f5f9, #e2e8f0)',
                            flexShrink: 0
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                <MessageSquare size={24} color="white" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>
                                    Review Comments
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span
                                        style={{
                                            fontSize: '14px',
                                            color: '#475569',
                                            fontWeight: '600',
                                            backgroundColor: '#f1f5f9',
                                            padding: '4px 12px',
                                            borderRadius: '8px'
                                        }}
                                    >
                                        PR #{pr.id}
                                    </span>
                                    {pr.url && (
                                        <a
                                            href={pr.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontSize: '14px',
                                                color: '#6366f1',
                                                fontWeight: '600',
                                                textDecoration: 'none',
                                                backgroundColor: '#eef2ff',
                                                padding: '4px 12px',
                                                borderRadius: '8px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => {
                                                e.target.style.backgroundColor = '#e0e7ff';
                                                e.target.style.color = '#4f46e5';
                                            }}
                                            onMouseOut={(e) => {
                                                e.target.style.backgroundColor = '#eef2ff';
                                                e.target.style.color = '#6366f1';
                                            }}
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
                            style={{
                                padding: '8px',
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                flexShrink: 0
                            }}
                            onMouseOver={(e) => {
                                e.target.style.backgroundColor = 'rgba(255, 255, 255, 1)';
                                e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            <X size={20} color="#475569" />
                        </button>
                    </div>

                    {/* Content */}
                    <div
                        style={{
                            padding: '24px',
                            overflowY: 'auto',
                            maxHeight: 'calc(90vh - 120px)'
                        }}
                    >
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                    <div
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            border: '3px solid #e2e8f0',
                                            borderTop: '3px solid #6366f1',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }}
                                    ></div>
                                    <span style={{ color: '#475569', fontWeight: '500' }}>Loading comments...</span>
                                </div>
                            </div>
                        ) : commentData?.comments?.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Stats */}
                                {commentData.stats && commentData.stats.total > 0 && (
                                    <div
                                        style={{
                                            background: 'linear-gradient(to right, #f1f5f9, #eef2ff)',
                                            borderRadius: '12px',
                                            padding: '20px',
                                            border: '1px solid #c7d2fe',
                                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div
                                                    style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '8px',
                                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                    }}
                                                >
                                                    <BarChart3 size={18} color="white" />
                                                </div>
                                                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                                                    Processing Progress
                                                </h3>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6366f1', marginBottom: '4px' }}>
                                                    {commentData.stats.progress}%
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Complete</div>
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                width: '100%',
                                                backgroundColor: '#e2e8f0',
                                                borderRadius: '9999px',
                                                height: '16px',
                                                marginBottom: '16px',
                                                overflow: 'hidden',
                                                boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    background: 'linear-gradient(to right, #6366f1, #8b5cf6, #a855f7)',
                                                    height: '16px',
                                                    borderRadius: '9999px',
                                                    transition: 'all 0.7s ease-out',
                                                    width: `${commentData.stats.progress}%`,
                                                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                            <div
                                                style={{
                                                    textAlign: 'center',
                                                    padding: '12px',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.6)',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255, 255, 255, 0.8)'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize: '18px',
                                                        fontWeight: 'bold',
                                                        color: '#059669',
                                                        marginBottom: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <CheckCircle2 size={16} />
                                                    {commentData.stats.processed}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>Processed</div>
                                            </div>
                                            <div
                                                style={{
                                                    textAlign: 'center',
                                                    padding: '12px',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.6)',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255, 255, 255, 0.8)'
                                                }}
                                            >
                                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}>
                                                    {commentData.stats.total}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>Total</div>
                                            </div>
                                            <div
                                                style={{
                                                    textAlign: 'center',
                                                    padding: '12px',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.6)',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255, 255, 255, 0.8)'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize: '18px',
                                                        fontWeight: 'bold',
                                                        color: '#d97706',
                                                        marginBottom: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <Clock size={16} />
                                                    {commentData.stats.unprocessed}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>Pending</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Comments List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {commentData.comments.map((comment) => (
                                        <div
                                            key={comment.id}
                                            style={{
                                                padding: '20px',
                                                borderRadius: '12px',
                                                border: `2px solid ${comment.processed ? '#d1fae5' : '#fef3c7'}`,
                                                background: comment.processed
                                                    ? 'linear-gradient(to right, #ecfdf5, #f0fdf4)'
                                                    : 'linear-gradient(to right, #fffbeb, #fefce8)',
                                                transition: 'all 0.3s',
                                                cursor: 'default'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                                                e.currentTarget.style.borderColor = comment.processed ? '#a7f3d0' : '#fde68a';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.boxShadow = 'none';
                                                e.currentTarget.style.borderColor = comment.processed ? '#d1fae5' : '#fef3c7';
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    {comment.type === 'inline' ? (
                                                        <div
                                                            style={{
                                                                width: '40px',
                                                                height: '40px',
                                                                borderRadius: '8px',
                                                                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                            }}
                                                        >
                                                            <Code size={16} color="white" />
                                                        </div>
                                                    ) : (
                                                        <div
                                                            style={{
                                                                width: '40px',
                                                                height: '40px',
                                                                borderRadius: '8px',
                                                                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                            }}
                                                        >
                                                            <FileText size={16} color="white" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                            <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', textTransform: 'capitalize' }}>
                                                                {comment.type} Comment
                                                            </span>
                                                            <span
                                                                style={{
                                                                    fontSize: '12px',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '9999px',
                                                                    fontWeight: 'bold',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.05em',
                                                                    backgroundColor: comment.processed ? '#d1fae5' : '#fef3c7',
                                                                    color: comment.processed ? '#065f46' : '#92400e',
                                                                    border: `1px solid ${comment.processed ? '#a7f3d0' : '#fde68a'}`
                                                                }}
                                                            >
                                                                {comment.processed ? '✓ Done' : '⏳ Pending'}
                                                            </span>
                                                        </div>
                                                        {comment.filePath && (
                                                            <div
                                                                style={{
                                                                    fontSize: '12px',
                                                                    color: '#475569',
                                                                    fontFamily: 'monospace',
                                                                    backgroundColor: '#f1f5f9',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid #e2e8f0'
                                                                }}
                                                            >
                                                                📁 {comment.filePath}
                                                                {comment.lineNumber && (
                                                                    <span style={{ color: '#6366f1', fontWeight: 'bold' }}>:{comment.lineNumber}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {comment.processed && (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            backgroundColor: '#d1fae5',
                                                            padding: '4px 12px',
                                                            borderRadius: '8px',
                                                            border: '1px solid #a7f3d0'
                                                        }}
                                                    >
                                                        <CheckCircle2 size={14} color="#059669" />
                                                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#065f46' }}>Complete</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div
                                                style={{
                                                    backgroundColor: 'white',
                                                    padding: '16px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e2e8f0',
                                                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                                    marginBottom: '12px'
                                                }}
                                            >
                                                <p style={{ color: '#374151', lineHeight: '1.6', fontSize: '14px', margin: 0 }}>
                                                    {comment.body}
                                                </p>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span
                                                        style={{
                                                            color: '#64748b',
                                                            backgroundColor: '#f1f5f9',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontWeight: '500'
                                                        }}
                                                    >
                                                        Created: {new Date(comment.createdAt).toLocaleString()}
                                                    </span>
                                                    {comment.processedAt && (
                                                        <span
                                                            style={{
                                                                color: '#059669',
                                                                backgroundColor: '#ecfdf5',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                fontWeight: '600',
                                                                border: '1px solid #d1fae5'
                                                            }}
                                                        >
                                                            ✓ Processed: {new Date(comment.processedAt).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '64px 0' }}>
                                <div
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                                        borderRadius: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 16px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                >
                                    <MessageSquare size={32} color="#94a3b8" />
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>
                                    No Comments Found
                                </h3>
                                <p style={{ color: '#64748b', maxWidth: '384px', margin: '0 auto', lineHeight: '1.6' }}>
                                    This PR doesn't have any review comments yet, or they haven't been processed by the system.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );

    // Use createPortal to render at document.body level
    return typeof document !== 'undefined'
        ? createPortal(modalContent, document.body)
        : null;
}

function PRItem({ pr, index }) {
    const [showModal, setShowModal] = useState(false);
    const review = reviewBadge[pr.review_decision] || reviewBadge.pending;
    const status = prStatusBadge[pr.status] || prStatusBadge.open;
    const ReviewIcon = review.icon;

    const hasComments = pr.commentStats && pr.commentStats.total > 0;

    return (
        <>
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

                {/* Comment Progress - Only if has comments */}
                {hasComments && (
                    <div className="mt-5 p-5 bg-gradient-to-r from-slate-50 via-indigo-50 to-violet-50 rounded-2xl border border-indigo-200/60 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg">
                                    <MessageSquare size={16} className="text-white" />
                                </div>
                                <span className="text-base font-bold text-slate-800">
                                    Review Comments Progress
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-indigo-600 bg-white px-4 py-2 rounded-xl shadow-sm border border-indigo-200">
                                    {pr.commentStats.processed}/{pr.commentStats.total}
                                </span>
                                <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-2 rounded-lg">
                                    {pr.commentStats.progress}%
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 rounded-full h-4 mb-4 overflow-hidden shadow-inner">
                            <div
                                className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 h-4 rounded-full transition-all duration-700 ease-out shadow-sm relative overflow-hidden"
                                style={{ width: `${pr.commentStats.progress}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-emerald-600 font-semibold flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                                    <CheckCircle2 size={16} />
                                    {pr.commentStats.processed} processed
                                </span>
                                {pr.commentStats.unprocessed > 0 && (
                                    <span className="text-sm text-amber-600 font-semibold flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                                        <Clock size={16} />
                                        {pr.commentStats.unprocessed} pending
                                    </span>
                                )}
                            </div>
                            <span className="text-sm text-slate-500 font-medium">
                                Total: {pr.commentStats.total} comments
                            </span>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mt-5 pt-5 border-t border-slate-200">
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-3 text-base font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 px-6 py-3.5 rounded-xl transition-all duration-200 w-full justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02] border border-indigo-300"
                    >
                        <MessageSquare size={20} />
                        View Comments
                        {hasComments && (
                            <span className="bg-white/20 text-white px-3 py-1.5 rounded-full text-sm font-bold ml-2 border border-white/30">
                                {pr.commentStats.total}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Modal */}
            <PRCommentsModal
                pr={pr}
                isOpen={showModal}
                onClose={() => setShowModal(false)}
            />
        </>
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