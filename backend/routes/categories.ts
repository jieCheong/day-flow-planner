import { Hono } from "hono";
import { sql } from "../db.js";

export const categoriesRoutes = new Hono();

categoriesRoutes.get("/", async (c) => {
  const rows = await sql`SELECT * FROM categories WHERE user_id = ${c.get("userId")}`;
  return c.json(rows.map(toClient));
});

categoriesRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const b = await c.req.json();

  const [row] = await sql`
    INSERT INTO categories (id, user_id, name, color, budget_minutes, recurring, default_start, default_duration)
    VALUES (${b.id}, ${userId}, ${b.name}, ${b.color}, ${b.budgetMinutes ?? 0},
            ${b.recurring ? sql.json(b.recurring) : null}, ${b.defaultStart ?? null}, ${b.defaultDuration ?? null})
    RETURNING *
  `;
  return c.json(toClient(row), 201);
});

categoriesRoutes.put("/:id", async (c) => {
  const b = await c.req.json();
  const [row] = await sql`
    UPDATE categories SET
      name = ${b.name}, color = ${b.color}, budget_minutes = ${b.budgetMinutes ?? 0},
      recurring = ${b.recurring ? sql.json(b.recurring) : null},
      default_start = ${b.defaultStart ?? null}, default_duration = ${b.defaultDuration ?? null}
    WHERE id = ${c.req.param("id")} AND user_id = ${c.get("userId")}
    RETURNING *
  `;
  if (!row) return c.json({ error: "Category not found" }, 404);
  return c.json(toClient(row));
});

categoriesRoutes.delete("/:id", async (c) => {
  await sql`DELETE FROM categories WHERE id = ${c.req.param("id")} AND user_id = ${c.get("userId")}`;
  return c.json({ deleted: true });
});

function toClient(r: Record<string, unknown>) {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    budgetMinutes: r.budget_minutes,
    recurring: r.recurring,
    defaultStart: r.default_start,
    defaultDuration: r.default_duration,
  };
}
