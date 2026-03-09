import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Settings, Play, Power, Zap, Clock, User, FolderOpen, Server } from 'lucide-react';
import { cn } from '../lib/utils';

export function AgentControl() {
    const { data: config, refetch: refetchConfig } = useApi('/api/config');
    const { data: health } = useApi('/api/health', { interval: 5000 });

    const [dryRun, setDryRun] = useState(false);
    const [yoloMode, setYoloMode] = useState(false);
    const [checkInterval, setCheckInterval] = useState(600);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (config) {
            setDryRun(config.dryRun || false);
            setYoloMode(config.geminiYolo || false);
            setCheckInterval(config.checkInterval || 600);
        }
    }, [config]);

    const updateConfig = async (updates) => {
        setSaving(true);
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            await refetchConfig();
        } catch (err) {
            console.error('Failed to update config:', err);
        } finally {
            setSaving(false);
        }
    };

    const runNow = async () => {
        try {
            await fetch('/api/agent/run-once', { method: 'POST' });
        } catch (err) {
            console.error('Failed to trigger run:', err);
        }
    };

    const agentRunning = health?.agent === 'running' || health?.agent === 'processing';

    return (
        <div className="space-y-7 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200/80">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
                            <Settings size={16} className="text-white" />
                        </div>
                        <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                            Agent Control
                        </h1>
                    </div>
                    <p className="text-slate-400 mt-1 text-[13px] font-medium leading-tight pl-11">Configure and manage agent behavior.</p>
                </div>
            </div>

            {/* Control Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Agent Status Card */}
                <div className="premium-card p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            agentRunning ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                        )}>
                            <Power size={18} strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="text-[16px] font-bold text-slate-800">Agent Status</h3>
                            <p className="text-[12px] text-slate-400 font-medium">Current operational state</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-3 h-3 rounded-full",
                                agentRunning ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-400"
                            )} />
                            <span className={cn(
                                "text-[18px] font-black tracking-tight capitalize",
                                agentRunning ? "text-emerald-600" : "text-slate-500"
                            )} style={{ fontFamily: 'var(--font-display)' }}>
                                {health?.agent || 'Unknown'}
                            </span>
                        </div>
                        <span className="text-[12px] font-medium text-slate-400">
                            Uptime: {Math.floor((health?.uptime || 0) / 60)}m
                        </span>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="premium-card p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Zap size={18} strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="text-[16px] font-bold text-slate-800">Quick Actions</h3>
                            <p className="text-[12px] text-slate-400 font-medium">Trigger immediate operations</p>
                        </div>
                    </div>

                    <button
                        onClick={runNow}
                        className="w-full px-5 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white rounded-xl font-bold text-[14px] tracking-tight transition-all shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
                    >
                        <Play size={16} strokeWidth={2.5} />
                        Run Now
                    </button>
                </div>
            </div>

            {/* Configuration */}
            <div className="premium-card p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Settings size={18} strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-[16px] font-bold text-slate-800">Configuration</h3>
                        <p className="text-[12px] text-slate-400 font-medium">Runtime settings and preferences</p>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* DRY RUN Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                        <div>
                            <p className="text-[14px] font-bold text-slate-800">DRY RUN Mode</p>
                            <p className="text-[12px] text-slate-400 font-medium mt-0.5">Simulate without making changes</p>
                        </div>
                        <button
                            onClick={() => {
                                const newValue = !dryRun;
                                setDryRun(newValue);
                                updateConfig({ dryRun: newValue });
                            }}
                            className={cn(
                                "relative w-14 h-7 rounded-full transition-all",
                                dryRun ? "bg-indigo-500" : "bg-slate-300"
                            )}
                        >
                            <div className={cn(
                                "absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform",
                                dryRun ? "translate-x-8" : "translate-x-1"
                            )} />
                        </button>
                    </div>

                    {/* YOLO Mode Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                        <div>
                            <p className="text-[14px] font-bold text-slate-800">YOLO Mode</p>
                            <p className="text-[12px] text-slate-400 font-medium mt-0.5">AI auto-fixes without confirmation</p>
                        </div>
                        <button
                            onClick={() => {
                                const newValue = !yoloMode;
                                setYoloMode(newValue);
                                updateConfig({ geminiYolo: newValue });
                            }}
                            className={cn(
                                "relative w-14 h-7 rounded-full transition-all",
                                yoloMode ? "bg-amber-500" : "bg-slate-300"
                            )}
                        >
                            <div className={cn(
                                "absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform",
                                yoloMode ? "translate-x-8" : "translate-x-1"
                            )} />
                        </button>
                    </div>

                    {/* Check Interval Slider */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-[14px] font-bold text-slate-800">Check Interval</p>
                                <p className="text-[12px] text-slate-400 font-medium mt-0.5">Time between task checks</p>
                            </div>
                            <span className="text-[16px] font-black text-indigo-600" style={{ fontFamily: 'var(--font-display)' }}>
                                {checkInterval}s
                            </span>
                        </div>
                        <input
                            type="range"
                            min="60"
                            max="3600"
                            step="60"
                            value={checkInterval}
                            onChange={(e) => setCheckInterval(parseInt(e.target.value))}
                            onMouseUp={() => updateConfig({ checkInterval })}
                            onTouchEnd={() => updateConfig({ checkInterval })}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-2">
                            <span>1m</span>
                            <span>60m</span>
                        </div>
                    </div>
                </div>

                {saving && (
                    <div className="mt-4 text-center text-[12px] font-medium text-indigo-600">
                        Saving configuration...
                    </div>
                )}
            </div>

            {/* System Info */}
            <div className="premium-card p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                        <Server size={18} strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-[16px] font-bold text-slate-800">System Information</h3>
                        <p className="text-[12px] text-slate-400 font-medium">Current environment details</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <User size={16} className="text-slate-400" />
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reviewer</p>
                            <p className="text-[13px] text-slate-700 font-bold">@{config?.reviewerHandle || '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <FolderOpen size={16} className="text-slate-400" />
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Workspace</p>
                            <p className="text-[13px] text-slate-700 font-bold">./workspace</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <Clock size={16} className="text-slate-400" />
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">API Port</p>
                            <p className="text-[13px] text-slate-700 font-bold">3001</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
