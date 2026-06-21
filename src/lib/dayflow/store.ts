import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Category,
  CategoryId,
  Goal,
  GoalCheckin,
  Reflection,
  Task,
  TimeBlock,
  UserPrefs,
} from "./types";
import { DEFAULT_PREFS } from "./types";
import { DEFAULT_CATEGORIES } from "./categories";
import { uid } from "./utils";
import { buildDay } from "./autoDay";

interface DayflowState {
  categories: Category[];
  blocks: TimeBlock[];
  tasks: Task[];
  reflections: Record<string, Reflection>;
  theme: "light" | "dark";
  prefs: UserPrefs;
  onboardedAt?: number;
  goals: Goal[];

  addBlock: (b: Omit<TimeBlock, "id" | "completed">) => string;
  updateBlock: (id: string, patch: Partial<TimeBlock>) => void;
  deleteBlock: (id: string) => void;
  toggleBlock: (id: string) => void;

  addTask: (t: Omit<Task, "id" | "completed" | "createdAt">) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;

  updateCategoryBudget: (id: CategoryId, minutes: number) => void;
  updateCategory: (id: CategoryId, patch: Partial<Category>) => void;
  addCategory: (c: Omit<Category, "id">) => string;
  deleteCategory: (id: CategoryId) => void;

  setReflection: (date: string, text: string) => void;
  toggleTheme: () => void;

  setPrefs: (p: Partial<UserPrefs>) => void;
  markOnboarded: () => void;
  generateDay: (dateISO: string) => number; // returns blocks created

  addGoal: (g: Omit<Goal, "id" | "createdAt" | "checkins">) => string;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addCheckin: (goalId: string, c: Omit<GoalCheckin, "createdAt">) => void;
}

export const useDayflow = create<DayflowState>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,
      blocks: [],
      tasks: [],
      reflections: {},
      theme: "light",
      prefs: DEFAULT_PREFS,
      onboardedAt: undefined,
      goals: [],

      addBlock: (b) => {
        const id = uid();
        set((s) => ({ blocks: [...s.blocks, { ...b, id, completed: false }] }));
        return id;
      },
      updateBlock: (id, patch) =>
        set((s) => ({
          blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      deleteBlock: (id) =>
        set((s) => ({ blocks: s.blocks.filter((b) => b.id !== id) })),
      toggleBlock: (id) =>
        set((s) => ({
          blocks: s.blocks.map((b) =>
            b.id === id ? { ...b, completed: !b.completed } : b,
          ),
        })),

      addTask: (t) => {
        const id = uid();
        set((s) => ({
          tasks: [...s.tasks, { ...t, id, completed: false, createdAt: Date.now() }],
        }));
        return id;
      },
      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t,
          ),
        })),

      updateCategoryBudget: (id, minutes) =>
        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === id ? { ...c, budgetMinutes: minutes } : c,
          ),
        })),
      updateCategory: (id, patch) =>
        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === id ? { ...c, ...patch, id: c.id } : c,
          ),
        })),
      addCategory: (c) => {
        const id = `cat-${uid()}`;
        set((s) => ({ categories: [...s.categories, { ...c, id }] }));
        return id;
      },
      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          blocks: s.blocks.filter((b) => b.category !== id),
          tasks: s.tasks.map((t) =>
            t.category === id ? { ...t, category: undefined } : t,
          ),
        })),

      setReflection: (date, text) =>
        set((s) => ({
          reflections: { ...s.reflections, [date]: { date, text } },
        })),

      toggleTheme: () =>
        set((s) => {
          const next = s.theme === "light" ? "dark" : "light";
          if (typeof document !== "undefined") {
            document.documentElement.classList.toggle("dark", next === "dark");
          }
          return { theme: next };
        }),

      setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
      markOnboarded: () => set({ onboardedAt: Date.now() }),

      generateDay: (dateISO) => {
        const { blocks, categories, prefs } = get();
        // Keep: completed, fixed, or non-autoplanned user blocks for that day
        const keep = blocks.filter(
          (b) =>
            b.date !== dateISO ||
            b.completed ||
            b.fixed === true ||
            (!b.autoplanned && b.fixed !== false),
        );
        const fixedForDay = keep.filter((b) => b.date === dateISO);
        const generated = buildDay({ dateISO, prefs, categories, fixed: fixedForDay });
        const newGenerated = generated.filter((g) => !fixedForDay.includes(g));
        set({ blocks: [...keep, ...newGenerated] });
        return newGenerated.length;
      },

      addGoal: (g) => {
        const id = uid();
        set((s) => ({
          goals: [...s.goals, { ...g, id, checkins: [], createdAt: Date.now() }],
        }));
        return id;
      },
      updateGoal: (id, patch) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      deleteGoal: (id) =>
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      addCheckin: (goalId, c) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? { ...g, checkins: [...g.checkins, { ...c, createdAt: Date.now() }] }
              : g,
          ),
        })),
    }),
    {
      name: "dayflow:v1",
      version: 3,
      migrate: (persisted: any, version) => {
        if (persisted && version < 2 && Array.isArray(persisted.categories)) {
          persisted.categories = persisted.categories.map((c: any) => {
            if (c.id === "sleep" || c.id === "run" || c.id === "walk") {
              const { recurring, defaultStart, defaultDuration, ...rest } = c;
              return rest;
            }
            return c;
          });
        }
        if (persisted && version < 3) {
          persisted.prefs ??= DEFAULT_PREFS;
          persisted.goals ??= [];
        }
        return persisted;
      },
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as never),
      ),
      onRehydrateStorage: () => (state) => {
        if (state?.theme === "dark" && typeof document !== "undefined") {
          document.documentElement.classList.add("dark");
        }
      },
    },
  ),
);
