import { LayoutDashboard, ListTodo, GitPullRequestDraft, Settings, TerminalSquare, X, Zap, ChevronsLeft, ChevronsRight, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

const menuItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
  { id: 'tasks', icon: ListTodo, label: 'Task Queue' },
  { id: 'prs', icon: GitPullRequestDraft, label: 'Pull Requests' },
  { id: 'metrics', icon: TrendingUp, label: 'Analytics' },
  { id: 'settings', icon: Settings, label: 'Settings' },
  { id: 'logs', icon: TerminalSquare, label: 'Live Logs' },
];

export function Sidebar({ activePage, onNavigate, isOpen, onClose, collapsed, onToggleCollapse }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar - INCREASED WIDTH AND PADDING */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col h-screen",
          "md:static md:shrink-0",
          "bg-white",
          "border-r border-slate-200/70",
          "shadow-[4px_0_24px_-8px_rgba(0,0,0,0.06)]",
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          collapsed ? "md:w-[85px] w-[290px]" : "w-[290px]",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* ── Brand - INCREASED PADDING ── */}
        <div className={cn(
          "h-[85px] flex items-center shrink-0 border-b border-slate-100 transition-all duration-300",
          collapsed ? "md:justify-center md:px-6 px-12 justify-between" : "justify-between px-12"
        )}>
          <div className={cn("flex items-center group cursor-pointer", collapsed ? "md:gap-0 gap-5" : "gap-5")}>
            <div className="w-12 h-12 rounded-[16px] flex items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 group-hover:scale-105 transition-all duration-300 shrink-0">
              <Zap size={24} strokeWidth={2.5} />
            </div>
            <div className={cn("flex flex-col transition-all duration-300 overflow-hidden", collapsed ? "md:w-0 md:opacity-0 w-auto opacity-100" : "w-auto opacity-100")}>
              <h1 className="text-[18px] font-extrabold tracking-tight text-slate-900 leading-tight whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                Agent Malas
              </h1>
              <span className="text-[12px] font-semibold text-slate-400 tracking-wide leading-none whitespace-nowrap mt-1">Dashboard</span>
            </div>
          </div>
          <button
            className="md:hidden p-2 -mr-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Navigation - INCREASED PADDING ── */}
        <nav className={cn("flex-1 py-9 overflow-y-auto transition-all duration-300", collapsed ? "md:px-4 px-9" : "px-9")}>
          <div className={cn("mb-7 transition-all duration-300 overflow-hidden", collapsed ? "md:px-0 md:text-center px-4" : "px-4")}>
            <h2 className={cn(
              "text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-300 transition-all duration-300 whitespace-nowrap",
              collapsed && "md:text-[9px] md:tracking-[0.1em]"
            )}>
              {collapsed ? <span className="hidden md:inline">•••</span> : null}
              <span className={cn(collapsed && "md:hidden")}>Menu</span>
            </h2>
          </div>
          <div className="space-y-2.5">
            {menuItems.map((item) => {
              const isActive = activePage === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => !item.disabled && onNavigate(item.id)}
                  disabled={item.disabled}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "w-full flex items-center rounded-[14px] text-[14px] font-semibold relative",
                    "transition-all duration-200 outline-none group/item",
                    collapsed ? "md:justify-center md:px-0 md:py-3 px-4 py-3 gap-4" : "px-4 py-3 gap-4",
                    isActive
                      ? "bg-gradient-to-r from-indigo-50 to-indigo-50/50 text-indigo-700 sidebar-active-glow font-bold"
                      : item.disabled
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  )}
                >
                  {isActive && !collapsed && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
                  )}
                  {isActive && collapsed && (
                    <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-r-full" />
                  )}

                  <div className={cn(
                    "w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 transition-all duration-200",
                    isActive
                      ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/25"
                      : item.disabled
                        ? "bg-slate-50 text-slate-300"
                        : "bg-slate-100 text-slate-400 group-hover/item:bg-slate-200/70 group-hover/item:text-slate-600"
                  )}>
                    <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  </div>

                  <span className={cn(
                    "truncate flex-1 text-left transition-all duration-300 overflow-hidden whitespace-nowrap",
                    collapsed ? "md:w-0 md:opacity-0 md:hidden" : ""
                  )}>
                    {item.label}
                  </span>

                  {item.disabled && !collapsed && (
                    <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full", collapsed && "md:hidden")}>
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* ── Collapse Toggle (Desktop only) - INCREASED PADDING ── */}
        <div className="hidden md:flex px-8 py-4 border-t border-slate-100">
          <button
            onClick={onToggleCollapse}
            className={cn(
              "w-full flex items-center gap-3 px-5 py-3 rounded-[14px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all text-[13px] font-semibold",
              collapsed && "justify-center"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            <span className={cn("whitespace-nowrap transition-all duration-300", collapsed ? "hidden" : "")}>Collapse</span>
          </button>
        </div>

        {/* ── Footer - INCREASED PADDING ── */}
        <div className={cn("px-8 pb-7 pt-4 border-t border-slate-100 transition-all duration-300", collapsed && "md:px-4")}>
          <div className={cn(
            "rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/60 flex items-center cursor-default transition-all duration-300",
            collapsed ? "md:justify-center md:px-0 md:py-4 px-5 py-4 gap-4" : "px-5 py-4 gap-4"
          )}>
            <div className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
            </div>
            <div className={cn("flex flex-col text-left min-w-0 transition-all duration-300 overflow-hidden", collapsed ? "md:w-0 md:opacity-0 md:hidden" : "")}>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.12em] leading-none mb-2 whitespace-nowrap">System Status</span>
              <span className="text-[12px] font-bold text-slate-700 truncate leading-none whitespace-nowrap">All systems optimal</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
