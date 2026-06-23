import type { Category, CategoryId } from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "work",
    name: "Work",
    color: "cat-work",
    budgetMinutes: 300,
  },
  {
    id: "study",
    name: "Study",
    color: "cat-study",
    budgetMinutes: 120,
  },
  {
    id: "gym",
    name: "Gym",
    color: "cat-gym",
    budgetMinutes: 60,
  },
  {
    id: "personal",
    name: "Personal",
    color: "cat-personal",
    budgetMinutes: 180,
  },
];

export const CATEGORY_MAP = (cats: Category[]) =>
  Object.fromEntries(cats.map((c) => [c.id, c])) as Record<CategoryId, Category>;
