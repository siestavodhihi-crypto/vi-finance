import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Trả về false khi render trên server (SSR) và true sau khi hydrate trên client.
 * Dùng useSyncExternalStore (chuẩn React 19, tránh cascading renders).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
