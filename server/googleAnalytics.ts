import { BetaAnalyticsDataClient } from "@google-analytics/data";

// Initialize the Analytics Data API client with service account credentials
let analyticsDataClient: BetaAnalyticsDataClient | null = null;

function getAnalyticsClient(): BetaAnalyticsDataClient {
  if (!analyticsDataClient) {
    const serviceAccountJson = process.env.GA4_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      throw new Error("GA4_SERVICE_ACCOUNT_JSON environment variable is not set");
    }

    try {
      const credentials = JSON.parse(serviceAccountJson);
      // Fix private key format - restore proper headers with spaces
      let privateKey = credentials.private_key;
      if (privateKey) {
        // Fix headers that may have been stored without spaces
        privateKey = privateKey
          .replace(/-----BEGINPRIVATEKEY-----/g, '-----BEGIN PRIVATE KEY-----')
          .replace(/-----ENDPRIVATEKEY-----/g, '-----END PRIVATE KEY-----');
      }
      analyticsDataClient = new BetaAnalyticsDataClient({
        credentials: {
          client_email: credentials.client_email,
          private_key: privateKey,
        },
        projectId: credentials.project_id,
      });
    } catch (error) {
      throw new Error(`Failed to parse GA4 service account credentials: ${error}`);
    }
  }
  return analyticsDataClient;
}

export interface AnalyticsOverview {
  totalUsers: number;
  newUsers: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  engagementRate: number;
}

export interface TrafficSource {
  source: string;
  medium: string;
  users: number;
  sessions: number;
  conversions: number;
}

export interface DailyMetric {
  date: string;
  users: number;
  sessions: number;
  pageViews: number;
  organicUsers: number;
  paidUsers: number;
}

export interface ChannelData {
  channel: string;
  users: number;
  sessions: number;
  conversions: number;
  bounceRate: number;
}

// Get overview metrics
export async function getAnalyticsOverview(
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<AnalyticsOverview> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    throw new Error("GA4_PROPERTY_ID environment variable is not set");
  }

  const client = getAnalyticsClient();

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: "totalUsers" },
      { name: "newUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" },
      { name: "engagementRate" },
    ],
  });

  const row = response.rows?.[0];
  if (!row || !row.metricValues) {
    return {
      totalUsers: 0,
      newUsers: 0,
      sessions: 0,
      pageViews: 0,
      bounceRate: 0,
      avgSessionDuration: 0,
      engagementRate: 0,
    };
  }

  return {
    totalUsers: parseInt(row.metricValues[0]?.value || "0"),
    newUsers: parseInt(row.metricValues[1]?.value || "0"),
    sessions: parseInt(row.metricValues[2]?.value || "0"),
    pageViews: parseInt(row.metricValues[3]?.value || "0"),
    bounceRate: parseFloat(row.metricValues[4]?.value || "0") * 100,
    avgSessionDuration: parseFloat(row.metricValues[5]?.value || "0"),
    engagementRate: parseFloat(row.metricValues[6]?.value || "0") * 100,
  };
}

// Get traffic sources breakdown
export async function getTrafficSources(
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<TrafficSource[]> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    throw new Error("GA4_PROPERTY_ID environment variable is not set");
  }

  const client = getAnalyticsClient();

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: "sessionSource" },
      { name: "sessionMedium" },
    ],
    metrics: [
      { name: "totalUsers" },
      { name: "sessions" },
      { name: "conversions" },
    ],
    orderBys: [
      { metric: { metricName: "totalUsers" }, desc: true },
    ],
    limit: 20,
  });

  if (!response.rows) {
    return [];
  }

  return response.rows.map((row) => ({
    source: row.dimensionValues?.[0]?.value || "(not set)",
    medium: row.dimensionValues?.[1]?.value || "(not set)",
    users: parseInt(row.metricValues?.[0]?.value || "0"),
    sessions: parseInt(row.metricValues?.[1]?.value || "0"),
    conversions: parseInt(row.metricValues?.[2]?.value || "0"),
  }));
}

// Get daily metrics for trend chart
export async function getDailyMetrics(
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<DailyMetric[]> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    throw new Error("GA4_PROPERTY_ID environment variable is not set");
  }

  const client = getAnalyticsClient();

  // Get overall daily metrics
  const [overallResponse] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "date" }],
    metrics: [
      { name: "totalUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
    ],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });

  // Get organic traffic daily
  const [organicResponse] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "totalUsers" }],
    dimensionFilter: {
      filter: {
        fieldName: "sessionDefaultChannelGroup",
        stringFilter: { value: "Organic Search" },
      },
    },
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });

  // Get paid traffic daily
  const [paidResponse] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "totalUsers" }],
    dimensionFilter: {
      filter: {
        fieldName: "sessionDefaultChannelGroup",
        stringFilter: { value: "Paid Search" },
      },
    },
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });

  // Create maps for organic and paid data
  const organicMap = new Map<string, number>();
  organicResponse.rows?.forEach((row) => {
    const date = row.dimensionValues?.[0]?.value || "";
    organicMap.set(date, parseInt(row.metricValues?.[0]?.value || "0"));
  });

  const paidMap = new Map<string, number>();
  paidResponse.rows?.forEach((row) => {
    const date = row.dimensionValues?.[0]?.value || "";
    paidMap.set(date, parseInt(row.metricValues?.[0]?.value || "0"));
  });

  // Combine all data
  if (!overallResponse.rows) {
    return [];
  }

  return overallResponse.rows.map((row) => {
    const date = row.dimensionValues?.[0]?.value || "";
    return {
      date: formatDate(date),
      users: parseInt(row.metricValues?.[0]?.value || "0"),
      sessions: parseInt(row.metricValues?.[1]?.value || "0"),
      pageViews: parseInt(row.metricValues?.[2]?.value || "0"),
      organicUsers: organicMap.get(date) || 0,
      paidUsers: paidMap.get(date) || 0,
    };
  });
}

// Get channel breakdown (Organic vs Paid vs Direct etc)
export async function getChannelBreakdown(
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<ChannelData[]> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    throw new Error("GA4_PROPERTY_ID environment variable is not set");
  }

  const client = getAnalyticsClient();

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: [
      { name: "totalUsers" },
      { name: "sessions" },
      { name: "conversions" },
      { name: "bounceRate" },
    ],
    orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
  });

  if (!response.rows) {
    return [];
  }

  return response.rows.map((row) => ({
    channel: row.dimensionValues?.[0]?.value || "(not set)",
    users: parseInt(row.metricValues?.[0]?.value || "0"),
    sessions: parseInt(row.metricValues?.[1]?.value || "0"),
    conversions: parseInt(row.metricValues?.[2]?.value || "0"),
    bounceRate: parseFloat(row.metricValues?.[3]?.value || "0") * 100,
  }));
}

// Test connection to GA4
export async function testConnection(): Promise<{ success: boolean; message: string; propertyId?: string }> {
  try {
    const propertyId = process.env.GA4_PROPERTY_ID;
    if (!propertyId) {
      return { success: false, message: "GA4_PROPERTY_ID not configured" };
    }

    const client = getAnalyticsClient();
    
    // Simple test query
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      metrics: [{ name: "totalUsers" }],
    });

    const users = response.rows?.[0]?.metricValues?.[0]?.value || "0";
    
    return {
      success: true,
      message: `Connected successfully. Total users (7 days): ${users}`,
      propertyId,
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Helper function to format date from YYYYMMDD to YYYY-MM-DD
function formatDate(dateStr: string): string {
  if (dateStr.length !== 8) return dateStr;
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}
