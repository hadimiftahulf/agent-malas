import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { CheckCircle2, XCircle, Clock, GitPullRequest, FileText, Sparkles, RefreshCw } from 'lucide-react';
import { showBrowserNotification, initializeNotifications } from '../utils/notifications';

const API_BASE = 'http://localhost:3001/api';

export default function ApprovalNotifications() {
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const ws = useWebSocket();

    const fetchPendingApprovals = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/approval/pending`);
            const data = await response.json();
            if (data.success) {
                setPendingApprovals(data.data);
            }
        } catch (error) {
            console.error('Error fetching pending approvals:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingApprovals();
    }, []);

    useEffect(() => {
        if (ws.lastEvent?.type === 'approval:request') {
            console.log('New approval request:', ws.lastEvent.data);
            fetchPendingApprovals();

            // Show browser notification with sound
            showBrowserNotification(
                '🔔 New Task Approval Required',
                ws.lastEvent.data.title
            );
        } else if (ws.lastEvent?.type === 'approval:response') {
            console.log('Approval response:', ws.lastEvent.data);
            fetchPendingApprovals();
        }
    }, [ws.lastEvent]);

    // Initialize notifications on mount
    useEffect(() => {
        initializeNotifications();
    }, []);

    const handleApprove = async (taskId, notificationId) => {
        try {
            setProcessingId(notificationId);
            const response = await fetch(`${API_BASE}/approval/task/${taskId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approvedBy: 'web-user',
                    deviceId: 'web-frontend'
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log('Task approved successfully');
                fetchPendingApprovals();
            }
        } catch (error) {
            console.error('Error approving task:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (taskId, notificationId) => {
        const reason = prompt('Reason for rejection (optional):');

        try {
            setProcessingId(notificationId);
            const response = await fetch(`${API_BASE}/approval/task/${taskId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rejectedBy: 'web-user',
                    reason: reason || 'No reason provided',
                    deviceId: 'web-frontend'
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log('Task rejected');
                fetchPendingApprovals();
            }
        } catch (error) {
            console.error('Error rejecting task:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'issue':
                return <FileText className="w-6 h-6" />;
            case 'pr_rejected':
                return <GitPullRequest className="w-6 h-6" />;
            default:
                return <Sparkles className="w-6 h-6" />;
        }
    };

    const getNotificationGradient = (type) => {
        switch (type) {
            case 'issue':
                return 'from-blue-500 to-cyan-500';
            case 'pr_rejected':
                return 'from-orange-500 to-pink-500';
            default:
                return 'from-purple-500 to-indigo-500';
        }
    };

    if (loading && pendingApprovals.length === 0) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="relative inline-block">
                        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <Sparkles className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="mt-4 text-slate-600 font-medium">Loading approvals...</p>
                </div>
            </div>
        );
    }

    if (pendingApprovals.length === 0) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center max-w-md mx-auto">
                    <div className="relative inline-block mb-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-bounce-slow">
                            <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={2.5} />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg animate-pulse">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">All Clear!</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        No pending approvals at the moment.<br />
                        All tasks are approved or completed.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                        Pending Approvals
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {pendingApprovals.length} task{pendingApprovals.length !== 1 ? 's' : ''} waiting for your decision
                    </p>
                </div>
                <button
                    onClick={fetchPendingApprovals}
                    className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="text-sm font-semibold">Refresh</span>
                </button>
            </div>

            {/* Approvals List */}
            <div className="space-y-4">
                {pendingApprovals.map((approval, index) => (
                    <div
                        key={approval.id}
                        className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-xl transition-all duration-300 animate-slide-up"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        {/* Gradient accent bar */}
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getNotificationGradient(approval.notification_type)}`} />

                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${getNotificationGradient(approval.notification_type)} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    {getNotificationIcon(approval.notification_type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    {/* Title */}
                                    <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                                        {approval.title}
                                    </h3>

                                    {/* Timestamp */}
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                                        <Clock className="w-3 h-3" />
                                        <span>{new Date(approval.sent_at).toLocaleString()}</span>
                                    </div>

                                    {/* Task Info */}
                                    {approval.task && (
                                        <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
                                            <p className="text-sm font-semibold text-slate-700 mb-1">
                                                {approval.task.title}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                📦 {approval.task.repo}
                                            </p>
                                        </div>
                                    )}

                                    {/* Description */}
                                    <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line line-clamp-4">
                                        {approval.description}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex-shrink-0 flex flex-col gap-2">
                                    <button
                                        onClick={() => handleApprove(approval.task_id, approval.id)}
                                        disabled={processingId === approval.id}
                                        className="group/btn relative px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
                                    >
                                        <span className="flex items-center gap-2">
                                            {processingId === approval.id ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <span>Processing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span>Approve</span>
                                                </>
                                            )}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => handleReject(approval.task_id, approval.id)}
                                        disabled={processingId === approval.id}
                                        className="group/btn px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
                                    >
                                        <span className="flex items-center gap-2">
                                            <XCircle className="w-4 h-4" />
                                            <span>Reject</span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Info Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-xl">
                <div className="relative bg-white rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-lg font-bold text-slate-800 mb-2">
                                Approval Workflow Active
                            </h4>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                All new tasks and PR fixes require your approval before the AI agent can process them.
                                Approve tasks you want the agent to work on, or reject tasks that should be skipped.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
