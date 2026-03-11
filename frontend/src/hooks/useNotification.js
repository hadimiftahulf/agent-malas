import { useEffect, useRef, useCallback } from 'react';

const playNotificationSound = (type = 'info') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playTone = (freq, oscType, time, dur, vol) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = oscType;
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(vol, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + dur);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur);
    };

    if (type === 'start') {
      playTone(523.25, 'sine', 0, 0.15, 0.1);
      playTone(659.25, 'sine', 0.1, 0.15, 0.1);
      playTone(783.99, 'sine', 0.2, 0.2, 0.1);
    } else if (type === 'done') {
      playTone(440, 'sine', 0, 0.1, 0.1);
      playTone(554.37, 'sine', 0.1, 0.1, 0.1);
      playTone(659.25, 'sine', 0.2, 0.2, 0.1);
    } else if (type === 'error') {
      playTone(300, 'sawtooth', 0, 0.2, 0.05);
      playTone(250, 'sawtooth', 0.15, 0.2, 0.05);
    }
  } catch (e) {
    // Ignore audio playback errors
    console.warn('Audio playback failed', e);
  }
};

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

    if (type === 'task:start') {
      playNotificationSound('start');
      notify('Task Dimulai', `🚀 Mulai mengerjakan Task #${data?.taskId}: ${data?.title || ''}`);
    } else if (type === 'task:done') {
      playNotificationSound('done');
      notify('Task Selesai', `✅ Task #${data?.taskId} berhasil diselesaikan!`);
    } else if (type === 'task:error') {
      playNotificationSound('error');
      notify('Task Gagal', `❌ Task #${data?.taskId} gagal: ${data?.error || 'Unknown error'}`);
    }
  }, [wsHook?.lastEvent, notify]);

  return { notify };
}
