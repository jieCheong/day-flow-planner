import { useMemo } from "react";
import { isBefore, parseISO } from "date-fns";
import { useDayflow } from "./store";
import type { Category, TimeBlock } from "./types";
import { recurringMatches, uid } from "./utils";

/**
 * Hours-weighted day stats: how much of today's *time budget* was
 * actually completed, plus block counts. Used by the day meter, the
 * monthly heatmap, and analytics.
 */
export function dayGoalStats(
  dateISO: string,
  blocks: TimeBlock[],
  categories: Category[],
) {
  const date = parseISO(dateISO);
  let goalMinutes = 0;
  for (const c of categories) {
    if (c.id === "sleep" || c.id === "personal") continue;
    if (!c.budgetMinutes || c.budgetMinutes <= 0) continue;
    if (c.recurring && !recurringMatches(c.recurring, date)) continue;
    goalMinutes += c.budgetMinutes;
  }
  const dayBlocks = blocks.filter(
    (b) => b.date === dateISO && b.category !== "sleep",
  );
  const doneMinutes = dayBlocks
    .filter((b) => b.completed)
    .reduce((acc, b) => acc + Math.max(0, b.endMinutes - b.startMinutes), 0);
  const doneBlocks = dayBlocks.filter((b) => b.completed).length;
  const totalBlocks = dayBlocks.length;
  const pct =
    goalMinutes === 0
      ? 0
      : Math.min(100, Math.round((doneMinutes / goalMinutes) * 100));
  return { goalMinutes, doneMinutes, doneBlocks, totalBlocks, pct };
}

/**
 * Returns blocks for a given date, combining user-created blocks with
 * recurring instances generated from category defaults.
 *
 * Recurring instances are NOT persisted; their completion state is tracked
 * by creating an actual block on toggle.
 */
export function useBlocksForDate(dateISO: string): TimeBlock[] {
  const categories = useDayflow((s) => s.categories);
  const blocks = useDayflow((s) => s.blocks);

  return useMemo(() => {
    const date = parseISO(dateISO);
    const userBlocks = blocks.filter((b) => b.date === dateISO);
    const recurringInstances: TimeBlock[] = [];

    for (const cat of categories) {
      if (!cat.recurring) continue;
      if (!recurringMatches(cat.recurring, date)) continue;
      if (cat.defaultStart == null || cat.defaultDuration == null) continue;

      const templateId = `tpl-${cat.id}`;
      const alreadyPresent = userBlocks.some(
        (b) => b.templateId === templateId,
      );
      if (alreadyPresent) continue;

      recurringInstances.push({
        id: `${templateId}-${dateISO}`,
        title: cat.name,
        category: cat.id,
        date: dateISO,
        startMinutes: cat.defaultStart,
        endMinutes: cat.defaultStart + cat.defaultDuration,
        completed: false,
        templateId,
      });
    }

    return [...userBlocks, ...recurringInstances].sort(
      (a, b) => a.startMinutes - b.startMinutes,
    );
  }, [dateISO, blocks, categories]);
}

/**
 * Toggles a block — if it's a generated recurring instance, materializes it
 * first so the toggle persists.
 */
export function useToggleBlock() {
  const toggle = useDayflow((s) => s.toggleBlock);
  return (block: TimeBlock) => {
    if (block.id.startsWith("tpl-")) {
      const newId = uid();
      useDayflow.setState((state) => ({
        blocks: [
          ...state.blocks,
          {
            ...block,
            id: newId,
            completed: true,
          },
        ],
      }));
      return newId;
    }
    toggle(block.id);
    return block.id;
  };
}

export function isMissed(block: TimeBlock, now: Date, dateISO: string) {
  if (block.completed) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (dateISO !== today) {
    // For past dates, mark incomplete as missed
    return dateISO < today;
  }
  const blockEnd = new Date(now);
  const h = Math.floor(block.endMinutes / 60);
  const m = block.endMinutes % 60;
  blockEnd.setHours(h, m, 0, 0);
  return isBefore(blockEnd, now);
}
