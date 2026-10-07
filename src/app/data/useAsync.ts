import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { toast } from 'sonner';

export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => void;
}

const sameDeps = (a: DependencyList, b: DependencyList) =>
  a.length === b.length && a.every((value, i) => Object.is(value, b[i]));

/**
 * Runs an async loader when `deps` change and tracks loading and error state.
 * Results from a stale run (deps changed, or unmounted) are dropped.
 *
 * Data is only returned for the deps it was loaded with, so after a deps change
 * (e.g. /jobs/A → /jobs/B) the page never shows or acts on the previous record,
 * not even for one render. `reload()` keeps the current data on screen while it
 * refreshes; if that refresh fails, pages still render the old data, so the
 * failure is surfaced as a toast.
 */
export function useAsync<T>(load: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [loaded, setLoaded] = useState<{ deps: DependencyList; data: T }>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const hasData = useRef(false);

  useEffect(() => {
    let current = true;
    const runDeps = deps;
    setLoading(true);
    setError(undefined);
    load().then(
      (result) => {
        if (!current) return;
        hasData.current = true;
        setLoaded({ deps: runDeps, data: result });
        setLoading(false);
      },
      (err: unknown) => {
        if (!current) return;
        const e = err instanceof Error ? err : new Error(String(err));
        if (hasData.current) toast.error(`Couldn't refresh: ${e.message}`);
        setError(e);
        setLoading(false);
      },
    );
    return () => {
      current = false;
    };
    // `load` is a fresh closure each render; callers list what it depends on.
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const fresh = loaded !== undefined && sameDeps(loaded.deps, deps);
  if (!fresh) hasData.current = false;
  return { data: fresh ? loaded.data : undefined, error, loading, reload };
}
