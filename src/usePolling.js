// Runs fn now and then every ms. Pauses while the browser tab is hidden.
import { useEffect, useRef } from "react";

function usePolling(fn, ms) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    saved.current();
    const timer = setInterval(() => {
      if (document.visibilityState !== "hidden") saved.current();
    }, ms);
    return () => clearInterval(timer);
  }, [ms]);
}

export { usePolling };
