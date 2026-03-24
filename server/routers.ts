import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  fetchCampaignMetrics,
  fetchDailyMetrics,
  fetchKeywordMetrics,
  fetchConversionActions,
  fetchConversionDailyMetrics,
  isConfigured,
  testConnection,
} from "./googleAds";
import {
  getAnalyticsOverview,
  getTrafficSources,
  getDailyMetrics as getGADailyMetrics,
  getChannelBreakdown,
  testConnection as testGAConnection,
  getEventGoals,
  getConversionEvents,
} from "./googleAnalytics";

// Mock data generation for Google Ads Dashboard (fallback when API not available)
function generateMockDashboardData(dateRange: string) {
  // Campaign configuration based on the Google Ads guide
  const campaignConfig = [
    { id: 1, name: "Erawan", location: "erawan", dailyBudget: 250, totalBudget: 5500 },
    { id: 2, name: "Noir", location: "noir", dailyBudget: 180, totalBudget: 3960 },
    { id: 3, name: "Reserve", location: "reserve", dailyBudget: 183, totalBudget: 4026 },
  ];

  // Generate campaign performance data
  const campaigns = campaignConfig.map((config) => {
    const spendRatio = 0.6 + Math.random() * 0.35; // 60-95% of budget spent
    const spend = Math.round(config.totalBudget * spendRatio);
    const impressions = Math.round(2000 + Math.random() * 3000);
    const clicks = Math.round(impressions * (0.03 + Math.random() * 0.04)); // 3-7% CTR
    const conversions = Math.round(clicks * (0.05 + Math.random() * 0.08)); // 5-13% CVR
    const ctr = (clicks / impressions) * 100;
    const cpc = conversions > 0 ? spend / conversions : 0;

    // Determine status based on performance
    let status: "healthy" | "warning" | "critical" = "healthy";
    if (cpc > 600 || ctr < 2.5) status = "critical";
    else if (cpc > 450 || ctr < 3.5) status = "warning";

    return {
      id: config.id,
      name: config.name,
      location: config.location,
      spend,
      budget: config.totalBudget,
      impressions,
      clicks,
      conversions,
      ctr: parseFloat(ctr.toFixed(2)),
      cpc: parseFloat(cpc.toFixed(0)),
      status,
    };
  });

  // Calculate KPIs
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);

  const kpi = {
    totalSpend,
    totalBudget: 13500,
    totalConversions,
    targetConversions: 22,
    costPerConversion: totalConversions > 0 ? Math.round(totalSpend / totalConversions) : 0,
    targetCPC: 500,
    conversionRate: totalClicks > 0 ? parseFloat(((totalConversions / totalClicks) * 100).toFixed(1)) : 0,
    targetCVR: 7.5,
    totalClicks,
    totalImpressions,
    ctr: totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
  };

  // Generate daily trends (last 14 days)
  const dailyTrends = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    
    dailyTrends.push({
      date: dayStr,
      spend: Math.round(400 + Math.random() * 300),
      conversions: Math.round(1 + Math.random() * 3),
      clicks: Math.round(30 + Math.random() * 40),
    });
  }

  // Generate keywords data
  const keywordsList = [
    { keyword: "barbershop bangkok", matchType: "phrase" },
    { keyword: "luxury haircut bangkok", matchType: "exact" },
    { keyword: "gentleman haircut", matchType: "phrase" },
    { keyword: "best barber bangkok", matchType: "phrase" },
    { keyword: "premium barbershop", matchType: "exact" },
    { keyword: "hot towel shave bangkok", matchType: "exact" },
    { keyword: "men grooming bangkok", matchType: "phrase" },
    { keyword: "executive haircut", matchType: "exact" },
    { keyword: "traditional shave bangkok", matchType: "phrase" },
    { keyword: "barber erawan", matchType: "exact" },
  ];

  const keywords = keywordsList.map((kw, index) => {
    const impressions = Math.round(200 + Math.random() * 800);
    const clicks = Math.round(impressions * (0.02 + Math.random() * 0.06));
    const conversions = Math.round(clicks * (0.03 + Math.random() * 0.12));
    const spend = Math.round(clicks * (15 + Math.random() * 35));
    
    return {
      id: index + 1,
      keyword: kw.keyword,
      matchType: kw.matchType,
      qualityScore: Math.round(4 + Math.random() * 6),
      impressions,
      clicks,
      conversions,
      spend,
      cpc: clicks > 0 ? parseFloat((spend / clicks).toFixed(0)) : 0,
      status: Math.random() > 0.2 ? "active" : "paused" as "active" | "paused",
    };
  });

  // Generate alerts based on performance
  const alerts: Array<{
    id: number;
    type: "success" | "warning" | "danger";
    title: string;
    message: string;
    campaign?: string;
    metric?: string;
    value?: number;
    threshold?: number;
  }> = [];

  let alertId = 1;

  // Check each campaign for issues
  campaigns.forEach((campaign) => {
    if (campaign.cpc > 500) {
      alerts.push({
        id: alertId++,
        type: "danger",
        title: "High Cost Per Conversion",
        message: `CPC exceeds target threshold. Consider pausing low-performing keywords or improving ad relevance.`,
        campaign: campaign.name,
        metric: "CPC",
        value: campaign.cpc,
        threshold: 500,
      });
    }
    if (campaign.ctr < 3) {
      alerts.push({
        id: alertId++,
        type: "warning",
        title: "Low Click-Through Rate",
        message: `CTR is below benchmark. Test new ad copy variations or review keyword relevance.`,
        campaign: campaign.name,
        metric: "CTR",
        value: campaign.ctr,
        threshold: 3,
      });
    }
    if (campaign.spend / campaign.budget > 0.9) {
      alerts.push({
        id: alertId++,
        type: "warning",
        title: "Budget Nearly Exhausted",
        message: `Campaign has used over 90% of allocated budget. Monitor pacing carefully.`,
        campaign: campaign.name,
        metric: "Budget Used",
        value: Math.round((campaign.spend / campaign.budget) * 100),
        threshold: 90,
      });
    }
  });

  // Check keywords for quality score issues
  const lowQSKeywords = keywords.filter((k) => k.qualityScore < 5);
  if (lowQSKeywords.length > 0) {
    alerts.push({
      id: alertId++,
      type: "warning",
      title: "Low Quality Score Keywords",
      message: `${lowQSKeywords.length} keywords have Quality Score below 5. Improve ad relevance and landing page experience.`,
    });
  }

  // Add success alerts if performing well
  if (kpi.conversionRate >= kpi.targetCVR) {
    alerts.push({
      id: alertId++,
      type: "success",
      title: "Conversion Rate On Target",
      message: `Overall conversion rate of ${kpi.conversionRate}% meets or exceeds the ${kpi.targetCVR}% target.`,
    });
  }

  return {
    kpi,
    campaigns,
    dailyTrends,
    keywords,
    alerts,
    dataSource: "mock" as const,
  };
}

// Actual campaign start date (Barberford campaigns launched Dec 17, 2025)
const CAMPAIGN_START_DATE = "2025-12-17";

// Get date range based on selection
function getDateRange(dateRange: string): { startDate: string; endDate: string } {
  const today = new Date();
  // Use Bangkok timezone offset (UTC+7) to get correct local date
  const bangkokOffset = 7 * 60;
  const localDate = new Date(today.getTime() + (bangkokOffset + today.getTimezoneOffset()) * 60000);
  const endDate = localDate.toISOString().split("T")[0];

  let startDate: string;
  switch (dateRange) {
    case "daily": {
      // Today only
      startDate = endDate;
      break;
    }
    case "weekly": {
      // Last 7 days
      const weekAgo = new Date(localDate);
      weekAgo.setDate(weekAgo.getDate() - 6);
      startDate = weekAgo.toISOString().split("T")[0];
      break;
    }
    case "campaign":
    default: {
      // Full campaign history from actual launch date
      startDate = CAMPAIGN_START_DATE;
      break;
    }
  }

  return { startDate, endDate };
}

// Fetch real data from Google Ads API
async function fetchRealDashboardData(dateRange: string) {
  const { startDate, endDate } = getDateRange(dateRange);
  
  try {
    // Fetch all data in parallel
    const [campaignData, dailyData, keywordData] = await Promise.all([
      fetchCampaignMetrics(startDate, endDate),
      fetchDailyMetrics(startDate, endDate),
      fetchKeywordMetrics(startDate, endDate),
    ]);

    // Transform campaign data
    const campaigns = campaignData.map((c, index) => {
      // Determine status based on performance
      let status: "healthy" | "warning" | "critical" = "healthy";
      if (c.cpc > 600 || c.ctr < 2.5) status = "critical";
      else if (c.cpc > 450 || c.ctr < 3.5) status = "warning";

      // Estimate budget based on campaign name (matching Barberford locations)
      let budget = 4500; // default
      const nameLower = c.name.toLowerCase();
      if (nameLower.includes("erawan")) budget = 5500;
      else if (nameLower.includes("noir")) budget = 3960;
      else if (nameLower.includes("reserve")) budget = 4026;

      return {
        id: index + 1,
        name: c.name,
        location: nameLower.includes("erawan") ? "erawan" : 
                  nameLower.includes("noir") ? "noir" : 
                  nameLower.includes("reserve") ? "reserve" : "other",
        spend: Math.round(c.spend),
        budget,
        impressions: c.impressions,
        clicks: c.clicks,
        conversions: Math.round(c.conversions),
        ctr: parseFloat(c.ctr.toFixed(2)),
        cpc: Math.round(c.cpc),
        status,
      };
    });

    // Calculate KPIs
    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);

    const kpi = {
      totalSpend,
      totalBudget: 13500,
      totalConversions,
      targetConversions: 22,
      costPerConversion: totalConversions > 0 ? Math.round(totalSpend / totalConversions) : 0,
      targetCPC: 500,
      conversionRate: totalClicks > 0 ? parseFloat(((totalConversions / totalClicks) * 100).toFixed(1)) : 0,
      targetCVR: 7.5,
      totalClicks,
      totalImpressions,
      ctr: totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
    };

    // Transform daily trends
    const dailyTrends = dailyData.map((d) => {
      const date = new Date(d.date);
      return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        spend: Math.round(d.spend),
        conversions: Math.round(d.conversions),
        clicks: d.clicks,
      };
    });

    // Transform keywords
    const keywords = keywordData.slice(0, 10).map((k, index) => ({
      id: index + 1,
      keyword: k.keyword,
      matchType: String(k.matchType || "broad").toLowerCase().replace(/_/g, " "),
      qualityScore: k.qualityScore,
      impressions: k.impressions,
      clicks: k.clicks,
      conversions: Math.round(k.conversions),
      spend: Math.round(k.cpc * k.clicks),
      cpc: Math.round(k.cpc),
      status: "active" as "active" | "paused",
    }));

    // Generate alerts based on real performance
    const alerts: Array<{
      id: number;
      type: "success" | "warning" | "danger";
      title: string;
      message: string;
      campaign?: string;
      metric?: string;
      value?: number;
      threshold?: number;
    }> = [];

    let alertId = 1;

    // Check each campaign for issues
    campaigns.forEach((campaign) => {
      if (campaign.cpc > 500) {
        alerts.push({
          id: alertId++,
          type: "danger",
          title: "High Cost Per Conversion",
          message: `CPC exceeds target threshold. Consider pausing low-performing keywords or improving ad relevance.`,
          campaign: campaign.name,
          metric: "CPC",
          value: campaign.cpc,
          threshold: 500,
        });
      }
      if (campaign.ctr < 3) {
        alerts.push({
          id: alertId++,
          type: "warning",
          title: "Low Click-Through Rate",
          message: `CTR is below benchmark. Test new ad copy variations or review keyword relevance.`,
          campaign: campaign.name,
          metric: "CTR",
          value: campaign.ctr,
          threshold: 3,
        });
      }
      if (campaign.spend / campaign.budget > 0.9) {
        alerts.push({
          id: alertId++,
          type: "warning",
          title: "Budget Nearly Exhausted",
          message: `Campaign has used over 90% of allocated budget. Monitor pacing carefully.`,
          campaign: campaign.name,
          metric: "Budget Used",
          value: Math.round((campaign.spend / campaign.budget) * 100),
          threshold: 90,
        });
      }
    });

    // Check keywords for quality score issues
    const lowQSKeywords = keywords.filter((k) => k.qualityScore < 5);
    if (lowQSKeywords.length > 0) {
      alerts.push({
        id: alertId++,
        type: "warning",
        title: "Low Quality Score Keywords",
        message: `${lowQSKeywords.length} keywords have Quality Score below 5. Improve ad relevance and landing page experience.`,
      });
    }

    // Add success alerts if performing well
    if (kpi.conversionRate >= kpi.targetCVR) {
      alerts.push({
        id: alertId++,
        type: "success",
        title: "Conversion Rate On Target",
        message: `Overall conversion rate of ${kpi.conversionRate}% meets or exceeds the ${kpi.targetCVR}% target.`,
      });
    }

    // Add info about real data
    if (campaigns.length === 0) {
      alerts.unshift({
        id: 0,
        type: "warning",
        title: "No Campaign Data",
        message: "No active campaigns found in the selected date range. Data shown may be limited.",
      });
    }

    return {
      kpi,
      campaigns,
      dailyTrends,
      keywords,
      alerts,
      dataSource: "live" as const,
    };
  } catch (error) {
    console.error("[Dashboard] Error fetching real data:", error);
    throw error;
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  dashboard: router({
    getData: publicProcedure
      .input(z.object({ dateRange: z.enum(["daily", "weekly", "campaign"]) }))
      .query(async ({ input }) => {
        // Check if Google Ads API is configured
        if (isConfigured()) {
          try {
            console.log("[Dashboard] Fetching real data from Google Ads API...");
            const data = await fetchRealDashboardData(input.dateRange);
            console.log("[Dashboard] Successfully fetched real data");
            return data;
          } catch (error) {
            console.error("[Dashboard] Failed to fetch real data, falling back to mock:", error);
            // Fall back to mock data if API fails
            return generateMockDashboardData(input.dateRange);
          }
        } else {
          console.log("[Dashboard] Google Ads API not configured, using mock data");
          return generateMockDashboardData(input.dateRange);
        }
      }),

    // Test API connection endpoint
    testConnection: publicProcedure.query(async () => {
      if (!isConfigured()) {
        return {
          success: false,
          message: "Google Ads API credentials not configured",
          configured: false,
        };
      }
      
      const result = await testConnection();
      return {
        ...result,
        configured: true,
      };
    }),

    // Get API status
    getStatus: publicProcedure.query(() => {
      return {
        configured: isConfigured(),
        message: isConfigured() 
          ? "Google Ads API is configured and ready" 
          : "Using mock data (Google Ads API not configured)",
      };
    }),

    // Get Event Goals & Conversions data
    getConversionEvents: publicProcedure
      .input(z.object({ dateRange: z.enum(["daily", "weekly", "campaign"]) }))
      .query(async ({ input }) => {
        if (!isConfigured()) {
          return { success: false, actions: [], dailyBreakdown: [], dataSource: "mock" as const };
        }
        try {
          const { startDate, endDate } = getDateRange(input.dateRange);
          const [actions, dailyBreakdown] = await Promise.all([
            fetchConversionActions(startDate, endDate),
            fetchConversionDailyMetrics(startDate, endDate),
          ]);
          return { success: true, actions, dailyBreakdown, dataSource: "live" as const };
        } catch (error) {
          console.error("[Dashboard] Error fetching conversion events:", error);
          return { success: false, actions: [], dailyBreakdown: [], dataSource: "error" as const };
        }
      }),
  }),

  // Google Analytics router
  analytics: router({
    // Get overview metrics
    getOverview: publicProcedure
      .input(z.object({ 
        startDate: z.string().optional().default("30daysAgo"),
        endDate: z.string().optional().default("today")
      }))
      .query(async ({ input }) => {
        try {
          const data = await getAnalyticsOverview(input.startDate, input.endDate);
          return { success: true, data };
        } catch (error) {
          console.error("[Analytics] Error fetching overview:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error",
            data: null 
          };
        }
      }),

    // Get traffic sources
    getTrafficSources: publicProcedure
      .input(z.object({ 
        startDate: z.string().optional().default("30daysAgo"),
        endDate: z.string().optional().default("today")
      }))
      .query(async ({ input }) => {
        try {
          const data = await getTrafficSources(input.startDate, input.endDate);
          return { success: true, data };
        } catch (error) {
          console.error("[Analytics] Error fetching traffic sources:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error",
            data: [] 
          };
        }
      }),

    // Get daily metrics for trend charts
    getDailyMetrics: publicProcedure
      .input(z.object({ 
        startDate: z.string().optional().default("30daysAgo"),
        endDate: z.string().optional().default("today")
      }))
      .query(async ({ input }) => {
        try {
          const data = await getGADailyMetrics(input.startDate, input.endDate);
          return { success: true, data };
        } catch (error) {
          console.error("[Analytics] Error fetching daily metrics:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error",
            data: [] 
          };
        }
      }),

    // Get channel breakdown (Organic vs Paid etc)
    getChannelBreakdown: publicProcedure
      .input(z.object({ 
        startDate: z.string().optional().default("30daysAgo"),
        endDate: z.string().optional().default("today")
      }))
      .query(async ({ input }) => {
        try {
          const data = await getChannelBreakdown(input.startDate, input.endDate);
          return { success: true, data };
        } catch (error) {
          console.error("[Analytics] Error fetching channel breakdown:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error",
            data: [] 
          };
        }
      }),

    // Test GA4 connection
    testConnection: publicProcedure.query(async () => {
      const result = await testGAConnection();
      return result;
    }),

    // Get event goals / key events
    getEventGoals: publicProcedure
      .input(z.object({ 
        startDate: z.string().optional().default("30daysAgo"),
        endDate: z.string().optional().default("today")
      }))
      .query(async ({ input }) => {
        try {
          const data = await getEventGoals(input.startDate, input.endDate);
          return { success: true, data };
        } catch (error) {
          console.error("[Analytics] Error fetching event goals:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error",
            data: [] 
          };
        }
      }),

    // Get conversion events only (key events marked in GA4)
    getConversionEvents: publicProcedure
      .input(z.object({ 
        startDate: z.string().optional().default("30daysAgo"),
        endDate: z.string().optional().default("today")
      }))
      .query(async ({ input }) => {
        try {
          const data = await getConversionEvents(input.startDate, input.endDate);
          return { success: true, data };
        } catch (error) {
          console.error("[Analytics] Error fetching conversion events:", error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error",
            data: [] 
          };
        }
      }),

    // Get combined dashboard data (GA + Ads)
    getCombinedData: publicProcedure
      .input(z.object({ 
        startDate: z.string().optional().default("30daysAgo"),
        endDate: z.string().optional().default("today")
      }))
      .query(async ({ input }) => {
        try {
          const [overview, channels, dailyMetrics, trafficSources] = await Promise.all([
            getAnalyticsOverview(input.startDate, input.endDate),
            getChannelBreakdown(input.startDate, input.endDate),
            getGADailyMetrics(input.startDate, input.endDate),
            getTrafficSources(input.startDate, input.endDate),
          ]);

          // Find organic and paid data from channels
          const organicData = channels.find(c => c.channel === "Organic Search") || {
            channel: "Organic Search", users: 0, sessions: 0, conversions: 0, bounceRate: 0
          };
          const paidData = channels.find(c => c.channel === "Paid Search") || {
            channel: "Paid Search", users: 0, sessions: 0, conversions: 0, bounceRate: 0
          };

          return {
            success: true,
            data: {
              overview,
              channels,
              dailyMetrics,
              trafficSources,
              comparison: {
                organic: organicData,
                paid: paidData,
              },
            },
          };
        } catch (error) {
          console.error("[Analytics] Error fetching combined data:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            data: null,
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
