import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("dashboard.getData", () => {
  it("returns valid KPI data structure", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.getData({ dateRange: "campaign" });

    // Verify KPI structure
    expect(result.kpi).toBeDefined();
    expect(result.kpi.totalSpend).toBeGreaterThanOrEqual(0);
    expect(result.kpi.totalBudget).toBe(13500);
    expect(result.kpi.totalConversions).toBeGreaterThanOrEqual(0);
    expect(result.kpi.targetConversions).toBe(22);
    expect(result.kpi.costPerConversion).toBeGreaterThanOrEqual(0);
    expect(result.kpi.conversionRate).toBeGreaterThanOrEqual(0);
  });

  it("returns three campaigns for Erawan, Noir, and Reserve", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.getData({ dateRange: "campaign" });

    expect(result.campaigns).toHaveLength(3);
    
    const locations = result.campaigns.map((c) => c.location);
    expect(locations).toContain("erawan");
    expect(locations).toContain("noir");
    expect(locations).toContain("reserve");

    // Verify each campaign has required fields
    result.campaigns.forEach((campaign) => {
      expect(campaign.id).toBeDefined();
      expect(campaign.name).toBeDefined();
      expect(campaign.spend).toBeGreaterThanOrEqual(0);
      expect(campaign.budget).toBeGreaterThan(0);
      expect(campaign.impressions).toBeGreaterThanOrEqual(0);
      expect(campaign.clicks).toBeGreaterThanOrEqual(0);
      expect(campaign.conversions).toBeGreaterThanOrEqual(0);
      expect(campaign.ctr).toBeGreaterThanOrEqual(0);
      expect(campaign.cpc).toBeGreaterThanOrEqual(0);
      expect(["healthy", "warning", "critical"]).toContain(campaign.status);
    });
  });

  it("returns daily trends data", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.getData({ dateRange: "campaign" });

    expect(result.dailyTrends).toBeDefined();
    expect(result.dailyTrends.length).toBeGreaterThan(0);

    // Verify daily trend structure
    result.dailyTrends.forEach((day) => {
      expect(day.date).toBeDefined();
      expect(day.spend).toBeGreaterThanOrEqual(0);
      expect(day.conversions).toBeGreaterThanOrEqual(0);
      expect(day.clicks).toBeGreaterThanOrEqual(0);
    });
  });

  it("returns keywords data with quality scores", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.getData({ dateRange: "campaign" });

    expect(result.keywords).toBeDefined();
    expect(result.keywords.length).toBeGreaterThan(0);

    // Verify keyword structure
    result.keywords.forEach((keyword) => {
      expect(keyword.id).toBeDefined();
      expect(keyword.keyword).toBeDefined();
      expect(["exact", "phrase", "broad"]).toContain(keyword.matchType);
      expect(keyword.qualityScore).toBeGreaterThanOrEqual(1);
      expect(keyword.qualityScore).toBeLessThanOrEqual(10);
      expect(keyword.impressions).toBeGreaterThanOrEqual(0);
      expect(keyword.clicks).toBeGreaterThanOrEqual(0);
      expect(keyword.conversions).toBeGreaterThanOrEqual(0);
      expect(["active", "paused"]).toContain(keyword.status);
    });
  });

  it("returns alerts array", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.getData({ dateRange: "campaign" });

    expect(result.alerts).toBeDefined();
    expect(Array.isArray(result.alerts)).toBe(true);

    // Verify alert structure if any alerts exist
    result.alerts.forEach((alert) => {
      expect(alert.id).toBeDefined();
      expect(["success", "warning", "danger"]).toContain(alert.type);
      expect(alert.title).toBeDefined();
      expect(alert.message).toBeDefined();
    });
  });

  it("accepts different date range options", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Test all date range options
    const dailyResult = await caller.dashboard.getData({ dateRange: "daily" });
    expect(dailyResult.kpi).toBeDefined();

    const weeklyResult = await caller.dashboard.getData({ dateRange: "weekly" });
    expect(weeklyResult.kpi).toBeDefined();

    const campaignResult = await caller.dashboard.getData({ dateRange: "campaign" });
    expect(campaignResult.kpi).toBeDefined();
  });
});
