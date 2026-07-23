import { GoogleAdsApi } from 'google-ads-api';
import dotenv from 'dotenv';
dotenv.config();

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

const TARGET_DATE = '2026-07-11';

function getBranch(name) {
  const n = name.toLowerCase();
  if (n.includes('noir') || n.includes('siam')) return 'Noir Siam';
  if (n.includes('thonglor')) return 'Thonglor';
  if (n.includes('erawan')) return 'Erawan';
  if (n.includes('bbs') || n.includes('barbersmith')) return 'Barbersmith';
  return 'Other';
}

function getCampaignType(t) {
  if (t === 10 || t === 'PERFORMANCE_MAX') return 'PMax';
  if (t === 2 || t === 'SEARCH') return 'Search';
  return 'Other';
}

async function run() {
  const rows = await customer.query(`
    SELECT
      campaign.id,
      campaign.name,
      campaign.advertising_channel_type,
      campaign_budget.amount_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.all_conversions,
      metrics.ctr,
      metrics.average_cpc,
      metrics.search_impression_share,
      metrics.search_budget_lost_impression_share,
      metrics.search_rank_lost_impression_share
    FROM campaign
    WHERE segments.date = '${TARGET_DATE}'
      AND campaign.status = 'ENABLED'
    ORDER BY metrics.cost_micros DESC
  `);

  console.log('═'.repeat(80));
  console.log(`  วิเคราะห์ Campaign Performance — วันที่ 11 กรกฎาคม 2026 (วันเสาร์)`);
  console.log('═'.repeat(80));

  let totalImp = 0, totalClk = 0, totalCost = 0, totalConv = 0, totalAllConv = 0;
  const branchSummary = {};
  const campaignRows = [];

  for (const r of rows) {
    const branch = getBranch(r.campaign.name);
    const type = getCampaignType(r.campaign.advertising_channel_type);
    const imp = r.metrics.impressions;
    const clk = r.metrics.clicks;
    const cost = r.metrics.cost_micros / 1e6;
    const conv = r.metrics.conversions;
    const allConv = r.metrics.all_conversions;
    const budget = r.campaign_budget?.amount_micros ? r.campaign_budget.amount_micros / 1e6 : null;
    const ctr = imp > 0 ? clk / imp * 100 : 0;
    const cpa = conv > 0 ? cost / conv : null;
    const cpc = r.metrics.average_cpc ? r.metrics.average_cpc / 1e6 : null;
    const is = r.metrics.search_impression_share;
    const isLostBudget = r.metrics.search_budget_lost_impression_share;
    const isLostRank = r.metrics.search_rank_lost_impression_share;
    const budgetPct = budget ? (cost / budget * 100) : null;

    totalImp += imp; totalClk += clk; totalCost += cost; totalConv += conv; totalAllConv += allConv;

    if (!branchSummary[branch]) branchSummary[branch] = { imp: 0, clk: 0, cost: 0, conv: 0, allConv: 0 };
    branchSummary[branch].imp += imp;
    branchSummary[branch].clk += clk;
    branchSummary[branch].cost += cost;
    branchSummary[branch].conv += conv;
    branchSummary[branch].allConv += allConv;

    campaignRows.push({ name: r.campaign.name, branch, type, imp, clk, cost, conv, allConv, budget, ctr, cpa, cpc, is, isLostBudget, isLostRank, budgetPct });
  }

  console.log(`\n  📊 ภาพรวมทั้งหมด`);
  console.log(`     Impressions : ${totalImp.toLocaleString()}`);
  console.log(`     Clicks      : ${totalClk.toLocaleString()}`);
  console.log(`     CTR         : ${totalImp > 0 ? (totalClk/totalImp*100).toFixed(2) : 0}%`);
  console.log(`     Spend       : ฿${totalCost.toFixed(0)}`);
  console.log(`     Conversions : ${totalConv.toFixed(1)}`);
  console.log(`     All Conv    : ${totalAllConv.toFixed(1)}`);
  console.log(`     CPA         : ${totalConv > 0 ? '฿'+(totalCost/totalConv).toFixed(0) : '—'}`);

  console.log(`\n  📍 สรุปแยกสาขา`);
  console.log(`  ${'สาขา'.padEnd(14)} ${'Imp'.padEnd(8)} ${'Clk'.padEnd(7)} ${'CTR'.padEnd(7)} ${'Spend'.padEnd(10)} ${'Conv'.padEnd(8)} ${'AllConv'.padEnd(10)} ${'CPA'}`);
  console.log(`  ${'-'.repeat(72)}`);
  for (const [b, d] of Object.entries(branchSummary)) {
    const ctr = d.imp > 0 ? (d.clk/d.imp*100).toFixed(1)+'%' : '0%';
    const cpa = d.conv > 0 ? '฿'+(d.cost/d.conv).toFixed(0) : '—';
    console.log(`  ${b.padEnd(14)} ${String(d.imp).padEnd(8)} ${String(d.clk).padEnd(7)} ${ctr.padEnd(7)} ฿${d.cost.toFixed(0).padEnd(9)} ${d.conv.toFixed(1).padEnd(8)} ${d.allConv.toFixed(1).padEnd(10)} ${cpa}`);
  }

  console.log(`\n  📋 รายละเอียดแต่ละ Campaign`);
  const branches = ['Erawan', 'Thonglor', 'Noir Siam', 'Barbersmith', 'Other'];
  for (const branch of branches) {
    const bRows = campaignRows.filter(r => r.branch === branch);
    if (bRows.length === 0) continue;
    console.log(`\n  📍 ${branch}`);
    for (const r of bRows) {
      const budgetStr = r.budget ? `฿${r.budget.toFixed(0)}` : '—';
      const budgetPctStr = r.budgetPct ? `${r.budgetPct.toFixed(0)}%` : '—';
      const budgetAlert = r.budgetPct && r.budgetPct > 100 ? ' 🔴 OVER' : r.budgetPct && r.budgetPct > 90 ? ' 🟡 Near cap' : '';
      const cpaStr = r.cpa ? `฿${r.cpa.toFixed(0)}` : '—';
      console.log(`    [${r.type}] ${r.name}`);
      console.log(`      Imp: ${r.imp.toLocaleString()} | Clk: ${r.clk} | CTR: ${r.ctr.toFixed(2)}%`);
      console.log(`      Spend: ฿${r.cost.toFixed(0)} / Budget: ${budgetStr} (${budgetPctStr})${budgetAlert}`);
      console.log(`      Conv: ${r.conv.toFixed(1)} | CPA: ${cpaStr}`);
    }
  }
}

run().catch(err => { console.error('ERROR:', err.message || err); process.exit(1); });
