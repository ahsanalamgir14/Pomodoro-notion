import { useEffect, useRef } from "react";
import { useWorkerInterval } from "@/utils/worker-interval";

// A resilient interval hook that cleans up reliably and falls back to window.setInterval
export default function useInterval(
  callback: () => void,
  delay?: number | null
) {
  const savedCallback = useRef<() => void>();

  // Keep latest callback in ref to avoid stale closures
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const { clearInterval: clearWorkerInterval, setInterval: setWorkerInterval } =
    useWorkerInterval();

  // Track interval id and whether worker or window was used
  const intervalIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    // Always cleanup any existing interval before setting a new one
    const cleanup = () => {
      const currentId = intervalIdRef.current;
      if (currentId !== null) {
        if (typeof currentId === "string") {
          // Worker interval id is a string
          clearWorkerInterval(currentId);
        } else {
          // Window interval id is a number
          clearInterval(currentId as number);
        }
        intervalIdRef.current = null;
      }
    };

    // Cleanup on delay change/unmount
    cleanup();

    if (delay == null) {
      return;
    }

    // Try worker interval first; if unavailable, fall back to window
    const workerId = setWorkerInterval(() => {
      savedCallback.current?.();
    }, delay);

    if (workerId) {
      intervalIdRef.current = workerId;
    } else {
      const windowId = window.setInterval(() => {
        savedCallback.current?.();
      }, delay);
      intervalIdRef.current = windowId;
    }

    // Ensure cleanup on unmount or when delay changes
    return cleanup;
  }, [delay, clearWorkerInterval, setWorkerInterval]);
}
