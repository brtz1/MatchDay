import { useEffect, useState } from "react";

/**
 * useDebounce
 * ----------
 * Returns a *debounced* copy of a value that only updates after the
 * specified `delay` has elapsed without the value changing.
 *
 * ```tsx
 * const [query, setQuery] = useState("");
 * const debouncedQuery = useDebounce(query, 400);
 *
 * useEffect(() => {
 *   fetch(`/search?q=${debouncedQuery}`);
 * }, [debouncedQuery]);
 * ```
 *
 * @param value  Any serialisable value (string, number, object, etc.)
 * @param delay  Milliseconds to wait before publishing the update
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
