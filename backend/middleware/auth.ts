import { createMiddleware } from "hono/factory";
import { jwtVerify } from "jose";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    userEmail: string;
  }
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, secret);
    c.set("userId", payload.sub as string);
    c.set("userEmail", payload.email as string);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});
