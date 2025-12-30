import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

// Mock data generation for Google Ads Dashboard
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
  };
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
      .query(({ input }) => {
        return generateMockDashboardData(input.dateRange);
      }),
  }),
});

export type AppRouter = typeof appRouter;
