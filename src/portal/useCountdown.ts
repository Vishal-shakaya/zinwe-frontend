import { useCallback, useEffect, useState } from "react";

/**
 * Seconds left until a deadline (resend cooldowns, 429 waits). Ticks once a
 * second while running; `start(n)` restarts it.
 */
export function useCountdown(initialSeconds = 0): { seconds: number; start: (seconds: number) => void } {
  const [deadline, setDeadline] = useState(() => Date.now() + initialSeconds * 1000);
  const [now, setNow] = useState(() => Date.now());

  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  const running = seconds > 0;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const start = useCallback((next: number) => {
    const at = Date.now();
    setNow(at);
    setDeadline(at + Math.max(0, next) * 1000);
  }, []);

  return { seconds, start };
}
