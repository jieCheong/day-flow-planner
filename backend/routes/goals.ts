import { Hono } from "hono";
import { sql } from "../db.js";

export const goalsRoutes = new Hono();

goalsRoutes.get("/", async (c) => {
  const rows = await sql`
    SELECT * FROM goals WHERE user_id = ${c.get("userId")} ORDER BY created_at_ms DESC
  `;
  return c.json(rows.map(toClient));
});

goalsRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const b = await c.req.json();
  const id = b.id ?? crypto.randomUUID();

  const [row] = await sql`
    INSERT INTO goals (id, user_id, title, target, start_date, deadline, habits, checkins, created_at_ms)
    VALUES (${id}, ${userId}, ${b.title}, ${b.target ?? null}, ${b.startDate}, ${b.deadline},
            ${sql.json(b.habits ?? [])}, ${sql.json(b.checkins ?? [])}, ${b.createdAt})
    RETURNING *
  `;
  return c.json(toClient(row), 201);
});

goalsRoutes.put("/:id", async (c) => {
  const b = await c.req.json();
  const [row] = await sql`
    UPDATE goals SET
      title = ${b.title}, target = ${b.target ?? null},
      start_date = ${b.startDate}, deadline = ${b.deadline},
      habits = ${sql.json(b.habits ?? [])}, checkins = ${sql.json(b.checkins ?? [])},
      updated_at = NOW()
    WHERE id = ${c.req.param("id")} AND user_id = ${c.get("userId")}
    RETURNING *
  `;
  if (!row) return c.json({ error: "Goal not found" }, 404);
  return c.json(toClient(row));
});

goalsRoutes.delete("/:id", async (c) => {
  await sql`DELETE FROM goals WHERE id = ${c.req.param("id")} AND user_id = ${c.get("userId")}`;
  return c.json({ deleted: true });
});

function toClient(r: Record<string, unknown>) {
  return {
    id: r.id,
    title: r.title,
    target: r.target,
    startDate: r.start_date,
    deadline: r.deadline,
    habits: r.habits,
    checkins: r.checkins,
    createdAt: r.created_at_ms,
  };
}
