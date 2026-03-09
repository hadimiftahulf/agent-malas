import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { cn } from '../lib/utils';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const RANGE_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
];

const PIE_COLORS = {
  approved: '#10b981',
  changes_requested: '#f43f5e',
  pending: '#f59e0b',
  merged: '#8b5cf6',
};

const PIE_LABELS = {
  approved: 'Approved',
  changes_requested: 'Changes Req',
  pending: 'Pending',
  merged: 'Merged',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl px-4 py-3 shadow-xl">
      <p className="text-[12px] font-bold text-slate-500 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[13px] font-semibold">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="text-slate-900">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, icon: Icon, iconGradient, children, className }) {
  return (
    <div className={cn("premium-card p-6", className)}>
      <div className="flex items-center gap-2.5 mb-5">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shadow-sm", iconGradient)}>
          <Icon size={14} className="text-white" />
        </div>
        <h3 className="text-[15px] font-extrabold text-slate-800 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function DailyActivityChart({ data }) {
  const chartData = [...(data || [])].reverse().map(d => ({
    date: d.date?.slice(5) || '',
    Completed: d.tasks_completed || 0,
    Failed: d.tasks_failed || 0,
  }));

  if (!chartData.length) {
    return <EmptyChart message="Belum ada data activity" />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="Completed" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
        <Bar dataKey="Failed" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SuccessRateChart({ data }) {
  const chartData = [...(data || [])].reverse().map(d => {
    const total = (d.tasks_completed || 0) + (d.tasks_failed || 0);
    return {
      date: d.date?.slice(5) || '',
      Rate: total > 0 ? Math.round((d.tasks_completed / total) * 100) : 0,
    };
  });

  if (!chartData.length) {
    return <EmptyChart message="Belum ada data success rate" />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} unit="%" />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="Rate" stroke="#10b981" strokeWidth={2.5} fill="url(#successGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function PRStatusChart({ stats }) {
  const data = Object.entries(stats || {})
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: PIE_LABELS[key] || key,
      value,
      fill: PIE_COLORS[key] || '#94a3b8',
    }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (!data.length) {
    return <EmptyChart message="Belum ada PR data" />;
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Pie>
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-[12px] font-semibold text-slate-600">{value}</span>}
          />
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+18px)] text-center pointer-events-none">
        <span className="text-[28px] font-extrabold text-slate-800 block leading-none">{total}</span>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
      </div>
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="flex items-center justify-center h-[220px]">
      <div className="text-center">
        <Activity size={32} className="mx-auto text-slate-200 mb-3" />
        <p className="text-[13px] font-medium text-slate-400">{message}</p>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-[220px] w-full animate-pulse bg-slate-100 rounded-2xl" />;
}

export function MetricsChart() {
  const [days, setDays] = useState(7);

  const { data: metricsData, loading: metricsLoading } = useApi('/api/dashboard/metrics', {
    interval: 60000,
    params: { days },
  });
  const { data: prStats, loading: prLoading } = useApi('/api/prs/stats', { interval: 60000 });

  const metrics = metricsData?.data || [];

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <TrendingUp size={16} className="text-white" />
            </div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Analytics
            </h1>
          </div>
          <p className="text-slate-400 mt-1 text-[13px] font-medium leading-tight pl-11">Performance trends and metrics over time.</p>
        </div>

        {/* Date Range Selector */}
        <div className="flex p-1 bg-slate-100 rounded-2xl inline-flex self-start sm:self-auto shadow-inner">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={cn(
                "px-4 py-2 text-[12px] font-bold rounded-xl transition-all duration-300 min-w-[56px] text-center",
                days === opt.value
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Daily Activity"
          icon={BarChart3}
          iconGradient="bg-gradient-to-br from-indigo-500 to-violet-500"
        >
          {metricsLoading ? <ChartSkeleton /> : <DailyActivityChart data={metrics} />}
        </ChartCard>

        <ChartCard
          title="Success Rate"
          icon={TrendingUp}
          iconGradient="bg-gradient-to-br from-emerald-500 to-teal-500"
        >
          {metricsLoading ? <ChartSkeleton /> : <SuccessRateChart data={metrics} />}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard
          title="PR Distribution"
          icon={PieChartIcon}
          iconGradient="bg-gradient-to-br from-violet-500 to-purple-500"
          className="lg:col-span-1"
        >
          {prLoading ? <ChartSkeleton /> : <PRStatusChart stats={prStats} />}
        </ChartCard>

        {/* Summary Stats */}
        <div className="lg:col-span-2 premium-card p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
              <Activity size={14} className="text-white" />
            </div>
            <h3 className="text-[15px] font-extrabold text-slate-800 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Period Summary
            </h3>
          </div>
          {metricsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[80px] animate-pulse bg-slate-100 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Tasks Done', value: metrics.reduce((s, d) => s + (d.tasks_completed || 0), 0), color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                { label: 'Tasks Failed', value: metrics.reduce((s, d) => s + (d.tasks_failed || 0), 0), color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
                { label: 'PRs Created', value: metrics.reduce((s, d) => s + (d.prs_created || 0), 0), color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                { label: 'PRs Revised', value: metrics.reduce((s, d) => s + (d.prs_revised || 0), 0), color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
              ].map((stat) => (
                <div key={stat.label} className={cn("rounded-xl p-4 border text-center", stat.bg, stat.border)}>
                  <span className={cn("text-[32px] font-extrabold block leading-none mb-1", stat.color)}>{stat.value}</span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
