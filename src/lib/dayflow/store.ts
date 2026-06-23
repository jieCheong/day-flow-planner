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
import { api } from "../api";
import { getUser } from "../auth";

// Fire-and-forget API call — only when the user is authenticated
function push(fn: () => Promise<unknown>) {
  if (typeof window !== "undefined" && getUser()) {
    fn().catch(console.error);
  }
}

type SyncData = {
  prefs: UserPrefs | null;
  categories: Category[];
  blocks: TimeBlock[];
  tasks: Task[];
  goals: Goal[];
  reflections: Array<{ date: string; text: string }>;
};

interface DayflowState {
  categories: Category[];
  blocks: TimeBlock[];
  tasks: Task[];
  reflections: Record<string, Reflection>;
  theme: "light" | "dark";
  prefs: UserPrefs;
  onboardedAt?: number;
  goals: Goal[];

  hydrateFromApi: (data: SyncData) => void;

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
  generateDay: (dateISO: string) => number;

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

      hydrateFromApi: (data) => {
        set((s) => ({
          prefs: data.prefs ?? s.prefs,
          // Keep local default categories if the account has none yet
          categories: data.categories.length > 0 ? data.categories : s.categories,
          blocks: data.blocks,
          tasks: data.tasks,
          goals: data.goals,
          reflections: Object.fromEntries(
            data.reflections.map((r) => [r.date, { date: r.date, text: r.text }])
          ),
        }));
      },

      // ── Blocks ────────────────────────────────────────────────────────────

      addBlock: (b) => {
        const id = uid();
        const block: TimeBlock = { ...b, id, completed: false };
        set((s) => ({ blocks: [...s.blocks, block] }));
        push(() => api.post("/api/blocks", block));
        return id;
      },
      updateBlock: (id, patch) => {
        const updated = { ...get().blocks.find((b) => b.id === id)!, ...patch };
        set((s) => ({ blocks: s.blocks.map((b) => (b.id === id ? updated : b)) }));
        push(() => api.put(`/api/blocks/${id}`, updated));
      },
      deleteBlock: (id) => {
        set((s) => ({ blocks: s.blocks.filter((b) => b.id !== id) }));
        push(() => api.delete(`/api/blocks/${id}`));
      },
      toggleBlock: (id) => {
        const block = get().blocks.find((b) => b.id === id);
        if (!block) return;
        const updated = { ...block, completed: !block.completed };
        set((s) => ({ blocks: s.blocks.map((b) => (b.id === id ? updated : b)) }));
        push(() => api.put(`/api/blocks/${id}`, updated));
      },

      // ── Tasks ─────────────────────────────────────────────────────────────

      addTask: (t) => {
        const id = uid();
        const task: Task = { ...t, id, completed: false, createdAt: Date.now() };
        set((s) => ({ tasks: [...s.tasks, task] }));
        push(() => api.post("/api/tasks", task));
        return id;
      },
      updateTask: (id, patch) => {
        const updated = { ...get().tasks.find((t) => t.id === id)!, ...patch };
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
        push(() => api.put(`/api/tasks/${id}`, updated));
      },
      deleteTask: (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
        push(() => api.delete(`/api/tasks/${id}`));
      },
      toggleTask: (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;
        const updated = { ...task, completed: !task.completed };
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
        push(() => api.put(`/api/tasks/${id}`, updated));
      },

      // ── Categories ────────────────────────────────────────────────────────

      updateCategoryBudget: (id, minutes) => {
        const updated = { ...get().categories.find((c) => c.id === id)!, budgetMinutes: minutes };
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? updated : c)) }));
        push(() => api.put(`/api/categories/${id}`, updated));
      },
      updateCategory: (id, patch) => {
        const updated = { ...get().categories.find((c) => c.id === id)!, ...patch, id };
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? updated : c)) }));
        push(() => api.put(`/api/categories/${id}`, updated));
      },
      addCategory: (c) => {
        const id = `cat-${uid()}`;
        const category: Category = { ...c, id };
        set((s) => ({ categories: [...s.categories, category] }));
        push(() => api.post("/api/categories", category));
        return id;
      },
      deleteCategory: (id) => {
        const { blocks, tasks } = get();
        const removedBlocks = blocks.filter((b) => b.category === id);
        const affectedTasks = tasks
          .filter((t) => t.category === id)
          .map((t) => ({ ...t, category: undefined }));

        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          blocks: s.blocks.filter((b) => b.category !== id),
          tasks: s.tasks.map((t) =>
            t.category === id ? { ...t, category: undefined } : t
          ),
        }));

        push(() => api.delete(`/api/categories/${id}`));
        removedBlocks.forEach((b) => push(() => api.delete(`/api/blocks/${b.id}`)));
        affectedTasks.forEach((t) => push(() => api.put(`/api/tasks/${t.id}`, t)));
      },

      // ── Reflections ───────────────────────────────────────────────────────

      setReflection: (date, text) => {
        set((s) => ({ reflections: { ...s.reflections, [date]: { date, text } } }));
        push(() => api.put(`/api/reflections/${date}`, { text }));
      },

      // ── Theme / Prefs / Onboarding ────────────────────────────────────────

      toggleTheme: () =>
        set((s) => {
          const next = s.theme === "light" ? "dark" : "light";
          if (typeof document !== "undefined") {
            document.documentElement.classList.toggle("dark", next === "dark");
          }
          return { theme: next };
        }),

      setPrefs: (p) => {
        const updated = { ...get().prefs, ...p };
        set({ prefs: updated });
        push(() => api.put("/api/profile", updated));
      },
      markOnboarded: () => set({ onboardedAt: Date.now() }),

      // ── Auto-plan ─────────────────────────────────────────────────────────

      generateDay: (dateISO) => {
        const { blocks, categories, prefs } = get();
        const keep = blocks.filter(
          (b) =>
            b.date !== dateISO ||
            b.completed ||
            b.fixed === true ||
            (!b.autoplanned && b.fixed !== false)
        );
        const fixedForDay = keep.filter((b) => b.date === dateISO);
        const generated = buildDay({ dateISO, prefs, categories, fixed: fixedForDay });
        const newGenerated = generated.filter((g) => !fixedForDay.includes(g));
        set({ blocks: [...keep, ...newGenerated] });
        newGenerated.forEach((b) => push(() => api.post("/api/blocks", b)));
        return newGenerated.length;
      },

      // ── Goals ─────────────────────────────────────────────────────────────

      addGoal: (g) => {
        const id = uid();
        const goal: Goal = { ...g, id, checkins: [], createdAt: Date.now() };
        set((s) => ({ goals: [...s.goals, goal] }));
        push(() => api.post("/api/goals", goal));
        return id;
      },
      updateGoal: (id, patch) => {
        const updated = { ...get().goals.find((g) => g.id === id)!, ...patch };
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? updated : g)) }));
        push(() => api.put(`/api/goals/${id}`, updated));
      },
      deleteGoal: (id) => {
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
        push(() => api.delete(`/api/goals/${id}`));
      },
      addCheckin: (goalId, c) => {
        const checkin: GoalCheckin = { ...c, createdAt: Date.now() };
        const updated = get().goals.map((g) =>
          g.id === goalId
            ? { ...g, checkins: [...g.checkins, checkin] }
            : g
        );
        set({ goals: updated });
        const goal = updated.find((g) => g.id === goalId);
        if (goal) push(() => api.put(`/api/goals/${goalId}`, goal));
      },
    }),
    {
      name: "dayflow:v1",
      version: 4,
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
        if (persisted && version < 4 && Array.isArray(persisted.categories)) {
          persisted.categories = persisted.categories.map((c: any) => {
            if (c.id === "gym") {
              const { recurring, defaultStart, defaultDuration, ...rest } = c;
              return rest;
            }
            return c;
          });
        }
        return persisted;
      },
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as never)
      ),
      onRehydrateStorage: () => (state) => {
        if (state?.theme === "dark" && typeof document !== "undefined") {
          document.documentElement.classList.add("dark");
        }
      },
    }
  )
);
