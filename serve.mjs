import { serve } from "srvx";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const clientDir = join(__dirname, "dist/client");

// MIME types for static assets
const mime = {
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".json": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// Import the TanStack Start SSR handler
const { default: ssrHandler } = await import("./dist/server/server.js");

const PORT = parseInt(process.env.PORT || "3000");

serve({
  port: PORT,
  fetch: async (req) => {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Serve static files from dist/client/
    if (pathname !== "/" && !pathname.startsWith("/api")) {
      const ext = extname(pathname);
      if (ext) {
        try {
          const filePath = join(clientDir, pathname);
          const content = await readFile(filePath);
          return new Response(content, {
            headers: { "Content-Type": mime[ext] ?? "application/octet-stream" },
          });
        } catch {
          // Fall through to SSR
        }
      }
    }

    // Everything else goes to the TanStack Start SSR handler
    return ssrHandler.fetch(req, {}, {});
  },
});

console.log(`Frontend running on http://localhost:${PORT}`);
