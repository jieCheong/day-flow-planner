import { Hono } from "hono";
import { sql } from "../db.js";

export const profileRoutes = new Hono();

profileRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const [row] = await sql`SELECT * FROM user_prefs WHERE user_id = ${userId}`;
  if (!row) return c.json({ error: "Profile not found" }, 404);
  return c.json(toClient(row));
});

profileRoutes.put("/", async (c) => {
  const userId = c.get("userId");
  const b = await c.req.json();
  const [row] = await sql`
    INSERT INTO user_prefs (user_id, wake_time, sleep_time, breakfast, lunch, dinner, gym_time, gym_days, focus_start, focus_end)
    VALUES (${userId}, ${b.wakeTime}, ${b.sleepTime}, ${b.breakfast}, ${b.lunch}, ${b.dinner}, ${b.gymTime ?? null}, ${b.gymDays}, ${b.focusStart}, ${b.focusEnd})
    ON CONFLICT (user_id) DO UPDATE SET
      wake_time   = EXCLUDED.wake_time,
      sleep_time  = EXCLUDED.sleep_time,
      breakfast   = EXCLUDED.breakfast,
      lunch       = EXCLUDED.lunch,
      dinner      = EXCLUDED.dinner,
      gym_time    = EXCLUDED.gym_time,
      gym_days    = EXCLUDED.gym_days,
      focus_start = EXCLUDED.focus_start,
      focus_end   = EXCLUDED.focus_end,
      updated_at  = NOW()
    RETURNING *
  `;
  return c.json(toClient(row));
});

function toClient(r: Record<string, unknown>) {
  return {
    wakeTime: r.wake_time,
    sleepTime: r.sleep_time,
    breakfast: r.breakfast,
    lunch: r.lunch,
    dinner: r.dinner,
    gymTime: r.gym_time,
    gymDays: r.gym_days,
    focusStart: r.focus_start,
    focusEnd: r.focus_end,
  };
}
