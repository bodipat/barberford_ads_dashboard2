import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, dashboardProcedure, router } from "./_core/trpc";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";
import { z } from "zod";
import {
  fetchCampaignMetrics,
  fetchDailyMetrics,
  fetchKeywordMetrics,
  fetchConversionActions,
  fetchConversionDailyMetrics,
  fetchAccountBalance,
  fetchTopKeywordsByCampaign,
  fetchDevicePerformance,
  fetchSearchTerms,
  fetchAdCopyPerformance,
  fetchImpressionShare,
  fetchCampaignDailyReport,
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
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";

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
function getBangkokDateString(date: Date): string {
  // Use Intl.DateTimeFormat to reliably get the current date in Bangkok (Asia/Bangkok = UTC+7)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(date);
}

function getBangkokDateOffset(date: Date, days: number): string {
  // Shift by N days relative to Bangkok date
  const bangkokStr = getBangkokDateString(date);
  const d = new Date(bangkokStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function getDateRange(dateRange: string): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = getBangkokDateString(now); // today in Bangkok

  let startDate: string;
  switch (dateRange) {
    case "daily": {
      // Today only
      startDate = endDate;
      break;
    }
    case "weekly": {
      // Last 7 days
      startDate = getBangkokDateOffset(now, -6);
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
    // Custom username/password login — issues a dashboard_session JWT cookie
    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { username, password } = input;
        const validUser = ENV.dashboardUsername || "barberford";
        const validPass = ENV.dashboardPassword || "bbf-erawan";
        if (username !== validUser || password !== validPass) {
          throw new Error("Invalid username or password");
        }
        const secret = new TextEncoder().encode(ENV.cookieSecret || "dashboard_secret_fallback");
        const token = await new SignJWT({ username })
          .setProtectedHeader({ alg: "HS256", typ: "JWT" })
          .setExpirationTime("30d")
          .sign(secret);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie("dashboard_session", token, {
          ...cookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
        return { success: true } as const;
      }),

    // Check if current session is valid
    me: publicProcedure.query(async ({ ctx }) => {
      const { parse: parseCookieHeader } = await import("cookie");
      const { jwtVerify } = await import("jose");
      const cookieHeader = ctx.req.headers.cookie ?? "";
      const cookies = parseCookieHeader(cookieHeader);
      const token = cookies["dashboard_session"];
      if (!token) return null;
      try {
        const secret = new TextEncoder().encode(ENV.cookieSecret || "dashboard_secret_fallback");
        const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
        return { username: payload.username as string };
      } catch {
        return null;
      }
    }),

    // Logout — clears the dashboard_session cookie
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("dashboard_session", { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  dashboard: router({
    getData: dashboardProcedure
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
    testConnection: dashboardProcedure.query(async () => {
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
    getStatus: dashboardProcedure.query(() => {
      return {
        configured: isConfigured(),
        message: isConfigured() 
          ? "Google Ads API is configured and ready" 
          : "Using mock data (Google Ads API not configured)",
      };
    }),

    // Get Event Goals & Conversions data
    getConversionEvents: dashboardProcedure
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

    getAccountBalance: dashboardProcedure
      .query(async () => {
        if (!isConfigured()) {
          return { success: false, balance: null, dataSource: "mock" as const };
        }
        try {
          const balance = await fetchAccountBalance();
          return { success: true, balance, dataSource: "live" as const };
        } catch (error) {
          console.error("[Dashboard] Error fetching account balance:", error);
          return { success: false, balance: null, dataSource: "error" as const };
        }
      }),

    getTopKeywordsByCampaign: dashboardProcedure
      .input(z.object({ dateRange: z.enum(["daily", "weekly", "campaign"]) }))
      .query(async ({ input }) => {
        if (!isConfigured()) {
          return { success: false, campaigns: [], dataSource: "mock" as const };
        }
        try {
          const { startDate, endDate } = getDateRange(input.dateRange);
          const campaigns = await fetchTopKeywordsByCampaign(startDate, endDate);
          return { success: true, campaigns, dataSource: "live" as const };
        } catch (error) {
          console.error("[Dashboard] Error fetching top keywords by campaign:", error);
          return { success: false, campaigns: [], dataSource: "error" as const };
        }
      }),

    getDevicePerformance: dashboardProcedure
      .input(z.object({ dateRange: z.enum(["daily", "weekly", "campaign"]) }))
      .query(async ({ input }) => {
        if (!isConfigured()) return { success: false, data: [], dataSource: "mock" as const };
        try {
          const { startDate, endDate } = getDateRange(input.dateRange);
          const data = await fetchDevicePerformance(startDate, endDate);
          return { success: true, data, dataSource: "live" as const };
        } catch (error) {
          console.error("[Dashboard] Error fetching device performance:", error);
          return { success: false, data: [], dataSource: "error" as const };
        }
      }),

    getSearchTerms: dashboardProcedure
      .input(z.object({ dateRange: z.enum(["daily", "weekly", "campaign"]), limit: z.number().optional() }))
      .query(async ({ input }) => {
        if (!isConfigured()) return { success: false, data: [], dataSource: "mock" as const };
        try {
          const { startDate, endDate } = getDateRange(input.dateRange);
          const data = await fetchSearchTerms(startDate, endDate, input.limit || 20);
          return { success: true, data, dataSource: "live" as const };
        } catch (error) {
          console.error("[Dashboard] Error fetching search terms:", error);
          return { success: false, data: [], dataSource: "error" as const };
        }
      }),

    getAdCopyPerformance: dashboardProcedure
      .input(z.object({ dateRange: z.enum(["daily", "weekly", "campaign"]) }))
      .query(async ({ input }) => {
        if (!isConfigured()) return { success: false, data: [], dataSource: "mock" as const };
        try {
          const { startDate, endDate } = getDateRange(input.dateRange);
          const data = await fetchAdCopyPerformance(startDate, endDate);
          return { success: true, data, dataSource: "live" as const };
        } catch (error) {
          console.error("[Dashboard] Error fetching ad copy performance:", error);
          return { success: false, data: [], dataSource: "error" as const };
        }
      }),

    getImpressionShare: dashboardProcedure
      .input(z.object({ dateRange: z.enum(["daily", "weekly", "campaign"]) }))
      .query(async ({ input }) => {
        if (!isConfigured()) return { success: false, data: [], dataSource: "mock" as const };
        try {
          const { startDate, endDate } = getDateRange(input.dateRange);
          const data = await fetchImpressionShare(startDate, endDate);
          return { success: true, data, dataSource: "live" as const };
        } catch (error) {
          console.error("[Dashboard] Error fetching impression share:", error);
          return { success: false, data: [], dataSource: "error" as const };
        }
      }),

    // 14-day daily report per campaign with conversion action breakdown
    getCampaignDailyReport: dashboardProcedure
      .input(z.object({ days: z.number().min(1).max(90).default(14) }))
      .query(async ({ input }) => {
        if (!isConfigured()) return { success: false, daily: [], convActions: [], startDate: "", endDate: "", dataSource: "mock" as const };
        try {
          const now = new Date();
          const endDate = getBangkokDateString(now);
          const startDate = getBangkokDateOffset(now, -(input.days - 1));
          const result = await fetchCampaignDailyReport(startDate, endDate);
          return { success: true, ...result, startDate, endDate, dataSource: "live" as const };
        } catch (error) {
          console.error("[Dashboard] Error fetching campaign daily report:", error);
          return { success: false, daily: [], convActions: [], dataSource: "error" as const };
        }
      }),

    // ─── Daily Report Generator ───────────────────────────────────────────────
    // Called by the scheduled task every day at 20:30 Bangkok time.
    // Fetches today's live data, asks LLM to analyse it, then pushes a
    // Manus owner notification with the Thai-language report.
    generateDailyReport: publicProcedure
      .input(z.object({ secret: z.string() }))
      .mutation(async ({ input }) => {
        // Simple shared secret to prevent unauthorised triggers
        const REPORT_SECRET = process.env.REPORT_SECRET || "barberford-daily-report";
        if (input.secret !== REPORT_SECRET) {
          throw new Error("Unauthorized");
        }

        if (!isConfigured()) {
          return { success: false, message: "Google Ads API not configured" };
        }

        const today = getBangkokDateString(new Date());

        // Fetch all relevant data for today in parallel
        const [campaigns, keywords, searchTerms, devices, impressionShare, conversionActions] =
          await Promise.all([
            fetchCampaignMetrics(today, today).catch(() => []),
            fetchKeywordMetrics(today, today).catch(() => []),
            fetchSearchTerms(today, today, 30).catch(() => []),
            fetchDevicePerformance(today, today).catch(() => []),
            fetchImpressionShare(today, today).catch(() => []),
            fetchConversionActions(today, today).catch(() => []),
          ]);

        // ── Build compact data summary for LLM ──────────────────────────────
        const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
        const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
        const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
        const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
        const overallCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0";
        const overallCPA = totalConversions > 0 ? (totalSpend / totalConversions).toFixed(0) : "N/A";

        const campaignSummary = campaigns
          .filter(c => c.spend > 0)
          .map(c => {
            const is = impressionShare.find(i => i.campaignName === c.name);
            return [
              `แคมเปญ: ${c.name}`,
              `  ใช้งบ: ฿${c.spend.toFixed(0)} | Impr: ${c.impressions} | Clicks: ${c.clicks} | CTR: ${c.ctr.toFixed(1)}%`,
              `  Conv: ${c.conversions} | CPA: ${c.conversions > 0 ? (c.spend / c.conversions).toFixed(0) : "N/A"}`,
              is ? `  IS: ${is.impressionShare}% | Budget Lost: ${is.budgetLostIS}% | Rank Lost: ${is.rankLostIS}%` : "",
            ].filter(Boolean).join("\n");
          })
          .join("\n\n");

        const topKeywords = keywords
          .filter(k => k.clicks > 0)
          .sort((a, b) => b.cpc * b.clicks - a.cpc * a.clicks)
          .slice(0, 15)
          .map(k => `"${k.keyword}" QS=${k.qualityScore || "N/A"} Clicks=${k.clicks} CTR=${k.ctr.toFixed(1)}% CPC=฿${k.cpc.toFixed(0)} Conv=${k.conversions}`)
          .join("\n");

        const topSearchTerms = searchTerms
          .slice(0, 15)
          .map(s => `"${s.searchTerm}" [${s.campaignName.substring(0, 20)}] Clicks=${s.clicks} Cost=฿${s.spend.toFixed(0)} Conv=${s.conversions}`)
          .join("\n");

        const deviceSummary = devices
          .map(d => `${d.device}: Clicks=${d.clicks} Conv=${d.conversions} CPA=฿${d.cpa}`)
          .join(" | ");

        const convSummary = conversionActions.length > 0
          ? conversionActions.map(a => `${a.name}: ${a.conversions} conv`).join(" | ")
          : "ไม่มี Conversion วันนี้";

        const dataForLLM = `
วันที่: ${today} (เวลาไทย)

=== ภาพรวม ===
ใช้งบรวม: ฿${totalSpend.toFixed(0)}
Impressions: ${totalImpressions}
Clicks: ${totalClicks}
CTR: ${overallCTR}%
Conversions: ${totalConversions}
CPA: ฿${overallCPA}

=== แคมเปญ ===
${campaignSummary || "ไม่มีข้อมูล"}

=== Keywords ที่ใช้งบสูงสุด ===
${topKeywords || "ไม่มีข้อมูล"}

=== Search Terms ===
${topSearchTerms || "ไม่มีข้อมูล"}

=== Device ===
${deviceSummary || "ไม่มีข้อมูล"}

=== Conversions ===
${convSummary}
`;

        // ── Ask LLM to generate Thai report ─────────────────────────────────
        const llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `คุณเป็นผู้เชี่ยวชาญ Google Ads สำหรับ Barberford ร้านตัดผมชายระดับพรีเมียมในกรุงเทพฯ
หน้าที่ของคุณคือวิเคราะห์ข้อมูล Ads ประจำวัน และเขียนรายงานสรุปเป็นภาษาไทยที่กระชับ อ่านง่าย และให้คำแนะนำที่นำไปปฏิบัติได้จริงทันที

รูปแบบรายงาน:
1. 📊 สรุปภาพรวมวันนี้ (2-3 ประโยค)
2. 🏆 แคมเปญที่ดีที่สุดวันนี้
3. ⚠️ ปัญหาที่พบ (เรียงตามความสำคัญ)
4. 🔑 Keywords น่าสังเกต (QS ต่ำ / CPC แพง / Search term แปลก)
5. ✅ สิ่งที่ควรทำวันพรุ่งนี้ (3-5 ข้อ ระบุชื่อ keyword/แคมเปญให้ชัดเจน)

เขียนให้กระชับ ตรงประเด็น ไม่ต้องอธิบายนิยามพื้นฐาน เจ้าของร้านอ่านเองทุกวัน`,
            },
            {
              role: "user",
              content: `นี่คือข้อมูล Google Ads ของ Barberford วันนี้:\n\n${dataForLLM}\n\nกรุณาวิเคราะห์และเขียนรายงานประจำวัน`,
            },
          ],
        });

        const reportText =
          typeof llmResult.choices[0]?.message?.content === "string"
            ? llmResult.choices[0].message.content
            : "ไม่สามารถสร้างรายงานได้";

        // ── Send notification ────────────────────────────────────────────────
        const title = `📊 Barberford Ads Report — ${today} | ฿${totalSpend.toFixed(0)} | ${totalConversions} Conv`;
        await notifyOwner({ title, content: reportText });

        console.log(`[DailyReport] Sent report for ${today}: ฿${totalSpend.toFixed(0)}, ${totalConversions} conversions`);
        return { success: true, date: today, totalSpend, totalConversions, reportText };
      }),
  }),

  // Google Analytics router
  analytics: router({
    // Get overview metrics
    getOverview: dashboardProcedure
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
    getTrafficSources: dashboardProcedure
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
    getDailyMetrics: dashboardProcedure
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
    getChannelBreakdown: dashboardProcedure
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
    testConnection: dashboardProcedure.query(async () => {
      const result = await testGAConnection();
      return result;
    }),

    // Get event goals / key events
    getEventGoals: dashboardProcedure
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
    getConversionEvents: dashboardProcedure
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
    getCombinedData: dashboardProcedure
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
