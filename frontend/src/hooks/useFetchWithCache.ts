import { useState, useEffect, useRef } from 'react';

interface CacheOptions {
    revalidateOnFocus?: boolean;
}

export function useFetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    dependencies: any[] = [],
    options: CacheOptions = {}
) {
    const [data, setData] = useState<T | null>(() => {
        // Initial state from cache if available
        try {
            const cached = localStorage.getItem(key);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (e) {
            console.warn(`Failed to parse cache for key ${key}`, e);
        }
        return null;
    });

    const [loading, setLoading] = useState(!data);
    const [error, setError] = useState<Error | null>(null);
    const mountedRef = useRef(true);

    const fetchData = async () => {
        // If we have data, we are in "background update" mode, so don't set loading to true
        // unless you want to show a spinner even when showing stale data (usually not desired for SWR)
        if (!data) {
            setLoading(true);
        }

        try {
            const result = await fetcher();

            if (mountedRef.current) {
                setData(result);
                setLoading(false);
                try {
                    localStorage.setItem(key, JSON.stringify(result));
                } catch (e) {
                    console.warn(`Failed to write cache for key ${key}`, e);
                }
            }
        } catch (err) {
            if (mountedRef.current) {
                setError(err instanceof Error ? err : new Error(String(err)));
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        fetchData();

        return () => {
            mountedRef.current = false;
        };
    }, [key, ...dependencies]);

    // Optional: Refetch on window focus could be added here similar to SWR/React Query

    return { data, loading, error, refetch: fetchData };
}
