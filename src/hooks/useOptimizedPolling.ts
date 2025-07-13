import { useEffect, useRef, useState } from 'react';

interface UseOptimizedPollingOptions<T> {
  url: string;
  interval: number;
  enabled: boolean;
  onDataChange?: (data: T) => void;
}

export function useOptimizedPolling<T>({
  url,
  interval,
  enabled,
  onDataChange
}: UseOptimizedPollingOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const lastUpdatedRef = useRef<number>(0);
  const dataRef = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchData = async () => {
      try {
        // First check if data has been updated
        const lastUpdatedResponse = await fetch('/api/lastUpdated');
        if (lastUpdatedResponse.ok) {
          const { lastUpdated } = await lastUpdatedResponse.json();
          
          // Only fetch full data if it's been updated
          if (lastUpdated > lastUpdatedRef.current) {
            console.log('Data has been updated, fetching new data...');
            
            const response = await fetch(url);
            if (response.ok) {
              const newData = await response.json();
              
              // Only update state if the data has actually changed
              if (JSON.stringify(newData) !== JSON.stringify(dataRef.current)) {
                setData(newData);
                dataRef.current = newData;
                onDataChange?.(newData);
              }
              
              lastUpdatedRef.current = lastUpdated;
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Polling error:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling
    const intervalId = setInterval(fetchData, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [url, interval, enabled, onDataChange]);

  return { data, isLoading, error };
}
