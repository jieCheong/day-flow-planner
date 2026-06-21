import { Hono } from "hono";
import { sql } from "../db.js";

export const tasksRoutes = new Hono();

tasksRoutes.get("/", async (c) => {
  const rows = await sql`
    SELECT * FROM tasks WHERE user_id = ${c.get("userId")} ORDER BY created_at_ms DESC
  `;
  return c.json(rows.map(toClient));
});

tasksRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const b = await c.req.json();
  const id = b.id ?? crypto.randomUUID();

  const [row] = await sql`
    INSERT INTO tasks (id, user_id, title, note, priority, category, completed, created_at_ms, deadline, estimate_minutes)
    VALUES (${id}, ${userId}, ${b.title}, ${b.note ?? null}, ${b.priority ?? "medium"},
            ${b.category ?? null}, ${b.completed ?? false}, ${b.createdAt},
            ${b.deadline ?? null}, ${b.estimateMinutes ?? null})
    RETURNING *
  `;
  return c.json(toClient(row), 201);
});

tasksRoutes.put("/:id", async (c) => {
  const b = await c.req.json();
  const [row] = await sql`
    UPDATE tasks SET
      title = ${b.title}, note = ${b.note ?? null}, priority = ${b.priority ?? "medium"},
      category = ${b.category ?? null}, completed = ${b.completed ?? false},
      deadline = ${b.deadline ?? null}, estimate_minutes = ${b.estimateMinutes ?? null},
      updated_at = NOW()
    WHERE id = ${c.req.param("id")} AND user_id = ${c.get("userId")}
    RETURNING *
  `;
  if (!row) return c.json({ error: "Task not found" }, 404);
  return c.json(toClient(row));
});

tasksRoutes.delete("/:id", async (c) => {
  await sql`DELETE FROM tasks WHERE id = ${c.req.param("id")} AND user_id = ${c.get("userId")}`;
  return c.json({ deleted: true });
});

function toClient(r: Record<string, unknown>) {
  return {
    id: r.id,
    title: r.title,
    note: r.note,
    priority: r.priority,
    category: r.category,
    completed: r.completed,
    createdAt: r.created_at_ms,
    deadline: r.deadline,
    estimateMinutes: r.estimate_minutes,
  };
}
