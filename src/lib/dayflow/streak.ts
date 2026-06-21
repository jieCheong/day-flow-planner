import { useMemo } from "react";
import { useDayflow } from "./store";
import { todayISO } from "./utils";
import { subDays, parseISO } from "date-fns";

/**
 * A "day done" is any past day that has at least one completed block.
 * Streak = consecutive days ending yesterday (or today if any completed today).
 */
export function useStreak() {
  const blocks = useDayflow((s) => s.blocks);
  return useMemo(() => {
    const completedDays = new Set(
      blocks.filter((b) => b.completed).map((b) => b.date),
    );

    let streak = 0;
    let cursor = parseISO(todayISO());
    // Allow today to not yet have a completion; count back from yesterday
    if (!completedDays.has(todayISO())) {
      cursor = subDays(cursor, 1);
    }
    while (completedDays.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor = subDays(cursor, 1);
    }

    return {
      days: streak,
      subtitle:
        streak === 0
          ? "Complete a block to start your streak"
          : streak < 7
            ? "Keep the momentum going"
            : "You're on fire — keep going",
    };
  }, [blocks]);
}
