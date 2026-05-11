// New auth middleware (better-auth based) for createServerFn handlers.
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth.server";
import { db } from "@/db/index.server";
import { userRoles } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  if (!request?.headers) throw new Response("Unauthorized", { status: 401 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw new Response("Unauthorized", { status: 401 });
  return next({
    context: {
      userId: session.user.id,
      userEmail: session.user.email,
      session: session.session,
    },
  });
});

export const requireAdmin = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  if (!request?.headers) throw new Response("Unauthorized", { status: 401 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw new Response("Unauthorized", { status: 401 });
  const rows = await db.select().from(userRoles).where(
    and(eq(userRoles.userId, session.user.id), eq(userRoles.role, "admin"))
  ).limit(1);
  if (rows.length === 0) throw new Response("Forbidden", { status: 403 });
  return next({
    context: {
      userId: session.user.id,
      userEmail: session.user.email,
      session: session.session,
    },
  });
});
