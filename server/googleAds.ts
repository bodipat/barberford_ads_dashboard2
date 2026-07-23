import { GoogleAdsApi, enums } from "google-ads-api";
import { ENV } from "./_core/env";

// Initialize Google Ads API client
let client: GoogleAdsApi | null = null;

function getClient(): GoogleAdsApi {
  if (!client) {
    if (
      !ENV.googleAdsClientId ||
      !ENV.googleAdsClientSecret ||
      !ENV.googleAdsDeveloperToken ||
      !ENV.googleAdsRefreshToken
    ) {
      throw new Error("Google Ads API credentials not configured");
    }

    client = new GoogleAdsApi({
      client_id: ENV.googleAdsClientId,
      client_secret: ENV.googleAdsClientSecret,
      developer_token: ENV.googleAdsDeveloperToken,
    });
  }
  return client;
}

function getCustomer() {
  const api = getClient();
  return api.Customer({
    customer_id: ENV.googleAdsCustomerId || "",
    login_customer_id: ENV.googleAdsLoginCustomerId || ENV.googleAdsCustomerId || "",
    refresh_token: ENV.googleAdsRefreshToken || "",
  });
}

// Types for campaign data
export interface CampaignMetrics {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
}

export interface DailyMetrics {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface KeywordMetrics {
  id: string;
  keyword: string;
  adGroup: string;
  campaign: string;
  matchType: string;
  qualityScore: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpc: number;
  ctr: number;
}

// Fetch campaign performance data
export async function fetchCampaignMetrics(
  startDate: string,
  endDate: string
): Promise<CampaignMetrics[]> {
  try {
    const customer = getCustomer();

    const campaigns = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
    `);

    return campaigns.map((row: any) => ({
      id: row.campaign?.id?.toString() || "",
      name: row.campaign?.name || "Unknown",
      status: row.campaign?.status || "UNKNOWN",
      spend: (row.metrics?.cost_micros || 0) / 1_000_000,
      impressions: row.metrics?.impressions || 0,
      clicks: row.metrics?.clicks || 0,
      conversions: row.metrics?.conversions || 0,
      ctr: (row.metrics?.ctr || 0) * 100,
      cpc: (row.metrics?.average_cpc || 0) / 1_000_000,
      conversionRate:
        row.metrics?.clicks > 0
          ? ((row.metrics?.conversions || 0) / row.metrics.clicks) * 100
          : 0,
    }));
  } catch (error) {
    console.error("[GoogleAds] Error fetching campaign metrics:", error);
    throw error;
  }
}

// Fetch daily metrics for trend charts
export async function fetchDailyMetrics(
  startDate: string,
  endDate: string
): Promise<DailyMetrics[]> {
  try {
    const customer = getCustomer();

    const dailyData = await customer.query(`
      SELECT
        segments.date,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
      ORDER BY segments.date ASC
    `);

    // Aggregate by date
    const dateMap = new Map<string, DailyMetrics>();

    dailyData.forEach((row: any) => {
      const date = row.segments?.date || "";
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
        });
      }
      const existing = dateMap.get(date)!;
      existing.spend += (row.metrics?.cost_micros || 0) / 1_000_000;
      existing.impressions += row.metrics?.impressions || 0;
      existing.clicks += row.metrics?.clicks || 0;
      existing.conversions += row.metrics?.conversions || 0;
    });

    return Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  } catch (error) {
    console.error("[GoogleAds] Error fetching daily metrics:", error);
    throw error;
  }
}

// Fetch keyword performance data
export async function fetchKeywordMetrics(
  startDate: string,
  endDate: string
): Promise<KeywordMetrics[]> {
  try {
    const customer = getCustomer();

    const keywords = await customer.query(`
      SELECT
        ad_group_criterion.criterion_id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.quality_info.quality_score,
        ad_group.name,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.average_cpc,
        metrics.ctr
      FROM keyword_view
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
        AND ad_group.status != 'REMOVED'
      ORDER BY metrics.impressions DESC
      LIMIT 50
    `);

    return keywords.map((row: any) => ({
      id: row.ad_group_criterion?.criterion_id?.toString() || "",
      keyword: row.ad_group_criterion?.keyword?.text || "Unknown",
      adGroup: row.ad_group?.name || "Unknown",
      campaign: row.campaign?.name || "Unknown",
      matchType: row.ad_group_criterion?.keyword?.match_type || "UNKNOWN",
      qualityScore: row.ad_group_criterion?.quality_info?.quality_score || 0,
      impressions: row.metrics?.impressions || 0,
      clicks: row.metrics?.clicks || 0,
      conversions: row.metrics?.conversions || 0,
      cpc: (row.metrics?.average_cpc || 0) / 1_000_000,
      ctr: (row.metrics?.ctr || 0) * 100,
    }));
  } catch (error) {
    console.error("[GoogleAds] Error fetching keyword metrics:", error);
    throw error;
  }
}

// Top keywords per campaign interface
export interface TopKeywordByCampaign {
  campaignId: string;
  campaignName: string;
  keywords: {
    rank: number;
    keyword: string;
    matchType: string;
    clicks: number;
    impressions: number;
    ctr: number;
    cpc: number;
    conversions: number;
    conversionRate: number;
    spend: number;
  }[];
}

// Fetch top 10 keywords by clicks for each campaign
export async function fetchTopKeywordsByCampaign(
  startDate: string,
  endDate: string
): Promise<TopKeywordByCampaign[]> {
  try {
    const customer = getCustomer();

    const rows = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.cost_micros
      FROM keyword_view
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
        AND ad_group.status != 'REMOVED'
        AND ad_group_criterion.status != 'REMOVED'
        AND metrics.clicks > 0
      ORDER BY campaign.id ASC, metrics.clicks DESC
    `);

    // Group by campaign and take top 10 per campaign
    const campaignMap = new Map<string, TopKeywordByCampaign>();

    for (const row of rows as any[]) {
      const campaignId = row.campaign?.id?.toString() || "";
      const campaignName = row.campaign?.name || "Unknown";

      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, { campaignId, campaignName, keywords: [] });
      }

      const entry = campaignMap.get(campaignId)!;
      if (entry.keywords.length < 10) {
        const clicks = row.metrics?.clicks || 0;
        const impressions = row.metrics?.impressions || 0;
        const conversions = row.metrics?.conversions || 0;
        entry.keywords.push({
          rank: entry.keywords.length + 1,
          keyword: row.ad_group_criterion?.keyword?.text || "Unknown",
          matchType: row.ad_group_criterion?.keyword?.match_type || "UNKNOWN",
          clicks,
          impressions,
          ctr: (row.metrics?.ctr || 0) * 100,
          cpc: (row.metrics?.average_cpc || 0) / 1_000_000,
          conversions,
          conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
          spend: (row.metrics?.cost_micros || 0) / 1_000_000,
        });
      }
    }

    return Array.from(campaignMap.values()).filter(c => c.keywords.length > 0);
  } catch (error) {
    console.error("[GoogleAds] Error fetching top keywords by campaign:", error);
    throw error;
  }
}

// Test API connection
export async function testConnection(): Promise<{
  success: boolean;
  message: string;
  accountName?: string;
}> {
  try {
    const customer = getCustomer();

    const result = await customer.query(`
      SELECT customer.descriptive_name, customer.id
      FROM customer
      LIMIT 1
    `);

    if (result.length > 0) {
      return {
        success: true,
        message: "Successfully connected to Google Ads API",
        accountName: result[0].customer?.descriptive_name || "Unknown",
      };
    }

    return {
      success: false,
      message: "No customer data returned",
    };
  } catch (error: any) {
    console.error("[GoogleAds] Connection test failed:", error);
    return {
      success: false,
      message: error.message || "Failed to connect to Google Ads API",
    };
  }
}

// Conversion action data per event type
export interface ConversionActionMetrics {
  name: string;
  category: string;
  conversions: number;
  conversionValue: number;
  allConversions: number;
}

// Conversion data per campaign per day
export interface ConversionDailyMetrics {
  date: string;
  campaign: string;
  conversions: number;
  allConversions: number;
  conversionValue: number;
}

// Fetch conversion actions (event goals) with metrics
// Uses campaign + segments.conversion_action_name to get per-action metrics in a date range
export async function fetchConversionActions(
  startDate: string,
  endDate: string
): Promise<ConversionActionMetrics[]> {
  try {
    const customer = getCustomer();

    // First get all enabled conversion actions (name + category)
    const actionDefs = await customer.query(`
      SELECT
        conversion_action.name,
        conversion_action.category,
        conversion_action.status
      FROM conversion_action
      WHERE conversion_action.status = 'ENABLED'
    `);
    // Map category numeric enum to string label
    const CATEGORY_LABELS: Record<number, string> = {
      0: "UNSPECIFIED",
      1: "UNKNOWN",
      2: "DEFAULT",
      3: "PAGE_VIEW",
      4: "PURCHASE",
      5: "SIGNUP",
      6: "LEAD",
      7: "DOWNLOAD",
      8: "ADD_TO_CART",
      9: "BEGIN_CHECKOUT",
      10: "SUBSCRIBE_PAID",
      11: "PHONE_CALL_LEAD",
      12: "IMPORTED_LEAD",
      13: "SUBMIT_LEAD_FORM",
      14: "BOOK_APPOINTMENT",
      15: "REQUEST_QUOTE",
      16: "GET_DIRECTIONS",
      17: "OUTBOUND_CLICK",
      18: "CONTACT",
      19: "ENGAGEMENT",
      20: "STORE_VISIT",
      21: "STORE_SALE",
      22: "QUALIFIED_LEAD",
      23: "CONVERTED_LEAD",
    };
    const categoryMap = new Map<string, string>();
    actionDefs.forEach((row: any) => {
      if (row.conversion_action?.name) {
        const cat = row.conversion_action.category;
        const catStr = typeof cat === "number" ? (CATEGORY_LABELS[cat] || "UNSPECIFIED") : (cat || "UNSPECIFIED");
        categoryMap.set(row.conversion_action.name, catStr);
      }
    });

    // Then get metrics segmented by conversion_action_name within date range
    const rows = await customer.query(`
      SELECT
        segments.conversion_action_name,
        metrics.conversions,
        metrics.conversions_value,
        metrics.all_conversions
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.conversions DESC
    `);

    // Aggregate by conversion action name
    const actionMap = new Map<string, ConversionActionMetrics>();
    rows.forEach((row: any) => {
      const name = row.segments?.conversion_action_name;
      if (!name) return;
      const category = categoryMap.get(name) || "UNSPECIFIED";
      if (!actionMap.has(name)) {
        actionMap.set(name, { name, category, conversions: 0, conversionValue: 0, allConversions: 0 });
      }
      const existing = actionMap.get(name)!;
      existing.conversions += row.metrics?.conversions || 0;
      existing.conversionValue += row.metrics?.conversions_value || 0;
      existing.allConversions += row.metrics?.all_conversions || 0;
    });

    return Array.from(actionMap.values())
      .filter(a => a.allConversions > 0)
      .sort((a, b) => b.allConversions - a.allConversions);
  } catch (error) {
    console.error("[GoogleAds] Error fetching conversion actions:", error);
    throw error;
  }
}

// Fetch daily conversion breakdown by campaign
export async function fetchConversionDailyMetrics(
  startDate: string,
  endDate: string
): Promise<ConversionDailyMetrics[]> {
  try {
    const customer = getCustomer();

    const rows = await customer.query(`
      SELECT
        segments.date,
        campaign.name,
        metrics.conversions,
        metrics.all_conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
      ORDER BY segments.date ASC
    `);

    return rows.map((row: any) => ({
      date: row.segments?.date || "",
      campaign: row.campaign?.name || "Unknown",
      conversions: row.metrics?.conversions || 0,
      allConversions: row.metrics?.all_conversions || 0,
      conversionValue: row.metrics?.conversions_value || 0,
    })).filter((r: ConversionDailyMetrics) => r.date !== "");
  } catch (error) {
    console.error("[GoogleAds] Error fetching conversion daily metrics:", error);
    throw error;
  }
}

// Account balance interface
export interface AccountBalance {
  accountName: string;
  currencyCode: string;
  approvedSpendingLimit: number;   // THB
  amountServed: number;            // THB (total spent against this budget)
  remainingBalance: number;        // THB (approvedLimit - amountServed + adjustments)
  hasUnlimitedBudget: boolean;
  asOf: string;                    // ISO date string
}

// Fetch account balance from Google Ads
export async function fetchAccountBalance(): Promise<AccountBalance> {
  try {
    const customer = getCustomer();

    // Get customer info (name + currency)
    const customerRows = await customer.query(`
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code
      FROM customer
      LIMIT 1
    `);
    const customerInfo = customerRows[0]?.customer as any;

    // Get account budget (most recent active or approved)
    const budgetRows = await customer.query(`
      SELECT
        account_budget.id,
        account_budget.status,
        account_budget.approved_spending_limit_micros,
        account_budget.approved_spending_limit_type,
        account_budget.amount_served_micros,
        account_budget.total_adjustments_micros
      FROM account_budget
      ORDER BY account_budget.id DESC
      LIMIT 5
    `);

    // Pick the most relevant budget (status 2 = APPROVED, 3 = CANCELLED but use latest)
    const budget = (budgetRows[0]?.account_budget as any);

    const MICROS = 1_000_000;
    const approvedLimit = budget?.approved_spending_limit_micros
      ? Number(budget.approved_spending_limit_micros) / MICROS
      : 0;
    const amountServed = budget?.amount_served_micros
      ? Number(budget.amount_served_micros) / MICROS
      : 0;
    const adjustments = budget?.total_adjustments_micros
      ? Number(budget.total_adjustments_micros) / MICROS
      : 0;

    // approved_spending_limit_type 2 = INFINITE (unlimited budget)
    const isUnlimited = budget?.approved_spending_limit_type === 2;
    const remaining = isUnlimited ? Infinity : Math.max(0, approvedLimit + adjustments - amountServed);

    return {
      accountName: customerInfo?.descriptive_name || "Barberford",
      currencyCode: customerInfo?.currency_code || "THB",
      approvedSpendingLimit: approvedLimit,
      amountServed,
      remainingBalance: isUnlimited ? -1 : remaining,
      hasUnlimitedBudget: isUnlimited,
      asOf: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[GoogleAds] Error fetching account balance:", error);
    throw error;
  }
}

// Check if API is configured
export function isConfigured(): boolean {
  return !!(
    ENV.googleAdsClientId &&
    ENV.googleAdsClientSecret &&
    ENV.googleAdsDeveloperToken &&
    ENV.googleAdsRefreshToken &&
    ENV.googleAdsCustomerId
  );
}

// ─── Device Performance ───────────────────────────────────────────────────────
export interface DeviceMetrics {
  device: string; // "MOBILE" | "DESKTOP" | "TABLET"
  clicks: number;
  impressions: number;
  conversions: number;
  spend: number;
  ctr: number;
  conversionRate: number;
  cpa: number;
}

export async function fetchDevicePerformance(startDate: string, endDate: string): Promise<DeviceMetrics[]> {
  const customer = getCustomer();
  const rows = await customer.query(`
    SELECT
      segments.device,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions,
      metrics.cost_micros,
      metrics.ctr
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
  `);
  const deviceMap: Record<string, DeviceMetrics> = {};
  const deviceNames: Record<number, string> = { 2: "MOBILE", 3: "TABLET", 4: "DESKTOP" };
  for (const row of rows) {
    const deviceNum = row.segments?.device as number;
    const device = deviceNames[deviceNum] || `DEVICE_${deviceNum}`;
    if (!deviceMap[device]) {
      deviceMap[device] = { device, clicks: 0, impressions: 0, conversions: 0, spend: 0, ctr: 0, conversionRate: 0, cpa: 0 };
    }
    deviceMap[device].clicks += row.metrics?.clicks || 0;
    deviceMap[device].impressions += row.metrics?.impressions || 0;
    deviceMap[device].conversions += row.metrics?.conversions || 0;
    deviceMap[device].spend += (row.metrics?.cost_micros || 0) / 1e6;
  }
  return Object.values(deviceMap).map(d => ({
    ...d,
    spend: parseFloat(d.spend.toFixed(2)),
    ctr: d.impressions > 0 ? parseFloat(((d.clicks / d.impressions) * 100).toFixed(2)) : 0,
    conversionRate: d.clicks > 0 ? parseFloat(((d.conversions / d.clicks) * 100).toFixed(2)) : 0,
    cpa: d.conversions > 0 ? parseFloat((d.spend / d.conversions).toFixed(2)) : 0,
  })).sort((a, b) => b.clicks - a.clicks);
}

// ─── Search Terms ─────────────────────────────────────────────────────────────
export interface SearchTermMetrics {
  searchTerm: string;
  campaignName: string;
  clicks: number;
  impressions: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
}

export async function fetchSearchTerms(startDate: string, endDate: string, limit = 20): Promise<SearchTermMetrics[]> {
  const customer = getCustomer();
  const rows = await customer.query(`
    SELECT
      search_term_view.search_term,
      campaign.name,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions,
      metrics.cost_micros,
      metrics.ctr
    FROM search_term_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY metrics.clicks DESC
    LIMIT ${limit}
  `);
  return rows.map(row => {
    const spend = (row.metrics?.cost_micros || 0) / 1e6;
    const clicks = row.metrics?.clicks || 0;
    return {
      searchTerm: row.search_term_view?.search_term || "",
      campaignName: row.campaign?.name || "",
      clicks,
      impressions: row.metrics?.impressions || 0,
      conversions: parseFloat((row.metrics?.conversions || 0).toFixed(2)),
      spend: parseFloat(spend.toFixed(2)),
      ctr: parseFloat(((row.metrics?.ctr || 0) * 100).toFixed(2)),
      cpc: clicks > 0 ? parseFloat((spend / clicks).toFixed(2)) : 0,
    };
  });
}

// ─── Ad Copy Performance ──────────────────────────────────────────────────────
export interface AdCopyMetrics {
  adId: string;
  headlines: string;
  campaignName: string;
  finalUrl: string;
  clicks: number;
  impressions: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
}

export async function fetchAdCopyPerformance(startDate: string, endDate: string): Promise<AdCopyMetrics[]> {
  const customer = getCustomer();
  const rows = await customer.query(`
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.responsive_search_ad.headlines,
      ad_group_ad.ad.expanded_text_ad.headline_part1,
      ad_group_ad.ad.expanded_text_ad.headline_part2,
      ad_group_ad.ad.final_urls,
      campaign.name,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions,
      metrics.ctr,
      metrics.cost_micros
    FROM ad_group_ad
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    AND ad_group_ad.status = 'ENABLED'
    ORDER BY metrics.clicks DESC
    LIMIT 20
  `);
  return rows.map(row => {
    const rsaHeadlines = row.ad_group_ad?.ad?.responsive_search_ad?.headlines;
    const headlines = rsaHeadlines && rsaHeadlines.length > 0
      ? rsaHeadlines.slice(0, 3).map((h: any) => h.text).filter(Boolean).join(" | ")
      : [row.ad_group_ad?.ad?.expanded_text_ad?.headline_part1, row.ad_group_ad?.ad?.expanded_text_ad?.headline_part2].filter(Boolean).join(" | ") || "Ad";
    const spend = (row.metrics?.cost_micros || 0) / 1e6;
    const clicks = row.metrics?.clicks || 0;
    const conversions = row.metrics?.conversions || 0;
    return {
      adId: String(row.ad_group_ad?.ad?.id || ""),
      headlines,
      campaignName: row.campaign?.name || "",
      finalUrl: (row.ad_group_ad?.ad?.final_urls || [])[0] || "",
      clicks,
      impressions: row.metrics?.impressions || 0,
      conversions: parseFloat(conversions.toFixed(2)),
      spend: parseFloat(spend.toFixed(2)),
      ctr: parseFloat(((row.metrics?.ctr || 0) * 100).toFixed(2)),
      cpc: clicks > 0 ? parseFloat((spend / clicks).toFixed(2)) : 0,
      conversionRate: clicks > 0 ? parseFloat(((conversions / clicks) * 100).toFixed(2)) : 0,
    };
  });
}

// ─── Impression Share ─────────────────────────────────────────────────────────
export interface ImpressionShareMetrics {
  campaignId: string;
  campaignName: string;
  impressionShare: number;
  budgetLostIS: number;
  rankLostIS: number;
  clicks: number;
  spend: number;
}

export async function fetchImpressionShare(startDate: string, endDate: string): Promise<ImpressionShareMetrics[]> {
  const customer = getCustomer();
  const rows = await customer.query(`
    SELECT
      campaign.id,
      campaign.name,
      metrics.search_impression_share,
      metrics.search_budget_lost_impression_share,
      metrics.search_rank_lost_impression_share,
      metrics.clicks,
      metrics.cost_micros
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    AND campaign.status = 'ENABLED'
    ORDER BY metrics.search_impression_share DESC
  `);
  // Aggregate by campaign
  const map: Record<string, ImpressionShareMetrics> = {};
  for (const row of rows) {
    const id = String(row.campaign?.id || "");
    if (!map[id]) {
      map[id] = {
        campaignId: id,
        campaignName: row.campaign?.name || "",
        impressionShare: 0,
        budgetLostIS: 0,
        rankLostIS: 0,
        clicks: 0,
        spend: 0,
      };
    }
    // IS fields are averages — take max across days as approximation
    map[id].impressionShare = Math.max(map[id].impressionShare, parseFloat(((row.metrics?.search_impression_share || 0) * 100).toFixed(1)));
    map[id].budgetLostIS = Math.max(map[id].budgetLostIS, parseFloat(((row.metrics?.search_budget_lost_impression_share || 0) * 100).toFixed(1)));
    map[id].rankLostIS = Math.max(map[id].rankLostIS, parseFloat(((row.metrics?.search_rank_lost_impression_share || 0) * 100).toFixed(1)));
    map[id].clicks += row.metrics?.clicks || 0;
    map[id].spend += (row.metrics?.cost_micros || 0) / 1e6;
  }
  return Object.values(map).map(c => ({ ...c, spend: parseFloat(c.spend.toFixed(2)) }))
    .sort((a, b) => b.impressionShare - a.impressionShare);
}

// ─── 14-Day Report: Per-Campaign Daily Breakdown ─────────────────────────────
export interface CampaignDailyRow {
  date: string;
  campaignName: string;
  branch: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  cpa: number;
}

export interface CampaignDailyConvAction {
  date: string;
  campaignName: string;
  branch: string;
  actionName: string;
  conversions: number;
}

function getBranchFromCampaign(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("noir") || n.includes("siam")) return "Noir Siam";
  if (n.includes("thonglor")) return "Thonglor";
  if (n.includes("erawan")) return "Erawan";
  if (n.includes("bbs") || n.includes("barbersmith")) return "Barbersmith";
  return "Other";
}

export async function fetchCampaignDailyReport(
  startDate: string,
  endDate: string
): Promise<{ daily: CampaignDailyRow[]; convActions: CampaignDailyConvAction[] }> {
  const customer = getCustomer();

  const [dailyRows, convRows] = await Promise.all([
    customer.query(`
      SELECT
        campaign.name,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
        AND metrics.impressions > 0
      ORDER BY segments.date ASC, campaign.name ASC
    `),
    customer.query(`
      SELECT
        campaign.name,
        segments.date,
        segments.conversion_action_name,
        metrics.conversions
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
        AND metrics.conversions > 0
      ORDER BY segments.date ASC, campaign.name ASC
    `),
  ]);

  // Aggregate daily rows by campaign + date
  const dailyMap = new Map<string, CampaignDailyRow>();
  for (const row of dailyRows as any[]) {
    const key = `${row.segments?.date}||${row.campaign?.name}`;
    if (!dailyMap.has(key)) {
      const spend = (row.metrics?.cost_micros || 0) / 1e6;
      const conv = row.metrics?.conversions || 0;
      dailyMap.set(key, {
        date: row.segments?.date || "",
        campaignName: row.campaign?.name || "",
        branch: getBranchFromCampaign(row.campaign?.name || ""),
        impressions: row.metrics?.impressions || 0,
        clicks: row.metrics?.clicks || 0,
        spend: parseFloat(spend.toFixed(2)),
        conversions: parseFloat(conv.toFixed(2)),
        cpa: conv > 0 ? parseFloat((spend / conv).toFixed(2)) : 0,
      });
    } else {
      const existing = dailyMap.get(key)!;
      const addSpend = (row.metrics?.cost_micros || 0) / 1e6;
      const addConv = row.metrics?.conversions || 0;
      existing.impressions += row.metrics?.impressions || 0;
      existing.clicks += row.metrics?.clicks || 0;
      existing.spend = parseFloat((existing.spend + addSpend).toFixed(2));
      existing.conversions = parseFloat((existing.conversions + addConv).toFixed(2));
      existing.cpa = existing.conversions > 0 ? parseFloat((existing.spend / existing.conversions).toFixed(2)) : 0;
    }
  }

  const convActions: CampaignDailyConvAction[] = (convRows as any[])
    .filter(r => r.segments?.conversion_action_name && r.metrics?.conversions > 0)
    .map(r => ({
      date: r.segments?.date || "",
      campaignName: r.campaign?.name || "",
      branch: getBranchFromCampaign(r.campaign?.name || ""),
      actionName: r.segments?.conversion_action_name || "",
      conversions: parseFloat((r.metrics?.conversions || 0).toFixed(2)),
    }));

  return {
    daily: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date) || a.campaignName.localeCompare(b.campaignName)),
    convActions,
  };
}
