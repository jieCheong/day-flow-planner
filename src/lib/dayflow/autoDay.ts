import type { Category, TimeBlock, UserPrefs } from "./types";
import { uid, recurringMatches } from "./utils";
import { parseISO } from "date-fns";

/** Build a structured day around fixed events using prefs + category budgets. */
export function buildDay(opts: {
  dateISO: string;
  prefs: UserPrefs;
  categories: Category[];
  fixed: TimeBlock[]; // user-anchored events to preserve
}): TimeBlock[] {
  const { dateISO, prefs, categories, fixed } = opts;
  const date = parseISO(dateISO);
  const dow = date.getDay();
  const out: TimeBlock[] = [...fixed];

  const reserve = (s: number, e: number, title: string, category: string) => {
    if (overlapsAny(s, e, out)) return;
    out.push({
      id: uid(),
      title,
      category,
      date: dateISO,
      startMinutes: s,
      endMinutes: e,
      completed: false,
      autoplanned: true,
    });
  };

  // 1) Sleep (wraps midnight): sleepTime -> wakeTime
  const sleepCat = categories.find((c) => c.id === "sleep");
  if (sleepCat) {
    // Morning portion 00:00 → wake
    reserve(0, prefs.wakeTime, "Sleep", "sleep");
    // Evening portion sleepTime → 24:00
    reserve(prefs.sleepTime, 24 * 60, "Sleep", "sleep");
  }

  // 2) Meals (30 min each)
  const personal = categories.find((c) => c.id === "personal") ? "personal" : (categories[0]?.id ?? "personal");
  reserve(prefs.breakfast, prefs.breakfast + 30, "Breakfast", personal);
  reserve(prefs.lunch, prefs.lunch + 45, "Lunch", personal);
  reserve(prefs.dinner, prefs.dinner + 45, "Dinner", personal);

  // 3) Gym on selected days
  if (prefs.gymTime != null && prefs.gymDays.includes(dow)) {
    const gymCat = categories.find((c) => c.id === "gym");
    if (gymCat) {
      const dur = gymCat.defaultDuration ?? 90;
      reserve(prefs.gymTime, prefs.gymTime + dur, gymCat.name, "gym");
    }
  }

  // 4) Recurring categories with defaultStart/Duration
  for (const c of categories) {
    if (!c.recurring || c.id === "gym" || c.id === "sleep") continue;
    if (!recurringMatches(c.recurring, date)) continue;
    if (c.defaultStart == null || c.defaultDuration == null) continue;
    reserve(c.defaultStart, c.defaultStart + c.defaultDuration, c.name, c.id);
  }

  // 5) Fill focus window with work categories proportional to budget
  const workCats = categories.filter(
    (c) =>
      c.id !== "sleep" &&
      c.id !== "personal" &&
      c.id !== "gym" &&
      (c.budgetMinutes ?? 0) > 0,
  );
  const gaps = findGaps(prefs.focusStart, prefs.focusEnd, out).filter((g) => g[1] - g[0] >= 30);
  let gapIdx = 0;
  for (const cat of workCats) {
    let remaining = cat.budgetMinutes;
    while (remaining >= 30 && gapIdx < gaps.length) {
      const [gs, ge] = gaps[gapIdx];
      const free = ge - gs;
      if (free < 30) {
        gapIdx++;
        continue;
      }
      const dur = Math.min(remaining, free, 90);
      reserve(gs, gs + dur, cat.name, cat.id);
      gaps[gapIdx] = [gs + dur, ge];
      remaining -= dur;
      if (gaps[gapIdx][1] - gaps[gapIdx][0] < 30) gapIdx++;
    }
  }

  return out.sort((a, b) => a.startMinutes - b.startMinutes);
}

function overlapsAny(s: number, e: number, blocks: TimeBlock[]) {
  return blocks.some((b) => s < b.endMinutes && e > b.startMinutes);
}

function findGaps(start: number, end: number, blocks: TimeBlock[]): Array<[number, number]> {
  const inside = blocks
    .filter((b) => b.endMinutes > start && b.startMinutes < end)
    .map((b) => [Math.max(b.startMinutes, start), Math.min(b.endMinutes, end)] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const gaps: Array<[number, number]> = [];
  let cur = start;
  for (const [s, e] of inside) {
    if (s > cur) gaps.push([cur, s]);
    cur = Math.max(cur, e);
  }
  if (cur < end) gaps.push([cur, end]);
  return gaps;
}
