import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const caller = appRouter.createCaller({ user: null } as TrpcContext);

describe("dashboard.getAccountBalance", () => {
  it("returns a result object with success and dataSource fields", async () => {
    const result = await caller.dashboard.getAccountBalance();
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("dataSource");
    expect(["live", "mock", "error"]).toContain(result.dataSource);
  });

  it("when live: balance has required fields with correct types", async () => {
    const result = await caller.dashboard.getAccountBalance();
    if (result.success && result.balance) {
      const b = result.balance;
      expect(typeof b.accountName).toBe("string");
      expect(typeof b.currencyCode).toBe("string");
      expect(typeof b.approvedSpendingLimit).toBe("number");
      expect(typeof b.amountServed).toBe("number");
      expect(typeof b.remainingBalance).toBe("number");
      expect(typeof b.hasUnlimitedBudget).toBe("boolean");
      expect(typeof b.asOf).toBe("string");
      // asOf should be a valid ISO date
      expect(new Date(b.asOf).getTime()).not.toBeNaN();
    }
  });

  it("when live: remainingBalance is non-negative or -1 for unlimited", async () => {
    const result = await caller.dashboard.getAccountBalance();
    if (result.success && result.balance) {
      const { remainingBalance, hasUnlimitedBudget } = result.balance;
      if (hasUnlimitedBudget) {
        expect(remainingBalance).toBe(-1);
      } else {
        expect(remainingBalance).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("when live: currency is THB", async () => {
    const result = await caller.dashboard.getAccountBalance();
    if (result.success && result.balance) {
      expect(result.balance.currencyCode).toBe("THB");
    }
  });
});
