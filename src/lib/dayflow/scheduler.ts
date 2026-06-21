import { useDayflow } from "./store";
import type { Task, TimeBlock } from "./types";
import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { recurringMatches, toISO, uid } from "./utils";

const DAY_START = 8 * 60; // 8 AM
const DAY_END = 22 * 60; // 10 PM
const CHUNK = 60; // 1 hour chunks
const MIN_CHUNK = 30;

interface ScheduleResult {
  scheduled: number; // minutes
  blocksCreated: number;
  warning?: string;
}

/**
 * Auto-schedule a task across days from today up to its deadline (inclusive),
 * placing 30-60 min chunks into free slots between 8 AM – 10 PM, avoiding
 * existing blocks (user + recurring instances).
 *
 * Already-scheduled minutes for this task are deducted from the remaining
 * estimate, so calling this repeatedly tops up the schedule rather than
 * duplicating it.
 */
export function autoScheduleTask(task: Task): ScheduleResult {
  const state = useDayflow.getState();
  if (!task.estimateMinutes || !task.deadline) {
    return {
      scheduled: 0,
      blocksCreated: 0,
      warning: "Task needs an estimate and a deadline",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = parseISO(task.deadline);
  const dayCount = differenceInCalendarDays(deadline, today) + 1;
  if (dayCount < 1) {
    return {
      scheduled: 0,
      blocksCreated: 0,
      warning: "Deadline is in the past",
    };
  }

  // Existing minutes already scheduled for this task
  const alreadyScheduled = state.blocks
    .filter((b) => b.taskId === task.id)
    .reduce((acc, b) => acc + (b.endMinutes - b.startMinutes), 0);
  let remaining = Math.max(0, task.estimateMinutes - alreadyScheduled);
  if (remaining === 0) {
    return { scheduled: 0, blocksCreated: 0, warning: "Already fully scheduled" };
  }

  const perDayTarget = Math.ceil(remaining / dayCount / 15) * 15;
  const created: TimeBlock[] = [];

  for (let i = 0; i < dayCount && remaining > 0; i++) {
    const date = addDays(today, i);
    const iso = toISO(date);
    let dayBudget = Math.min(remaining, perDayTarget);

    // Collect occupied slots for this day (user blocks + recurring instances)
    const occupied: Array<[number, number]> = [];
    for (const b of state.blocks) {
      if (b.date === iso) occupied.push([b.startMinutes, b.endMinutes]);
    }
    for (const cat of state.categories) {
      if (!cat.recurring) continue;
      if (!recurringMatches(cat.recurring, date)) continue;
      if (cat.defaultStart == null || cat.defaultDuration == null) continue;
      const templateId = `tpl-${cat.id}`;
      if (state.blocks.some((b) => b.date === iso && b.templateId === templateId))
        continue;
      occupied.push([cat.defaultStart, cat.defaultStart + cat.defaultDuration]);
    }
    occupied.sort((a, b) => a[0] - b[0]);

    // Find gaps within [DAY_START, DAY_END]
    let cursor = DAY_START;
    for (const [s, e] of occupied) {
      if (s > cursor) {
        const gap = Math.min(s, DAY_END) - cursor;
        if (gap >= MIN_CHUNK && dayBudget > 0) {
          const dur = Math.min(gap, dayBudget, CHUNK);
          created.push(makeBlock(task, iso, cursor, cursor + dur));
          dayBudget -= dur;
          remaining -= dur;
        }
      }
      cursor = Math.max(cursor, e);
      if (cursor >= DAY_END) break;
    }
    while (cursor < DAY_END && dayBudget > 0) {
      const gap = DAY_END - cursor;
      if (gap < MIN_CHUNK) break;
      const dur = Math.min(gap, dayBudget, CHUNK);
      created.push(makeBlock(task, iso, cursor, cursor + dur));
      cursor += dur;
      dayBudget -= dur;
      remaining -= dur;
    }
  }

  if (created.length > 0) {
    useDayflow.setState((s) => ({ blocks: [...s.blocks, ...created] }));
  }

  const totalNewMin = created.reduce(
    (acc, b) => acc + (b.endMinutes - b.startMinutes),
    0,
  );

  return {
    scheduled: totalNewMin,
    blocksCreated: created.length,
    warning:
      remaining > 0
        ? `Couldn't fit ${Math.round(remaining / 60 * 10) / 10}h — not enough free time`
        : undefined,
  };
}

function makeBlock(
  task: Task,
  date: string,
  start: number,
  end: number,
): TimeBlock {
  return {
    id: uid(),
    title: task.title,
    category: task.category ?? "project",
    date,
    startMinutes: start,
    endMinutes: end,
    note: task.note,
    completed: false,
    taskId: task.id,
  };
}

/** Remove all scheduled blocks for a task (used when clearing a schedule). */
export function clearTaskSchedule(taskId: string) {
  useDayflow.setState((s) => ({
    blocks: s.blocks.filter((b) => b.taskId !== taskId),
  }));
}

/** Compute progress for a task with deadline+estimate. */
export function getTaskProgress(task: Task, blocks: TimeBlock[]) {
  const linked = blocks.filter((b) => b.taskId === task.id);
  const scheduled = linked.reduce(
    (acc, b) => acc + (b.endMinutes - b.startMinutes),
    0,
  );
  const done = linked
    .filter((b) => b.completed)
    .reduce((acc, b) => acc + (b.endMinutes - b.startMinutes), 0);
  const estimate = task.estimateMinutes ?? 0;
  return {
    scheduled,
    done,
    estimate,
    schedulePct: estimate === 0 ? 0 : Math.min(100, (scheduled / estimate) * 100),
    donePct: estimate === 0 ? 0 : Math.min(100, (done / estimate) * 100),
  };
}
