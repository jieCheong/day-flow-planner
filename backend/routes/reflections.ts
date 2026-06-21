import { Hono } from "hono";
import { sql } from "../db.js";

export const reflectionsRoutes = new Hono();

reflectionsRoutes.get("/", async (c) => {
  const rows = await sql`
    SELECT date, text FROM reflections WHERE user_id = ${c.get("userId")} ORDER BY date DESC
  `;
  return c.json(rows);
});

reflectionsRoutes.get("/:date", async (c) => {
  const [row] = await sql`
    SELECT date, text FROM reflections
    WHERE user_id = ${c.get("userId")} AND date = ${c.req.param("date")}
  `;
  return c.json(row ?? null);
});

reflectionsRoutes.put("/:date", async (c) => {
  const userId = c.get("userId");
  const date = c.req.param("date");
  const { text } = await c.req.json<{ text: string }>();

  const [row] = await sql`
    INSERT INTO reflections (user_id, date, text)
    VALUES (${userId}, ${date}, ${text})
    ON CONFLICT (user_id, date) DO UPDATE SET text = EXCLUDED.text, updated_at = NOW()
    RETURNING date, text
  `;
  return c.json(row);
});

reflectionsRoutes.delete("/:date", async (c) => {
  await sql`
    DELETE FROM reflections WHERE user_id = ${c.get("userId")} AND date = ${c.req.param("date")}
  `;
  return c.json({ deleted: true });
});
