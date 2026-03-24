import { describe, it, expect } from "vitest";

// Replicate the getDateRange logic for testing
const CAMPAIGN_START_DATE = "2025-12-17";

function getDateRange(dateRange: string): { startDate: string; endDate: string } {
  const today = new Date();
  const bangkokOffset = 7 * 60;
  const localDate = new Date(today.getTime() + (bangkokOffset + today.getTimezoneOffset()) * 60000);
  const endDate = localDate.toISOString().split("T")[0];

  let startDate: string;
  switch (dateRange) {
    case "daily": {
      startDate = endDate;
      break;
    }
    case "weekly": {
      const weekAgo = new Date(localDate);
      weekAgo.setDate(weekAgo.getDate() - 6);
      startDate = weekAgo.toISOString().split("T")[0];
      break;
    }
    case "campaign":
    default: {
      startDate = CAMPAIGN_START_DATE;
      break;
    }
  }

  return { startDate, endDate };
}

describe("getDateRange", () => {
  it("daily: startDate equals endDate (today)", () => {
    const { startDate, endDate } = getDateRange("daily");
    expect(startDate).toBe(endDate);
  });

  it("weekly: startDate is 6 days before endDate", () => {
    const { startDate, endDate } = getDateRange("weekly");
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(6);
  });

  it("campaign: startDate is the actual campaign launch date Dec 17 2025", () => {
    const { startDate } = getDateRange("campaign");
    expect(startDate).toBe("2025-12-17");
  });

  it("campaign: endDate is today (not in the past)", () => {
    const { endDate } = getDateRange("campaign");
    const today = new Date();
    const bangkokOffset = 7 * 60;
    const localDate = new Date(today.getTime() + (bangkokOffset + today.getTimezoneOffset()) * 60000);
    const expectedToday = localDate.toISOString().split("T")[0];
    expect(endDate).toBe(expectedToday);
  });

  it("campaign: date range spans at least 90 days (full campaign history)", () => {
    const { startDate, endDate } = getDateRange("campaign");
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(90);
  });

  it("unknown range falls back to campaign start date", () => {
    const { startDate } = getDateRange("unknown");
    expect(startDate).toBe("2025-12-17");
  });
});
