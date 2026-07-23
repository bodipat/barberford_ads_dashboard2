import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart2, RefreshCw, TrendingUp, DollarSign, Target, MousePointerClick,
  ChevronDown, ChevronUp,
} from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Legend, Tooltip as RechartsTooltip,
} from "recharts";

// ─── Theme Colors ──────────────────────────────────────────────────────────────
const C = {
  gold: "oklch(0.78 0.12 85)",
  teal: "oklch(0.65 0.15 165)",
  blue: "oklch(0.55 0.15 250)",
  orange: "oklch(0.7 0.15 45)",
  success: "oklch(0.7 0.18 145)",
  danger: "oklch(0.65 0.2 25)",
  purple: "oklch(0.6 0.18 290)",
};

const BRANCH_COLORS: Record<string, string> = {
  Barbersmith: C.teal,
  Thonglor: C.gold,
  "Noir Siam": C.purple,
  Erawan: C.orange,
};

const DAY_TH: Record<string, string> = {
  "0": "อา", "1": "จ", "2": "อ", "3": "พ", "4": "พฤ", "5": "ศ", "6": "ส",
};

function fmt(val: number, type: "currency" | "number" | "percent") {
  if (type === "currency") return `฿${val.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
  if (type === "percent") return `${val.toFixed(2)}%`;
  return val.toLocaleString();
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = DAY_TH[String(d.getUTCDay())];
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1} (${day})`;
}

function shortCampaignName(name: string) {
  if (name.includes("Barbersmith - Search") || name.includes("Barbersmith-Search")) return "BBS Search";
  if (name.includes("PMax-BBS")) return "PMax-BBS";
  if (name.includes("PMax-BBF-Thonglor")) return "PMax-Thonglor";
  if (name.toLowerCase().includes("thonglor")) return "Search-Thonglor";
  if (name.includes("PMax-BBF-Noir")) return "PMax-Noir";
  if (name.toLowerCase().includes("siam") || name.toLowerCase().includes("noir")) return "Search-Noir";
  if (name.includes("PMax-BBF-Erawan")) return "PMax-Erawan";
  if (name.toLowerCase().includes("erawan")) return "Search-Erawan";
  return name.length > 20 ? name.substring(0, 20) + "…" : name;
}

function shortActionName(name: string) {
  return name
    .replace(/^TechSol - /, "")
    .replace(/^Local actions - /, "")
    .replace(/ \d{4,}$/, "")
    .replace(/-Erawan$/, "")
    .replace(/-Noir$/, "")
    .replace(/-Thonglor$/, "")
    .replace(/-BBS$/, "")
    .trim();
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs max-w-[220px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="flex justify-between gap-3">
          <span>{p.name}:</span>
          <span className="font-medium">
            {p.name.includes("฿") || p.name.toLowerCase().includes("spend")
              ? fmt(p.value, "currency")
              : p.value?.toLocaleString()}
          </span>
        </p>
      ))}
    </div>
  );
}

// ─── Campaign Chart Card ───────────────────────────────────────────────────────
function CampaignChartCard({
  campaignName,
  branch,
  chartData,
  totalSpend,
  totalConv,
  totalClicks,
}: {
  campaignName: string;
  branch: string;
  chartData: { date: string; spend: number; conversions: number; clicks: number; cpa: number }[];
  totalSpend: number;
  totalConv: number;
  totalClicks: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const branchColor = BRANCH_COLORS[branch] || C.blue;
  const cpa = totalConv > 0 ? totalSpend / totalConv : 0;

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/10 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: branchColor }} />
          <div>
            <p className="font-semibold text-foreground text-sm">{shortCampaignName(campaignName)}</p>
            <p className="text-xs text-muted-foreground">{branch}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex gap-4 text-right">
            <div>
              <p className="text-xs text-muted-foreground">Spend</p>
              <p className="text-sm font-bold" style={{ color: C.gold }}>{fmt(totalSpend, "currency")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conv</p>
              <p className="text-sm font-bold" style={{ color: C.teal }}>{totalConv.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clicks</p>
              <p className="text-sm font-bold text-foreground">{totalClicks.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CPA</p>
              <p className="text-sm font-bold" style={{ color: cpa > 200 ? C.danger : cpa > 80 ? C.orange : C.success }}>
                {cpa > 0 ? fmt(cpa, "currency") : "—"}
              </p>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Mobile KPIs */}
      <div className="sm:hidden flex gap-3 px-4 pb-3 text-center">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Spend</p>
          <p className="text-sm font-bold" style={{ color: C.gold }}>{fmt(totalSpend, "currency")}</p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Conv</p>
          <p className="text-sm font-bold" style={{ color: C.teal }}>{totalConv.toFixed(1)}</p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">CPA</p>
          <p className="text-sm font-bold" style={{ color: cpa > 200 ? C.danger : cpa > 80 ? C.orange : C.success }}>
            {cpa > 0 ? fmt(cpa, "currency") : "—"}
          </p>
        </div>
      </div>

      {/* Chart */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/30 pt-4">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 285)" />
                <XAxis dataKey="date" stroke="oklch(0.55 0.015 285)" fontSize={10} tickFormatter={formatDate} />
                <YAxis yAxisId="left" stroke="oklch(0.55 0.015 285)" fontSize={10}
                  tickFormatter={(v) => `฿${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                <YAxis yAxisId="right" orientation="right" stroke="oklch(0.55 0.015 285)" fontSize={10} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar yAxisId="left" dataKey="spend" name="Spend (฿)" fill={C.gold} opacity={0.8} radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="conversions" name="Conversions"
                  stroke={C.teal} strokeWidth={2.5} dot={{ r: 3, fill: C.teal }} activeDot={{ r: 5 }} />
                <Line yAxisId="right" type="monotone" dataKey="clicks" name="Clicks"
                  stroke={C.blue} strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CampaignReport() {
  const [days, setDays] = useState(14);
  const [activeBranch, setActiveBranch] = useState<string>("all");

  const { data, isLoading, refetch } = trpc.dashboard.getCampaignDailyReport.useQuery(
    { days },
    { refetchOnWindowFocus: false }
  );

  const branches = ["all", "Barbersmith", "Thonglor", "Noir Siam", "Erawan"];

  // Build per-campaign chart data
  const campaignChartData = useMemo(() => {
    if (!data?.daily) return {};
    const map: Record<string, { date: string; spend: number; conversions: number; clicks: number; cpa: number }[]> = {};
    for (const row of data.daily) {
      if (!map[row.campaignName]) map[row.campaignName] = [];
      map[row.campaignName].push({
        date: row.date,
        spend: row.spend,
        conversions: row.conversions,
        clicks: row.clicks,
        cpa: row.cpa,
      });
    }
    return map;
  }, [data]);

  // Aggregate totals per campaign
  const campaignTotals = useMemo(() => {
    if (!data?.daily) return {};
    const totals: Record<string, { spend: number; conversions: number; clicks: number; branch: string }> = {};
    for (const row of data.daily) {
      if (!totals[row.campaignName]) totals[row.campaignName] = { spend: 0, conversions: 0, clicks: 0, branch: row.branch };
      totals[row.campaignName].spend += row.spend;
      totals[row.campaignName].conversions += row.conversions;
      totals[row.campaignName].clicks += row.clicks;
    }
    return totals;
  }, [data]);

  // Conversion action summary per branch
  const convActionSummary = useMemo(() => {
    if (!data?.convActions) return {};
    const map: Record<string, Record<string, number>> = {};
    for (const row of data.convActions) {
      const branch = row.branch;
      const action = shortActionName(row.actionName);
      if (!map[branch]) map[branch] = {};
      map[branch][action] = (map[branch][action] || 0) + row.conversions;
    }
    return map;
  }, [data]);

  // Grand totals
  const grandTotals = useMemo(() => {
    const totals = Object.values(campaignTotals);
    const spend = totals.reduce((s, t) => s + t.spend, 0);
    const conv = totals.reduce((s, t) => s + t.conversions, 0);
    const clicks = totals.reduce((s, t) => s + t.clicks, 0);
    return { spend, conv, clicks, cpa: conv > 0 ? spend / conv : 0 };
  }, [campaignTotals]);

  // Filter campaigns by branch
  const filteredCampaigns = useMemo(() => {
    return Object.entries(campaignTotals)
      .filter(([, t]) => activeBranch === "all" || t.branch === activeBranch)
      .sort((a, b) => b[1].spend - a[1].spend);
  }, [campaignTotals, activeBranch]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Campaign Performance Report</h1>
            <p className="text-xs text-muted-foreground">
              {data?.startDate && data?.endDate
                ? `${data.startDate} ถึง ${data.endDate}`
                : `ย้อนหลัง ${days} วัน`}
              {data?.dataSource === "live" && (
                <Badge variant="outline" className="ml-2 text-green-400 border-green-400/30 text-[10px]">Live</Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[120px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 วัน</SelectItem>
              <SelectItem value="14">14 วัน</SelectItem>
              <SelectItem value="30">30 วัน</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => refetch()}
            className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted/20 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Grand Total KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Spend", value: fmt(grandTotals.spend, "currency"), icon: DollarSign, color: C.gold },
          { label: "Conversions", value: grandTotals.conv.toFixed(1), icon: Target, color: C.teal },
          { label: "Total Clicks", value: grandTotals.clicks.toLocaleString(), icon: MousePointerClick, color: C.blue },
          { label: "Avg CPA", value: grandTotals.cpa > 0 ? fmt(grandTotals.cpa, "currency") : "—", icon: TrendingUp, color: grandTotals.cpa > 200 ? C.danger : grandTotals.cpa > 80 ? C.orange : C.success },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card rounded-xl border border-border/50 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{kpi.label}</p>
              <kpi.icon className="w-4 h-4 text-muted-foreground/50" />
            </div>
            <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Branch Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {branches.map((b) => (
          <button
            key={b}
            onClick={() => setActiveBranch(b)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeBranch === b
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {b === "all" ? "ทุกสาขา" : b}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">กำลังโหลดข้อมูล...</span>
        </div>
      )}

      {/* Campaign Charts */}
      {!isLoading && filteredCampaigns.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            กราฟ Spend vs Conversions รายวัน — แยกแต่ละ Campaign
          </h2>
          {filteredCampaigns.map(([campName, totals]) => (
            <CampaignChartCard
              key={campName}
              campaignName={campName}
              branch={totals.branch}
              chartData={campaignChartData[campName] || []}
              totalSpend={totals.spend}
              totalConv={totals.conversions}
              totalClicks={totals.clicks}
            />
          ))}
        </div>
      )}

      {/* Conversion Actions Breakdown by Branch */}
      {!isLoading && Object.keys(convActionSummary).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Conversion Actions Breakdown — แยกตามสาขา
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(activeBranch === "all" ? ["Barbersmith", "Thonglor", "Noir Siam", "Erawan"] : [activeBranch])
              .filter((b) => convActionSummary[b])
              .map((branch) => {
                const actions = Object.entries(convActionSummary[branch] || {})
                  .sort((a, b) => b[1] - a[1]);
                const total = actions.reduce((s, [, v]) => s + v, 0);
                return (
                  <div key={branch} className="bg-card rounded-xl border border-border/50 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRANCH_COLORS[branch] || C.blue }} />
                      <h3 className="text-sm font-semibold text-foreground">{branch}</h3>
                      <span className="ml-auto text-xs text-muted-foreground">{total.toFixed(1)} total conv</span>
                    </div>
                    <div className="space-y-2">
                      {actions.map(([action, conv]) => {
                        const pct = total > 0 ? (conv / total) * 100 : 0;
                        return (
                          <div key={action}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-foreground font-medium truncate max-w-[65%]">{action}</span>
                              <span className="text-muted-foreground">{conv.toFixed(1)} ({pct.toFixed(0)}%)</span>
                            </div>
                            <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: BRANCH_COLORS[branch] || C.blue }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Daily Table */}
      {!isLoading && data?.daily && data.daily.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            ตารางข้อมูลรายวัน
          </h2>
          <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-left text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">วันที่</th>
                  <th className="px-4 py-3 font-medium">Campaign</th>
                  <th className="px-4 py-3 font-medium">สาขา</th>
                  <th className="px-4 py-3 text-right font-medium">Imp</th>
                  <th className="px-4 py-3 text-right font-medium">Clicks</th>
                  <th className="px-4 py-3 text-right font-medium">Spend</th>
                  <th className="px-4 py-3 text-right font-medium">Conv</th>
                  <th className="px-4 py-3 text-right font-medium">CPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {data.daily
                  .filter((r) => activeBranch === "all" || r.branch === activeBranch)
                  .map((row, i) => {
                    const cpa = row.cpa;
                    return (
                      <tr key={i} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(row.date)}</td>
                        <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">{shortCampaignName(row.campaignName)}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs font-medium" style={{ color: BRANCH_COLORS[row.branch] || C.blue }}>
                            {row.branch}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{row.impressions.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-foreground">{row.clicks.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right font-medium" style={{ color: C.gold }}>{fmt(row.spend, "currency")}</td>
                        <td className="px-4 py-2.5 text-right font-medium" style={{ color: row.conversions > 0 ? C.teal : "oklch(0.45 0.01 285)" }}>
                          {row.conversions > 0 ? row.conversions.toFixed(1) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium" style={{ color: cpa > 200 ? C.danger : cpa > 80 ? C.orange : cpa > 0 ? C.success : "oklch(0.45 0.01 285)" }}>
                          {cpa > 0 ? fmt(cpa, "currency") : "—"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && (!data?.daily || data.daily.length === 0) && (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>ไม่มีข้อมูล</p>
        </div>
      )}
    </div>
  );
}
