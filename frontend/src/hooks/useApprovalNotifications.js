import { useState, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

const API_BASE = 'http://localhost:3001/api';

export function useApprovalNotifications() {
    const [pendingCount, setPendingCount] = useState(0);
    const ws = useWebSocket();

    // Fetch pending count
    const fetchPendingCount = async () => {
        try {
            const response = await fetch(`${API_BASE}/approval/pending`);
            const data = await response.json();
            if (data.success) {
                setPendingCount(data.data.length);
            }
        } catch (error) {
            console.error('Error fetching pending count:', error);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchPendingCount();
    }, []);

    // Listen for WebSocket events
    useEffect(() => {
        if (ws.lastEvent?.type === 'approval:request') {
            console.log('New approval request:', ws.lastEvent.data);
            fetchPendingCount();

            // Play notification sound
            playNotificationSound();

            // Show browser notification
            showBrowserNotification(ws.lastEvent.data.title);

        } else if (ws.lastEvent?.type === 'approval:response') {
            console.log('Approval response:', ws.lastEvent.data);
            fetchPendingCount();
        }
    }, [ws.lastEvent]);

    return { pendingCount, refreshCount: fetchPendingCount };
}

// Play notification sound
function playNotificationSound() {
    // Create audio element with data URL (simple beep sound)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Show browser notification
function showBrowserNotification(title) {
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            const notification = new Notification('🔔 New Task Approval Required', {
                body: title,
                icon: '/vite.svg',
                badge: '/vite.svg',
                tag: 'approval-request',
                requireInteraction: true,
                silent: false
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    showBrowserNotification(title);
                }
            });
        }
    }
}
