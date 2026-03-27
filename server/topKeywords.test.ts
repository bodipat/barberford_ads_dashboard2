import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import { makeAuthCtx } from "./testHelpers";

vi.mock("./googleAds", () => ({
  isConfigured: vi.fn(),
  fetchTopKeywordsByCampaign: vi.fn(),
  fetchCampaignMetrics: vi.fn(),
  fetchDailyMetrics: vi.fn(),
  fetchKeywordMetrics: vi.fn(),
  fetchConversionActions: vi.fn(),
  fetchConversionDailyMetrics: vi.fn(),
  fetchAccountBalance: vi.fn(),
  fetchDevicePerformance: vi.fn(),
  fetchSearchTerms: vi.fn(),
  fetchAdCopyPerformance: vi.fn(),
  fetchImpressionShare: vi.fn(),
  testConnection: vi.fn(),
}));

import { isConfigured, fetchTopKeywordsByCampaign } from "./googleAds";

let caller: ReturnType<typeof appRouter.createCaller>;

beforeAll(async () => {
  const ctx = await makeAuthCtx();
  caller = appRouter.createCaller(ctx);
});

describe("dashboard.getTopKeywordsByCampaign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mock response when not configured", async () => {
    vi.mocked(isConfigured).mockReturnValue(false);

    const result = await caller.dashboard.getTopKeywordsByCampaign({ dateRange: "weekly" });

    expect(result.success).toBe(false);
    expect(result.campaigns).toEqual([]);
    expect(result.dataSource).toBe("mock");
  });

  it("returns live campaigns with keywords when configured", async () => {
    vi.mocked(isConfigured).mockReturnValue(true);
    vi.mocked(fetchTopKeywordsByCampaign).mockResolvedValue([
      {
        campaignId: "123",
        campaignName: "Barberford | Noir Siam | Search",
        keywords: [
          {
            rank: 1,
            keyword: "barber shop siam",
            matchType: "BROAD",
            clicks: 1009,
            impressions: 12000,
            ctr: 8.41,
            cpc: 12.5,
            conversions: 55,
            conversionRate: 5.45,
            spend: 12612.5,
          },
          {
            rank: 2,
            keyword: "barbersmith",
            matchType: "EXACT",
            clicks: 644,
            impressions: 8000,
            ctr: 8.05,
            cpc: 13.69,
            conversions: 34,
            conversionRate: 5.28,
            spend: 8816.36,
          },
        ],
      },
    ]);

    const result = await caller.dashboard.getTopKeywordsByCampaign({ dateRange: "campaign" });

    expect(result.success).toBe(true);
    expect(result.dataSource).toBe("live");
    expect(result.campaigns).toHaveLength(1);
    expect(result.campaigns[0].campaignName).toBe("Barberford | Noir Siam | Search");
    expect(result.campaigns[0].keywords).toHaveLength(2);
    expect(result.campaigns[0].keywords[0].rank).toBe(1);
    expect(result.campaigns[0].keywords[0].clicks).toBe(1009);
  });

  it("handles all three dateRange values", async () => {
    vi.mocked(isConfigured).mockReturnValue(true);
    vi.mocked(fetchTopKeywordsByCampaign).mockResolvedValue([]);

    for (const range of ["daily", "weekly", "campaign"] as const) {
      const result = await caller.dashboard.getTopKeywordsByCampaign({ dateRange: range });
      expect(result.success).toBe(true);
      expect(result.campaigns).toEqual([]);
    }
  });

  it("returns error dataSource on API failure", async () => {
    vi.mocked(isConfigured).mockReturnValue(true);
    vi.mocked(fetchTopKeywordsByCampaign).mockRejectedValue(new Error("API error"));

    const result = await caller.dashboard.getTopKeywordsByCampaign({ dateRange: "weekly" });

    expect(result.success).toBe(false);
    expect(result.campaigns).toEqual([]);
    expect(result.dataSource).toBe("error");
  });
});
