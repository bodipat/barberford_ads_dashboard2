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
