import { Hono } from "hono";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { sql } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const authRoutes = new Hono();

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

// POST /auth/signup
authRoutes.post("/signup", async (c) => {
  const { email, password, username } = await c.req.json<{ email: string; password: string; username?: string }>();

  if (!email || !password) return c.json({ error: "Email and password are required" }, 400);
  if (password.length < 6) return c.json({ error: "Password must be at least 6 characters" }, 400);

  const [existing] = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
  if (existing) return c.json({ error: "Email already in use" }, 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const trimmedUsername = username?.trim() || null;
  const [user] = await sql`
    INSERT INTO users (email, password_hash, username)
    VALUES (${email.toLowerCase()}, ${passwordHash}, ${trimmedUsername})
    RETURNING id
  `;

  await sql`INSERT INTO user_prefs (user_id) VALUES (${user.id}) ON CONFLICT DO NOTHING`;

  return c.json({ message: "Account created. You can now sign in." }, 201);
});

// POST /auth/signin
authRoutes.post("/signin", async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();

  if (!email || !password) return c.json({ error: "Email and password are required" }, 400);

  const [user] = await sql`SELECT id, email, password_hash, username FROM users WHERE email = ${email.toLowerCase()}`;
  if (!user) return c.json({ error: "Invalid credentials" }, 401);

  const valid = await bcrypt.compare(password, user.password_hash as string);
  if (!valid) return c.json({ error: "Invalid credentials" }, 401);

  const token = await new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id as string)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  return c.json({ token, user: { id: user.id, email: user.email, username: user.username ?? null } });
});

// GET /auth/me
authRoutes.get("/me", requireAuth, async (c) => {
  const [user] = await sql`SELECT username FROM users WHERE id = ${c.get("userId")}`;
  return c.json({ id: c.get("userId"), email: c.get("userEmail"), username: user?.username ?? null });
});
