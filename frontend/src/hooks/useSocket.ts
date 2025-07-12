/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import socket from "@/socket"; // singleton at src/socket/index.ts

/**
 * ---------------------------------------------------------------------------
 * 1. useSocketEvent – subscribe / unsubscribe to a single event
 * ---------------------------------------------------------------------------
 *
 * ```tsx
 * useSocketEvent<MatchEvent>("match-event", (ev) => {
 *   setEvents((prev) => [...prev, ev]);
 * });
 * ```
 */
export function useSocketEvent<T = any>(
  event: string,
  handler: (data: T) => void
) {
  const savedHandler: MutableRefObject<typeof handler | null> = useRef(null);

  // Persist handler ref so we always call the latest version
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    function listener(data: T) {
      savedHandler.current?.(data);
    }

    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [event]);
}

/**
 * ---------------------------------------------------------------------------
 * 2. useSocketStatus – track connect / disconnect state
 * ---------------------------------------------------------------------------
 */
export function useSocketStatus() {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return connected;
}

/**
 * ---------------------------------------------------------------------------
 * 3. emit helper – just re-export, optionally typed
 * ---------------------------------------------------------------------------
 *
 * ```ts
 * emit("join-room", { id: 123 });
 * ```
 */
export const emit = socket.emit.bind(socket);

export default socket;
