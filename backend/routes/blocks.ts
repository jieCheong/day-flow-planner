import { Hono } from "hono";
import { sql } from "../db.js";

export const blocksRoutes = new Hono();

blocksRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const { date, from, to } = c.req.query();

  const rows = date
    ? await sql`SELECT * FROM time_blocks WHERE user_id = ${userId} AND date = ${date} ORDER BY start_minutes`
    : from && to
      ? await sql`SELECT * FROM time_blocks WHERE user_id = ${userId} AND date >= ${from} AND date <= ${to} ORDER BY start_minutes`
      : await sql`SELECT * FROM time_blocks WHERE user_id = ${userId} ORDER BY start_minutes`;

  return c.json(rows.map(toClient));
});

blocksRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const b = await c.req.json();
  const id = b.id ?? crypto.randomUUID();

  const [row] = await sql`
    INSERT INTO time_blocks
      (id, user_id, title, category, date, start_minutes, end_minutes, note, completed, recurring, template_id, task_id, fixed, autoplanned)
    VALUES
      (${id}, ${userId}, ${b.title}, ${b.category}, ${b.date}, ${b.startMinutes}, ${b.endMinutes},
       ${b.note ?? null}, ${b.completed ?? false}, ${b.recurring ? sql.json(b.recurring) : null},
       ${b.templateId ?? null}, ${b.taskId ?? null}, ${b.fixed ?? false}, ${b.autoplanned ?? false})
    RETURNING *
  `;
  return c.json(toClient(row), 201);
});

blocksRoutes.put("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const b = await c.req.json();

  const [row] = await sql`
    UPDATE time_blocks SET
      title = ${b.title}, category = ${b.category}, date = ${b.date},
      start_minutes = ${b.startMinutes}, end_minutes = ${b.endMinutes},
      note = ${b.note ?? null}, completed = ${b.completed ?? false},
      recurring = ${b.recurring ? sql.json(b.recurring) : null},
      template_id = ${b.templateId ?? null}, task_id = ${b.taskId ?? null},
      fixed = ${b.fixed ?? false}, autoplanned = ${b.autoplanned ?? false},
      updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  if (!row) return c.json({ error: "Block not found" }, 404);
  return c.json(toClient(row));
});

blocksRoutes.delete("/:id", async (c) => {
  await sql`DELETE FROM time_blocks WHERE id = ${c.req.param("id")} AND user_id = ${c.get("userId")}`;
  return c.json({ deleted: true });
});

function toClient(r: Record<string, unknown>) {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    date: r.date,
    startMinutes: r.start_minutes,
    endMinutes: r.end_minutes,
    note: r.note,
    completed: r.completed,
    recurring: r.recurring,
    templateId: r.template_id,
    taskId: r.task_id,
    fixed: r.fixed,
    autoplanned: r.autoplanned,
  };
}
