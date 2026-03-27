/**
 * Shared test helpers for creating authenticated tRPC contexts.
 * These helpers generate a valid dashboard_session JWT for use in tests.
 */
import { SignJWT } from "jose";
import type { TrpcContext } from "./_core/context";

/** Generate a valid dashboard_session JWT token for testing */
export async function makeTestSessionCookie(): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dashboard_secret_fallback");
  const token = await new SignJWT({ username: "barberford" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime("30d")
    .sign(secret);
  return `dashboard_session=${token}`;
}

/** Create an authenticated tRPC context with a valid session cookie */
export async function makeAuthCtx(): Promise<TrpcContext> {
  const cookieHeader = await makeTestSessionCookie();
  return {
    user: null,
    req: {
      headers: { cookie: cookieHeader },
      protocol: "https",
    } as unknown as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

/** Create an unauthenticated tRPC context (no session cookie) */
export function makeUnauthCtx(): TrpcContext {
  return {
    user: null,
    req: {
      headers: { cookie: "" },
      protocol: "https",
    } as unknown as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}
