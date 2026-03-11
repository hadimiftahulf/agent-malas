import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardStats } from './components/DashboardStats';
import { TaskQueue } from './components/TaskQueue';
import { PRTracker } from './components/PRTracker';
import { AgentControl } from './components/AgentControl';
import { LiveTerminal } from './components/LiveTerminal';
import { MetricsChart } from './components/MetricsChart';
import ApprovalNotifications from './components/ApprovalNotifications';
import { useApi } from './hooks/useApi';
import { useWebSocket } from './hooks/useWebSocket';
import { useNotification } from './hooks/useNotification';
import { useToast, ToastContainer } from './hooks/useToast';

const pages = {
  dashboard: DashboardStats,
  tasks: TaskQueue,
  prs: PRTracker,
  approvals: ApprovalNotifications,
  settings: AgentControl,
  logs: LiveTerminal,
  metrics: MetricsChart,
};

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: health } = useApi('/api/health', { interval: 10000 });
  const ws = useWebSocket();
  const { toasts, addToast, removeToast } = useToast();

  // Browser notifications on WebSocket events
  useNotification(ws);

  // In-app toast on WebSocket events
  useEffect(() => {
    if (!ws.lastEvent) return;
    const { type, data } = ws.lastEvent;
    if (type === 'task:done') {
      addToast(`Task #${data?.taskId} berhasil diselesaikan!`, 'success');
    } else if (type === 'task:error') {
      addToast(`Task #${data?.taskId} gagal: ${data?.error || 'error'}`, 'error');
    } else if (type === 'task:start') {
      addToast(`Mulai mengerjakan Task #${data?.taskId}`, 'info');
    } else if (type === 'approval:request') {
      addToast(`🔔 New approval required: ${data?.title}`, 'info');
    } else if (type === 'approval:response') {
      const status = data?.status === 'approved' ? '✅ Approved' : '❌ Rejected';
      addToast(`${status}: ${data?.task?.title}`, data?.status === 'approved' ? 'success' : 'error');
    }
  }, [ws.lastEvent, addToast]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    // Ctrl+L → toggle Live Logs
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setActivePage(prev => prev === 'logs' ? 'dashboard' : 'logs');
    }
    // Ctrl+K → focus search (if any search input exists)
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]');
      if (searchInput) searchInput.focus();
    }
    // Escape → close sidebar on mobile
    if (e.key === 'Escape') {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const PageComponent = pages[activePage] || DashboardStats;

  return (
    <div className="flex h-screen w-full bg-[#EAEFF5] text-[#0F172A] font-sans overflow-hidden selection:bg-indigo-500/20 selection:text-indigo-700">

      <Sidebar
        activePage={activePage}
        onNavigate={(page) => {
          setActivePage(page);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative">

        <Header health={health} onMenuToggle={() => setSidebarOpen(true)} onNavigate={setActivePage} />

        {/* Content Panel */}
        <main className="flex-1 overflow-y-auto scroll-smooth p-6 md:p-8 lg:p-10">
          <div className="bg-white rounded-[28px] shadow-[0_2px_16px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)] min-h-full">
            <div className="px-10 py-10 sm:px-14 sm:py-12 md:px-20 md:py-14 max-w-[1400px] mx-auto w-full">
              <PageComponent />
            </div>
          </div>
        </main>

        {/* WebSocket disconnect banner */}
        {!ws.connected && (
          <div className="fixed top-0 left-0 right-0 z-[9998] bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-center gap-2 text-[13px] font-semibold text-amber-700 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Koneksi terputus, reconnecting...
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
