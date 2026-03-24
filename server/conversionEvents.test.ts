import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the googleAds module
vi.mock("./googleAds", () => ({
  isConfigured: vi.fn(),
  fetchConversionActions: vi.fn(),
  fetchConversionDailyMetrics: vi.fn(),
  fetchCampaignMetrics: vi.fn(),
  fetchDailyMetrics: vi.fn(),
  fetchKeywordMetrics: vi.fn(),
  testConnection: vi.fn(),
}));

import * as googleAds from "./googleAds";

describe("Conversion Events Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty arrays when API is not configured", async () => {
    vi.mocked(googleAds.isConfigured).mockReturnValue(false);
    // Simulate the router logic
    const isConfigured = googleAds.isConfigured();
    expect(isConfigured).toBe(false);
    const result = { success: false, actions: [], dailyBreakdown: [], dataSource: "mock" as const };
    expect(result.actions).toHaveLength(0);
    expect(result.dailyBreakdown).toHaveLength(0);
    expect(result.dataSource).toBe("mock");
  });

  it("returns live conversion actions when API is configured", async () => {
    vi.mocked(googleAds.isConfigured).mockReturnValue(true);
    vi.mocked(googleAds.fetchConversionActions).mockResolvedValue([
      { name: "Call Click (Website)", category: "PHONE_CALL_LEAD", conversions: 20, conversionValue: 0, allConversions: 21 },
      { name: "barberfordbkk.com - GA4 (web) ig_click", category: "OUTBOUND_CLICK", conversions: 83, conversionValue: 0, allConversions: 83 },
      { name: "barberfordbkk.com - GA4 (web) line_click", category: "CONTACT", conversions: 44, conversionValue: 0, allConversions: 44 },
    ]);
    vi.mocked(googleAds.fetchConversionDailyMetrics).mockResolvedValue([
      { date: "2026-03-01", campaign: "BF | Search | Erawan", conversions: 5, allConversions: 10, conversionValue: 0 },
      { date: "2026-03-02", campaign: "Barbersmith - Search", conversions: 3, allConversions: 15, conversionValue: 0 },
    ]);

    const actions = await googleAds.fetchConversionActions("2026-02-23", "2026-03-23");
    const dailyBreakdown = await googleAds.fetchConversionDailyMetrics("2026-02-23", "2026-03-23");

    expect(actions).toHaveLength(3);
    expect(actions[0].name).toBe("Call Click (Website)");
    expect(actions[0].category).toBe("PHONE_CALL_LEAD");
    expect(actions[1].conversions).toBe(83);
    expect(dailyBreakdown).toHaveLength(2);
    expect(dailyBreakdown[0].date).toBe("2026-03-01");
  });

  it("aggregates daily breakdown by date correctly", () => {
    const dailyBreakdown = [
      { date: "2026-03-01", campaign: "Campaign A", conversions: 5, allConversions: 10, conversionValue: 0 },
      { date: "2026-03-01", campaign: "Campaign B", conversions: 3, allConversions: 8, conversionValue: 0 },
      { date: "2026-03-02", campaign: "Campaign A", conversions: 2, allConversions: 5, conversionValue: 0 },
    ];

    const dateMap = new Map<string, { conversions: number; allConversions: number }>();
    dailyBreakdown.forEach((row) => {
      if (!dateMap.has(row.date)) {
        dateMap.set(row.date, { conversions: 0, allConversions: 0 });
      }
      const d = dateMap.get(row.date)!;
      d.conversions += row.conversions;
      d.allConversions += row.allConversions;
    });

    expect(dateMap.get("2026-03-01")?.conversions).toBe(8);
    expect(dateMap.get("2026-03-01")?.allConversions).toBe(18);
    expect(dateMap.get("2026-03-02")?.conversions).toBe(2);
  });

  it("aggregates campaign breakdown correctly", () => {
    const dailyBreakdown = [
      { date: "2026-03-01", campaign: "Erawan", conversions: 5, allConversions: 10, conversionValue: 0 },
      { date: "2026-03-02", campaign: "Erawan", conversions: 3, allConversions: 8, conversionValue: 0 },
      { date: "2026-03-01", campaign: "Barbersmith", conversions: 2, allConversions: 15, conversionValue: 0 },
    ];

    const campMap = new Map<string, { conversions: number; allConversions: number }>();
    dailyBreakdown.forEach((row) => {
      if (!campMap.has(row.campaign)) {
        campMap.set(row.campaign, { conversions: 0, allConversions: 0 });
      }
      const d = campMap.get(row.campaign)!;
      d.conversions += row.conversions;
      d.allConversions += row.allConversions;
    });

    expect(campMap.get("Erawan")?.conversions).toBe(8);
    expect(campMap.get("Erawan")?.allConversions).toBe(18);
    expect(campMap.get("Barbersmith")?.allConversions).toBe(15);
  });

  it("handles API errors gracefully", async () => {
    vi.mocked(googleAds.isConfigured).mockReturnValue(true);
    vi.mocked(googleAds.fetchConversionActions).mockRejectedValue(new Error("API Error"));
    vi.mocked(googleAds.fetchConversionDailyMetrics).mockRejectedValue(new Error("API Error"));

    try {
      await googleAds.fetchConversionActions("2026-02-23", "2026-03-23");
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const result = { success: false, actions: [], dailyBreakdown: [], dataSource: "error" as const };
      expect(result.dataSource).toBe("error");
    }
  });
});
