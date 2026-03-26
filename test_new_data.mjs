import { GoogleAdsApi } from "google-ads-api";

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

const customer = client.Customer({
  customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
  login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
});

const startDate = "2025-12-17";
const endDate = "2026-03-26";

// Test 1: Device performance
console.log("=== DEVICE PERFORMANCE ===");
try {
  const deviceRows = await customer.query(`
    SELECT
      segments.device,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions,
      metrics.cost_micros,
      metrics.ctr
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY metrics.clicks DESC
    LIMIT 10
  `);
  const deviceMap = {};
  for (const row of deviceRows) {
    const device = row.segments.device;
    if (!deviceMap[device]) deviceMap[device] = { clicks: 0, impressions: 0, conversions: 0, spend: 0 };
    deviceMap[device].clicks += row.metrics.clicks || 0;
    deviceMap[device].impressions += row.metrics.impressions || 0;
    deviceMap[device].conversions += row.metrics.conversions || 0;
    deviceMap[device].spend += (row.metrics.cost_micros || 0) / 1e6;
  }
  console.log(JSON.stringify(deviceMap, null, 2));
} catch (e) { console.log("Device error:", e.message); }

// Test 2: Search terms (top 5)
console.log("\n=== SEARCH TERMS ===");
try {
  const stRows = await customer.query(`
    SELECT
      search_term_view.search_term,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions,
      metrics.cost_micros,
      metrics.ctr,
      campaign.name
    FROM search_term_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY metrics.clicks DESC
    LIMIT 5
  `);
  for (const row of stRows) {
    console.log(`"${row.search_term_view.search_term}" | clicks:${row.metrics.clicks} | conv:${row.metrics.conversions} | campaign:${row.campaign.name}`);
  }
} catch (e) { console.log("Search terms error:", e.message); }

// Test 3: Location performance
console.log("\n=== LOCATION PERFORMANCE ===");
try {
  const locRows = await customer.query(`
    SELECT
      geographic_view.country_criterion_id,
      geographic_view.location_type,
      segments.geo_target_city,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions,
      metrics.cost_micros
    FROM geographic_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY metrics.clicks DESC
    LIMIT 5
  `);
  for (const row of locRows) {
    console.log(`city:${row.segments?.geo_target_city} | clicks:${row.metrics.clicks} | conv:${row.metrics.conversions}`);
  }
} catch (e) { console.log("Location error:", e.message); }

// Test 4: Ad copy performance
console.log("\n=== AD COPY PERFORMANCE ===");
try {
  const adRows = await customer.query(`
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.responsive_search_ad.headlines,
      ad_group_ad.ad.final_urls,
      ad_group_ad.status,
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
    LIMIT 5
  `);
  for (const row of adRows) {
    const headlines = row.ad_group_ad?.ad?.responsive_search_ad?.headlines?.slice(0,2).map(h => h.text).join(' | ') || 'N/A';
    console.log(`"${headlines}" | clicks:${row.metrics.clicks} | ctr:${(row.metrics.ctr*100).toFixed(2)}% | conv:${row.metrics.conversions} | campaign:${row.campaign.name}`);
  }
} catch (e) { console.log("Ad copy error:", e.message); }

// Test 5: Impression share
console.log("\n=== IMPRESSION SHARE ===");
try {
  const isRows = await customer.query(`
    SELECT
      campaign.name,
      campaign.id,
      metrics.search_impression_share,
      metrics.search_budget_lost_impression_share,
      metrics.search_rank_lost_impression_share
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY metrics.search_impression_share DESC
    LIMIT 5
  `);
  for (const row of isRows) {
    const is = ((row.metrics.search_impression_share || 0) * 100).toFixed(1);
    const budgetLost = ((row.metrics.search_budget_lost_impression_share || 0) * 100).toFixed(1);
    const rankLost = ((row.metrics.search_rank_lost_impression_share || 0) * 100).toFixed(1);
    console.log(`${row.campaign.name} | IS:${is}% | BudgetLost:${budgetLost}% | RankLost:${rankLost}%`);
  }
} catch (e) { console.log("IS error:", e.message); }

