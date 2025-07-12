import { useCallback, useRef } from "react";

/**
 * useInfiniteScroll
 * -----------------
 * Hook that fires `onLoadMore` whenever the **sentinel element** becomes
 * visible — perfect for endless list pagination.
 *
 * Internally uses **IntersectionObserver** so it’s cheap and does not attach
 * scroll listeners.  You get back a `ref` callback; render it as a
 * `<div ref={sentinelRef} />` at the bottom of your list.
 *
 * ```tsx
 * const { sentinelRef, isFetching } = useInfiniteScroll({
 *   loading,
 *   hasMore,
 *   onLoadMore: fetchNextPage,
 * });
 *
 * return (
 *   <>
 *     {items.map(...)}
 *     <div ref={sentinelRef} />
 *   </>
 * )
 * ```
 */

export interface InfiniteScrollOptions {
  /** Are we currently fetching?  Prevents duplicate calls. */
  loading: boolean;
  /** Whether there is more data to load. */
  hasMore: boolean;
  /** Callback to fetch the next page. */
  onLoadMore: () => void;
  /** Root element for IO (defaults to viewport). */
  root?: HTMLElement | null;
  /** Margin so we pre-fetch before hitting the very bottom. */
  rootMargin?: string; // e.g. "200px"
  /** Intersection threshold (0–1). */
  threshold?: number;
}

export function useInfiniteScroll({
  loading,
  hasMore,
  onLoadMore,
  root = null,
  rootMargin = "200px",
  threshold = 0,
}: InfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (loading) return; // don’t observe while fetching
      if (observerRef.current) observerRef.current.disconnect();

      if (node) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            const [entry] = entries;
            if (entry.isIntersecting && hasMore && !loading) {
              onLoadMore();
            }
          },
          { root, rootMargin, threshold }
        );

        observerRef.current.observe(node);
      }
    },
    [loading, hasMore, onLoadMore, root, rootMargin, threshold]
  );

  return { sentinelRef };
}

export default useInfiniteScroll;
