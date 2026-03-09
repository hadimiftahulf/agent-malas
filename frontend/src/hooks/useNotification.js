import { useEffect, useRef, useCallback } from 'react';

/**
 * Browser notification hook. Triggers notifications for WebSocket events
 * when the tab is inactive (document.hidden).
 */
export function useNotification(wsHook) {
  const permissionRef = useRef(Notification.permission);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        permissionRef.current = perm;
      });
    }
  }, []);

  const notify = useCallback((title, body, icon = '🤖') => {
    if (!document.hidden) return;
    if (permissionRef.current !== 'granted') return;

    try {
      new Notification(title, {
        body,
        icon: icon === '✅' ? undefined : undefined,
        badge: undefined,
        tag: `agent-malas-${Date.now()}`,
        silent: false,
      });
    } catch {
      // Notification API not available
    }
  }, []);

  // Listen to WebSocket events
  useEffect(() => {
    if (!wsHook?.lastEvent) return;
    const { type, data } = wsHook.lastEvent;

    if (type === 'task:done') {
      notify('Task Selesai', `✅ Task #${data?.taskId} berhasil diselesaikan!`);
    } else if (type === 'task:error') {
      notify('Task Gagal', `❌ Task #${data?.taskId} gagal: ${data?.error || 'Unknown error'}`);
    }
  }, [wsHook?.lastEvent, notify]);

  return { notify };
}
