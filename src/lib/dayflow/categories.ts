import type { Category, CategoryId } from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "leetcode",
    name: "LeetCode",
    color: "cat-leetcode",
    budgetMinutes: 180,
  },
  {
    id: "study",
    name: "Study",
    color: "cat-study",
    budgetMinutes: 120,
  },
  {
    id: "project",
    name: "Project",
    color: "cat-project",
    budgetMinutes: 300,
  },
  {
    id: "gym",
    name: "Gym",
    color: "cat-gym",
    budgetMinutes: 90,
    recurring: { type: "weekdays" },
    defaultStart: 17 * 60,
    defaultDuration: 90,
  },
  {
    id: "run",
    name: "Morning Run",
    color: "cat-run",
    budgetMinutes: 30,
  },
  {
    id: "walk",
    name: "Rest-day Walk",
    color: "cat-walk",
    budgetMinutes: 60,
  },
  {
    id: "sleep",
    name: "Sleep",
    color: "cat-sleep",
    budgetMinutes: 480,
  },
  {
    id: "personal",
    name: "Personal",
    color: "cat-personal",
    budgetMinutes: 0,
  },
];

export const CATEGORY_MAP = (cats: Category[]) =>
  Object.fromEntries(cats.map((c) => [c.id, c])) as Record<CategoryId, Category>;
