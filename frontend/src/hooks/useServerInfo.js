import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to fetch and manage server information for QR code generation.
 * Fetches server IP address and port from the backend.
 *
 * @returns {{ serverInfo, loading, error, refresh }}
 */
export function useServerInfo() {
    const [serverInfo, setServerInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchServerInfo = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/server-info');
            if (!response.ok) {
                throw new Error('Failed to fetch server info');
            }
            const data = await response.json();
            setServerInfo(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchServerInfo();
    }, [fetchServerInfo]);

    return {
        serverInfo,
        loading,
        error,
        refresh: fetchServerInfo
    };
}
