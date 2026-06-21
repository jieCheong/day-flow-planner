// CategoryId is a free-form string so users can add custom categories.
export type CategoryId = string;

export type Priority = "high" | "medium" | "low";

export type RecurringType = "none" | "daily" | "weekdays" | "weekends" | "custom";

export interface RecurringRule {
  type: RecurringType;
  days?: number[]; // 0=Sun ... 6=Sat
}

export interface Category {
  id: CategoryId;
  name: string;
  color: string;
  budgetMinutes: number;
  recurring?: RecurringRule;
  defaultStart?: number;
  defaultDuration?: number;
}

export interface TimeBlock {
  id: string;
  title: string;
  category: CategoryId;
  date: string;
  startMinutes: number;
  endMinutes: number;
  note?: string;
  completed: boolean;
  recurring?: RecurringRule;
  templateId?: string;
  taskId?: string;
  fixed?: boolean; // true = user-anchored, auto-plan won't touch
  autoplanned?: boolean; // true = generated, auto-plan may replace
}

export interface Task {
  id: string;
  title: string;
  note?: string;
  priority: Priority;
  category?: CategoryId;
  completed: boolean;
  createdAt: number;
  deadline?: string;
  estimateMinutes?: number;
}

export interface Reflection {
  date: string;
  text: string;
}

export interface UserPrefs {
  wakeTime: number; // minutes
  sleepTime: number;
  breakfast: number;
  lunch: number;
  dinner: number;
  gymTime?: number;
  gymDays: number[]; // 0..6
  focusStart: number;
  focusEnd: number;
}

export const DEFAULT_PREFS: UserPrefs = {
  wakeTime: 7 * 60,
  sleepTime: 23 * 60,
  breakfast: 8 * 60,
  lunch: 12 * 60 + 30,
  dinner: 19 * 60,
  gymTime: 17 * 60,
  gymDays: [1, 2, 3, 4, 5],
  focusStart: 9 * 60,
  focusEnd: 18 * 60,
};

export interface GoalHabit {
  id: string;
  title: string;
  category?: CategoryId;
  minutesPerOccurrence: number;
  perWeek: number;
}

export interface GoalCheckin {
  weekISO: string; // ISO Monday date
  rating: number; // 1..5
  note?: string;
  createdAt: number;
}

export interface Goal {
  id: string;
  title: string;
  target?: string;
  startDate: string;
  deadline: string;
  habits: GoalHabit[];
  checkins: GoalCheckin[];
  createdAt: number;
}
