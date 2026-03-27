import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG, COOKIE_NAME } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { jwtVerify } from "jose";
import { ENV } from "./env";
import { parse as parseCookieHeader } from "cookie";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// Dashboard-specific auth: verifies the custom JWT session cookie (username/password login)
export const dashboardProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const cookieHeader = ctx.req.headers.cookie ?? "";
    const cookies = parseCookieHeader(cookieHeader);
    const token = cookies["dashboard_session"];
    if (!token) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    try {
      const secret = new TextEncoder().encode(ENV.cookieSecret || "dashboard_secret_fallback");
      await jwtVerify(token, secret, { algorithms: ["HS256"] });
    } catch {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    return next({ ctx });
  }),
);
