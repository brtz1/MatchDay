import { useCallback, useRef } from "react";
export function useInfiniteScroll({ loading, hasMore, onLoadMore, root = null, rootMargin = "200px", threshold = 0, }) {
    const observerRef = useRef(null);
    const sentinelRef = useCallback((node) => {
        if (loading)
            return; // don’t observe while fetching
        if (observerRef.current)
            observerRef.current.disconnect();
        if (node) {
            observerRef.current = new IntersectionObserver((entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && hasMore && !loading) {
                    onLoadMore();
                }
            }, { root, rootMargin, threshold });
            observerRef.current.observe(node);
        }
    }, [loading, hasMore, onLoadMore, root, rootMargin, threshold]);
    return { sentinelRef };
}
export default useInfiniteScroll;
//# sourceMappingURL=useInfiniteScroll.js.map