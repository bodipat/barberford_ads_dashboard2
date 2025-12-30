import { describe, it, expect } from "vitest";
import { testConnection, getAnalyticsOverview, getTrafficSources, getDailyMetrics, getChannelBreakdown } from "./googleAnalytics";

describe("Google Analytics Integration", () => {
  it("should connect to GA4 successfully", async () => {
    const result = await testConnection();
    expect(result.success).toBe(true);
    expect(result.propertyId).toBeDefined();
  });

  it("should fetch overview metrics with valid structure", async () => {
    const overview = await getAnalyticsOverview("30daysAgo", "today");
    
    expect(overview).toHaveProperty("totalUsers");
    expect(overview).toHaveProperty("newUsers");
    expect(overview).toHaveProperty("sessions");
    expect(overview).toHaveProperty("pageViews");
    expect(overview).toHaveProperty("avgSessionDuration");
    expect(overview).toHaveProperty("bounceRate");
    expect(overview).toHaveProperty("engagementRate");
    
    // Values should be numbers
    expect(typeof overview.totalUsers).toBe("number");
    expect(typeof overview.sessions).toBe("number");
    expect(overview.totalUsers).toBeGreaterThanOrEqual(0);
  });

  it("should fetch traffic sources", async () => {
    const sources = await getTrafficSources("30daysAgo", "today");
    
    expect(Array.isArray(sources)).toBe(true);
    
    if (sources.length > 0) {
      const firstSource = sources[0];
      expect(firstSource).toHaveProperty("source");
      expect(firstSource).toHaveProperty("medium");
      expect(firstSource).toHaveProperty("users");
      expect(firstSource).toHaveProperty("sessions");
      expect(firstSource).toHaveProperty("conversions");
    }
  });

  it("should fetch daily metrics for trend charts", async () => {
    const dailyMetrics = await getDailyMetrics("30daysAgo", "today");
    
    expect(Array.isArray(dailyMetrics)).toBe(true);
    expect(dailyMetrics.length).toBeGreaterThan(0);
    
    const firstDay = dailyMetrics[0];
    expect(firstDay).toHaveProperty("date");
    expect(firstDay).toHaveProperty("users");
    expect(firstDay).toHaveProperty("sessions");
    expect(firstDay).toHaveProperty("organicUsers");
    expect(firstDay).toHaveProperty("paidUsers");
  });

  it("should fetch channel breakdown with organic and paid data", async () => {
    const channels = await getChannelBreakdown("30daysAgo", "today");
    
    expect(Array.isArray(channels)).toBe(true);
    
    if (channels.length > 0) {
      const firstChannel = channels[0];
      expect(firstChannel).toHaveProperty("channel");
      expect(firstChannel).toHaveProperty("users");
      expect(firstChannel).toHaveProperty("sessions");
      expect(firstChannel).toHaveProperty("conversions");
      expect(firstChannel).toHaveProperty("bounceRate");
    }
  });
});
