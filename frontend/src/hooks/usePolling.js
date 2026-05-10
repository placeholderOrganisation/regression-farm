import { useEffect, useState, useRef } from "react";

export default function usePolling(fn, intervalMs = 3000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const v = await fnRef.current();
        if (!cancelled) {
          setData(v);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    tick();
    const h = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(h);
    };
  }, [intervalMs]);

  return { data, error, loading };
}
