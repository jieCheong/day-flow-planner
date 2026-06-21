import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requireAuth } from "./middleware/auth.js";
import { authRoutes } from "./routes/auth.js";
import { profileRoutes } from "./routes/profile.js";
import { blocksRoutes } from "./routes/blocks.js";
import { tasksRoutes } from "./routes/tasks.js";
import { goalsRoutes } from "./routes/goals.js";
import { categoriesRoutes } from "./routes/categories.js";
import { reflectionsRoutes } from "./routes/reflections.js";
import { sql } from "./db.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = [
        "http://localhost:3000",
        "http://localhost:5173",
        process.env.FRONTEND_URL,
      ].filter(Boolean) as string[];
      return allowed.includes(origin) ? origin : allowed[0];
    },
    credentials: true,
  })
);

app.get("/health", (c) => c.json({ status: "ok", ts: Date.now() }));

app.route("/auth", authRoutes);

const api = new Hono();
api.use("*", requireAuth);

// Returns all user data in one request — called once after login
api.get("/sync", async (c) => {
  const userId = c.get("userId");

  const [prefs, categories, blocks, tasks, goals, reflections] = await Promise.all([
    sql`SELECT * FROM user_prefs WHERE user_id = ${userId}`,
    sql`SELECT * FROM categories WHERE user_id = ${userId}`,
    sql`SELECT * FROM time_blocks WHERE user_id = ${userId} ORDER BY start_minutes`,
    sql`SELECT * FROM tasks WHERE user_id = ${userId} ORDER BY created_at_ms DESC`,
    sql`SELECT * FROM goals WHERE user_id = ${userId} ORDER BY created_at_ms DESC`,
    sql`SELECT date, text FROM reflections WHERE user_id = ${userId} ORDER BY date DESC`,
  ]);

  const p = prefs[0];
  return c.json({
    prefs: p ? {
      wakeTime: p.wake_time, sleepTime: p.sleep_time,
      breakfast: p.breakfast, lunch: p.lunch, dinner: p.dinner,
      gymTime: p.gym_time, gymDays: p.gym_days,
      focusStart: p.focus_start, focusEnd: p.focus_end,
    } : null,
    categories: categories.map((r) => ({
      id: r.id, name: r.name, color: r.color,
      budgetMinutes: r.budget_minutes, recurring: r.recurring,
      defaultStart: r.default_start, defaultDuration: r.default_duration,
    })),
    blocks: blocks.map((r) => ({
      id: r.id, title: r.title, category: r.category, date: r.date,
      startMinutes: r.start_minutes, endMinutes: r.end_minutes,
      note: r.note, completed: r.completed, recurring: r.recurring,
      templateId: r.template_id, taskId: r.task_id,
      fixed: r.fixed, autoplanned: r.autoplanned,
    })),
    tasks: tasks.map((r) => ({
      id: r.id, title: r.title, note: r.note, priority: r.priority,
      category: r.category, completed: r.completed, createdAt: r.created_at_ms,
      deadline: r.deadline, estimateMinutes: r.estimate_minutes,
    })),
    goals: goals.map((r) => ({
      id: r.id, title: r.title, target: r.target,
      startDate: r.start_date, deadline: r.deadline,
      habits: r.habits, checkins: r.checkins, createdAt: r.created_at_ms,
    })),
    reflections,
  });
});

api.route("/profile", profileRoutes);
api.route("/blocks", blocksRoutes);
api.route("/tasks", tasksRoutes);
api.route("/goals", goalsRoutes);
api.route("/categories", categoriesRoutes);
api.route("/reflections", reflectionsRoutes);

app.route("/api", api);

const port = parseInt(process.env.PORT ?? "8787");
console.log(`Day Flow backend running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
