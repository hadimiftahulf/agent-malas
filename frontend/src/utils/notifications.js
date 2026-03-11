// Notification utilities

// Play notification sound
export function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        const playTone = (frequency, startTime, duration) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };

        const now = audioContext.currentTime;
        playTone(800, now, 0.15);
        playTone(1000, now + 0.15, 0.15);

        console.log('✓ Notification sound played');
    } catch (error) {
        console.log('Could not play notification sound:', error);
    }
}

// Show browser notification
export function showBrowserNotification(title, body, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body,
            icon: '/vite.svg',
            badge: '/vite.svg',
            tag: 'approval-request',
            requireInteraction: true,
            silent: false, // This will use system sound
            ...options
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // Also play our custom sound
        playNotificationSound();

        return notification;
    }
    return null;
}

// Request notification permission
export async function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('✓ Notification permission granted');
                // Show welcome notification
                showBrowserNotification(
                    '🔔 Notifications Enabled',
                    'You will receive alerts for new approval requests'
                );
                return true;
            }
        } else if (Notification.permission === 'granted') {
            console.log('✓ Notification permission already granted');
            return true;
        }
    }
    return false;
}

// Initialize notifications on user interaction
export function initializeNotifications() {
    // Add click listener to enable audio context
    const enableAudio = () => {
        playNotificationSound();
        document.removeEventListener('click', enableAudio);
        console.log('✓ Audio context initialized');
    };

    document.addEventListener('click', enableAudio, { once: true });

    // Request notification permission
    requestNotificationPermission();
}
