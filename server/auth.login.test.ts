import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Minimal mock context factory
function makeCtx(cookieHeader = ""): TrpcContext {
  return {
    req: {
      headers: { cookie: cookieHeader },
      protocol: "http",
    } as any,
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as any,
    user: null,
  };
}

describe("auth.login", () => {
  it("rejects wrong credentials", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.auth.login({ username: "wrong", password: "wrong" })
    ).rejects.toThrow();
  });

  it("rejects correct username but wrong password", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.auth.login({ username: "barberford", password: "wrongpass" })
    ).rejects.toThrow();
  });

  it("accepts correct credentials", async () => {
    const setCookieCalls: string[] = [];
    const ctx: TrpcContext = {
      req: {
        headers: { cookie: "" },
        protocol: "http",
      } as any,
      res: {
        cookie: (name: string) => { setCookieCalls.push(name); },
        clearCookie: () => {},
      } as any,
      user: null,
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.login({ username: "barberford", password: "bbf-erawan" });
    expect(result.success).toBe(true);
    expect(setCookieCalls).toContain("dashboard_session");
  });
});

describe("auth.me", () => {
  it("returns null when no session cookie", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns null for invalid/garbage cookie", async () => {
    const caller = appRouter.createCaller(makeCtx("dashboard_session=garbage_token"));
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("auth.logout", () => {
  it("clears the dashboard_session cookie", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      req: {
        headers: { cookie: "" },
        protocol: "http",
      } as any,
      res: {
        cookie: () => {},
        clearCookie: (name: string) => { clearedCookies.push(name); },
      } as any,
      user: null,
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies).toContain("dashboard_session");
  });
});

describe("dashboard protection", () => {
  it("rejects getData without a valid session cookie", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.dashboard.getData({ dateRange: "daily" })
    ).rejects.toThrow();
  });
});
