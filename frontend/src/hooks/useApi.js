import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Reusable data fetching hook with auto-refresh, loading, error, and refetch.
 *
 * @param {string} url - API endpoint
 * @param {object} options
 * @param {number} options.interval - Auto-refresh interval in ms (optional)
 * @param {object} options.params - Query params object (optional)
 * @returns {{ data, loading, error, refetch }}
 */
export function useApi(url, options = {}) {
  const { interval, params } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const buildUrl = useCallback(() => {
    if (!params || Object.keys(params).length === 0) return url;
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, value);
      }
    });
    const qs = searchParams.toString();
    return qs ? `${url}?${qs}` : url;
  }, [url, JSON.stringify(params)]);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);

    try {
      const res = await fetch(buildUrl());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!interval) return;
    intervalRef.current = setInterval(() => fetchData(true), interval);
    return () => clearInterval(intervalRef.current);
  }, [interval, fetchData]);

  return { data, loading, error, refetch };
}
