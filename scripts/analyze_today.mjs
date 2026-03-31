import { GoogleAdsApi } from "google-ads-api";
import dotenv from "dotenv";
import { readFileSync } from "fs";

// Load env
dotenv.config({ path: "/home/ubuntu/barberford_ads_dashboard/.env" });

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

// Bangkok date
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
console.log("Analyzing date:", today);

async function run() {
  // 1. Campaign summary today
  const campaigns = await customer.query(`
    SELECT
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc,
      metrics.search_impression_share,
      metrics.search_budget_lost_impression_share,
      metrics.search_rank_lost_impression_share
    FROM campaign
    WHERE segments.date = '${today}'
      AND campaign.status = 'ENABLED'
    ORDER BY metrics.cost_micros DESC
  `);

  console.log("\n=== CAMPAIGN SUMMARY TODAY ===");
  for (const c of campaigns) {
    const cost = (c.metrics.cost_micros / 1e6).toFixed(2);
    const cpa = c.metrics.conversions > 0 ? (c.metrics.cost_micros / 1e6 / c.metrics.conversions).toFixed(0) : "N/A";
    const is = c.metrics.search_impression_share ? (c.metrics.search_impression_share * 100).toFixed(1) : "N/A";
    const budgetLost = c.metrics.search_budget_lost_impression_share ? (c.metrics.search_budget_lost_impression_share * 100).toFixed(1) : "N/A";
    const rankLost = c.metrics.search_rank_lost_impression_share ? (c.metrics.search_rank_lost_impression_share * 100).toFixed(1) : "N/A";
    console.log(`${c.campaign.name}: Impr=${c.metrics.impressions} Clicks=${c.metrics.clicks} CTR=${(c.metrics.ctr*100).toFixed(1)}% Cost=฿${cost} Conv=${c.metrics.conversions} CPA=฿${cpa} IS=${is}% BudgetLost=${budgetLost}% RankLost=${rankLost}%`);
  }

  // 2. Keywords today — sorted by cost
  const keywords = await customer.query(`
    SELECT
      campaign.name,
      ad_group.name,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.quality_info.quality_score,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM keyword_view
    WHERE segments.date = '${today}'
      AND campaign.status = 'ENABLED'
      AND ad_group_criterion.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 30
  `);

  console.log("\n=== TOP KEYWORDS BY COST TODAY ===");
  for (const k of keywords) {
    const cost = (k.metrics.cost_micros / 1e6).toFixed(2);
    const cpc = (k.metrics.average_cpc / 1e6).toFixed(2);
    const qs = k.ad_group_criterion.quality_info?.quality_score || "N/A";
    console.log(`[${k.campaign.name.substring(0,20)}] "${k.ad_group_criterion.keyword.text}" (${k.ad_group_criterion.keyword.match_type}) QS=${qs} Impr=${k.metrics.impressions} Clicks=${k.metrics.clicks} CTR=${(k.metrics.ctr*100).toFixed(1)}% Cost=฿${cost} CPC=฿${cpc} Conv=${k.metrics.conversions}`);
  }

  // 3. Search terms today
  const searchTerms = await customer.query(`
    SELECT
      campaign.name,
      search_term_view.search_term,
      search_term_view.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr
    FROM search_term_view
    WHERE segments.date = '${today}'
      AND campaign.status = 'ENABLED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 40
  `);

  console.log("\n=== SEARCH TERMS TODAY (by cost) ===");
  for (const s of searchTerms) {
    const cost = (s.metrics.cost_micros / 1e6).toFixed(2);
    const status = s.search_term_view.status;
    console.log(`[${s.campaign.name.substring(0,20)}] "${s.search_term_view.search_term}" status=${status} Impr=${s.metrics.impressions} Clicks=${s.metrics.clicks} Cost=฿${cost} Conv=${s.metrics.conversions}`);
  }

  // 4. Ads performance today
  const ads = await customer.query(`
    SELECT
      campaign.name,
      ad_group.name,
      ad_group_ad.ad.responsive_search_ad.headlines,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      ad_group_ad.ad.final_urls
    FROM ad_group_ad
    WHERE segments.date = '${today}'
      AND campaign.status = 'ENABLED'
      AND ad_group_ad.status = 'ENABLED'
    ORDER BY metrics.impressions DESC
    LIMIT 20
  `);

  console.log("\n=== ADS PERFORMANCE TODAY ===");
  for (const a of ads) {
    const cost = (a.metrics.cost_micros / 1e6).toFixed(2);
    const headlines = a.ad_group_ad.ad.responsive_search_ad?.headlines?.slice(0,2).map(h => h.text).join(" | ") || "N/A";
    console.log(`[${a.campaign.name.substring(0,20)}] "${headlines}" Impr=${a.metrics.impressions} Clicks=${a.metrics.clicks} CTR=${(a.metrics.ctr*100).toFixed(1)}% Cost=฿${cost} Conv=${a.metrics.conversions}`);
  }
}

run().catch(console.error);
