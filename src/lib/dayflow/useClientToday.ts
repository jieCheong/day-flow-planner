import { useEffect, useState } from "react";
import { todayISO } from "./utils";

/**
 * Returns today's ISO date, but only after client mount.
 * During SSR returns a stable empty string so server and first client render
 * agree, avoiding hydration mismatches caused by server/client timezone diff.
 */
export function useClientToday(): string {
  const [date, setDate] = useState<string>("");
  useEffect(() => {
    setDate(todayISO());
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNextMidnight = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 1, 0); // 00:00:01 tomorrow local time
      timer = setTimeout(() => {
        setDate(todayISO());
        scheduleNextMidnight();
      }, next.getTime() - now.getTime());
    };
    scheduleNextMidnight();
    // Also re-sync when the tab regains focus (handles sleep across midnight)
    const onFocus = () => setDate(todayISO());
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);
  return date;
}
