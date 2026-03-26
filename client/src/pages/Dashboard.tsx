import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  TrendingUp, TrendingDown, DollarSign, Target, MousePointerClick, BarChart3,
  AlertTriangle, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Calendar,
  RefreshCw, ChevronUp, ChevronDown, Info, Wallet, Clock, Smartphone, Monitor,
  Search, Megaphone, Star, Zap, Activity,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, ResponsiveContainer, Legend, Area, AreaChart,
  Tooltip as RechartsTooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

// ─── Theme Colors ──────────────────────────────────────────────────────────────
const C = {
  gold: "oklch(0.78 0.12 85)",
  goldLight: "oklch(0.85 0.1 85)",
  teal: "oklch(0.65 0.15 165)",
  blue: "oklch(0.55 0.15 250)",
  orange: "oklch(0.7 0.15 45)",
  success: "oklch(0.7 0.18 145)",
  warning: "oklch(0.75 0.15 65)",
  danger: "oklch(0.65 0.2 25)",
  purple: "oklch(0.6 0.18 290)",
};
const PIE_COLORS = [C.gold, C.teal, C.blue, C.orange, C.purple];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmt(val: number, type: "currency" | "number" | "percent" | "percent1") {
  if (type === "currency") return `฿${val.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
  if (type === "percent") return `${val.toFixed(2)}%`;
  if (type === "percent1") return `${val.toFixed(1)}%`;
  return val.toLocaleString();
}

function TrendBadge({ value, inverse = false }: { value: number; inverse?: boolean }) {
  const isGood = inverse ? value <= 0 : value >= 0;
  if (value === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={`inline-flex items-center text-xs font-medium ${isGood ? "text-green-400" : "text-red-400"}`}>
      {value > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-sm">
      <p className="font-medium text-foreground mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.name.includes("฿") ? fmt(p.value, "currency") : p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({
  title, value, prevValue, format, icon: Icon, target, status, note,
}: {
  title: string; value: number; prevValue?: number; format: "currency" | "number" | "percent" | "percent1";
  icon: React.ElementType; target?: number; status?: "healthy" | "warning" | "critical"; note?: string;
}) {
  const change = prevValue && prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : 0;
  const isInverseBetter = title.includes("CPA") || title.includes("Cost per");
  const borderColor = status === "healthy" ? "border-green-500/30" : status === "warning" ? "border-yellow-500/30" : status === "critical" ? "border-red-500/30" : "border-border/50";
  const glowColor = status === "healthy" ? "from-green-500/10" : status === "warning" ? "from-yellow-500/10" : status === "critical" ? "from-red-500/10" : "from-transparent";

  return (
    <div className={`relative bg-card rounded-xl border ${borderColor} p-5 overflow-hidden shadow-lg`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${glowColor} to-transparent pointer-events-none`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-2xl font-bold text-foreground">{fmt(value, format)}</span>
          {prevValue !== undefined && <TrendBadge value={change} inverse={isInverseBetter} />}
        </div>
        {prevValue !== undefined && (
          <p className="text-xs text-muted-foreground">vs {fmt(prevValue, format)} prev period</p>
        )}
        {target !== undefined && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Target: {fmt(target, format)}</span>
              <span>{Math.min((value / target) * 100, 999).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${value >= target ? "bg-green-500" : value >= target * 0.7 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${Math.min((value / target) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
        {note && <p className="text-xs text-muted-foreground mt-2">{note}</p>}
      </div>
    </div>
  );
}

// ─── Sortable Table Header ─────────────────────────────────────────────────────
function SortTh({ label, sortKey, current, onSort }: { label: string; sortKey: string; current: { key: string; dir: "asc" | "desc" }; onSort: (k: string) => void }) {
  const active = current.key === sortKey;
  return (
    <th className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSort(sortKey)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (current.dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronUp className="w-3 h-3 opacity-20" />}
      </span>
    </th>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [dateRange, setDateRange] = useState<"daily" | "weekly" | "campaign">("campaign");
  const [kwSort, setKwSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "clicks", dir: "desc" });
  const [stSort, setStSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "clicks", dir: "desc" });

  // Derive prev period for comparison
  const prevRange = useMemo<"daily" | "weekly" | "campaign">(() => {
    if (dateRange === "daily") return "daily";
    if (dateRange === "weekly") return "weekly";
    return "weekly"; // compare campaign-to-date vs last 7 days
  }, [dateRange]);

  // ── Queries ──
  const { data: liveData, isLoading: mainLoading, refetch } = trpc.dashboard.getData.useQuery({ dateRange });
  const { data: prevData } = trpc.dashboard.getData.useQuery({ dateRange: prevRange }, { enabled: dateRange === "campaign" });
  const { data: balanceData } = trpc.dashboard.getAccountBalance.useQuery();
  const { data: convData, isLoading: convLoading } = trpc.dashboard.getConversionEvents.useQuery({ dateRange });
  const { data: topKwData, isLoading: topKwLoading } = trpc.dashboard.getTopKeywordsByCampaign.useQuery({ dateRange });
  const { data: deviceData, isLoading: deviceLoading } = trpc.dashboard.getDevicePerformance.useQuery({ dateRange });
  const { data: searchTermData, isLoading: stLoading } = trpc.dashboard.getSearchTerms.useQuery({ dateRange, limit: 20 });
  const { data: adCopyData, isLoading: adLoading } = trpc.dashboard.getAdCopyPerformance.useQuery({ dateRange });
  const { data: isData, isLoading: isLoading2 } = trpc.dashboard.getImpressionShare.useQuery({ dateRange });

  const isLive = liveData?.dataSource === "live";

  // ── Derived Data ──
  const campaigns = useMemo(() => liveData?.campaigns || [], [liveData]);
  const dailyTrends = useMemo(() => liveData?.dailyTrends || [], [liveData]);
  const keywords = useMemo(() => liveData?.keywords || [], [liveData]);
  const alerts = useMemo(() => liveData?.alerts || [], [liveData]);

  const kpi = useMemo(() => {
    const c = campaigns;
    const totalSpend = c.reduce((s: number, x: any) => s + (x.spend || 0), 0);
    const totalConversions = c.reduce((s: number, x: any) => s + (x.conversions || 0), 0);
    const totalClicks = c.reduce((s: number, x: any) => s + (x.clicks || 0), 0);
    const totalImpressions = c.reduce((s: number, x: any) => s + (x.impressions || 0), 0);
    return {
      totalSpend,
      totalConversions,
      totalClicks,
      totalImpressions,
      cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cvr: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      avgCpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    };
  }, [campaigns]);

  const prevKpi = useMemo(() => {
    const c = prevData?.campaigns || [];
    const totalSpend = c.reduce((s: number, x: any) => s + (x.spend || 0), 0);
    const totalConversions = c.reduce((s: number, x: any) => s + (x.conversions || 0), 0);
    const totalClicks = c.reduce((s: number, x: any) => s + (x.clicks || 0), 0);
    const totalImpressions = c.reduce((s: number, x: any) => s + (x.impressions || 0), 0);
    return {
      totalSpend,
      totalConversions,
      cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cvr: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
    };
  }, [prevData]);

  // Sorted keywords
  const sortedKw = useMemo(() => {
    const arr = [...keywords];
    arr.sort((a: any, b: any) => {
      const av = a[kwSort.key] ?? 0;
      const bv = b[kwSort.key] ?? 0;
      return kwSort.dir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [keywords, kwSort]);

  const sortedSt = useMemo(() => {
    const arr = [...(searchTermData?.data || [])];
    arr.sort((a: any, b: any) => {
      const av = a[stSort.key] ?? 0;
      const bv = b[stSort.key] ?? 0;
      return stSort.dir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [searchTermData, stSort]);

  const handleKwSort = (key: string) => setKwSort(prev => ({ key, dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc" }));
  const handleStSort = (key: string) => setStSort(prev => ({ key, dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc" }));

  // Conversion actions aggregated
  const convActions = useMemo(() => convData?.actions || [], [convData]);
  const convTrend = useMemo(() => {
    if (!convData?.dailyBreakdown) return [];
    const map = new Map<string, { date: string; conversions: number; allConversions: number }>();
    convData.dailyBreakdown.forEach((r: any) => {
      if (!map.has(r.date)) map.set(r.date, { date: r.date, conversions: 0, allConversions: 0 });
      const d = map.get(r.date)!;
      d.conversions += r.conversions;
      d.allConversions += r.allConversions;
    });
    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        conversions: Math.round(d.conversions),
        allConversions: Math.round(d.allConversions),
      }));
  }, [convData]);

  const dateRangeLabel = dateRange === "daily" ? "Today" : dateRange === "weekly" ? "Last 7 Days" : "Campaign to Date (Dec 17, 2025 – Now)";

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-foreground leading-tight">Barberford Ads Dashboard</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">{dateRangeLabel}</p>
            </div>
            <Badge
              variant="outline"
              className={`text-xs font-medium ${isLive ? "border-green-500/50 text-green-400 bg-green-500/10" : "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isLive ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />
              {isLive ? "Live Data" : "Demo Data"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-4 h-4" />
            </div>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as "daily" | "weekly" | "campaign")}>
              <SelectTrigger className="w-44 bg-card border-border/50 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily View</SelectItem>
                <SelectItem value="weekly">Weekly View</SelectItem>
                <SelectItem value="campaign">Campaign to Date</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()} className="bg-card border-border/50">
              <RefreshCw className={`w-4 h-4 ${mainLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      <main className="py-6 px-4 space-y-10">

        {/* ════════════════════════════════════════════════════════════════
            SECTION 1: HIGH-LEVEL PERFORMANCE
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader icon={Activity} title="High-Level Performance" subtitle="Overall account health — are we on track?" />

          {/* Account Balance Banner */}
          {balanceData?.success && balanceData.balance && (
            <div className="mb-5 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Account Balance — {balanceData.balance.accountName}</p>
                  {balanceData.balance.hasUnlimitedBudget ? (
                    <span className="text-xl font-bold text-amber-400">Unlimited Budget</span>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-amber-400">
                        ฿{balanceData.balance.remainingBalance.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-sm text-muted-foreground">remaining</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:items-end gap-1">
                {!balanceData.balance.hasUnlimitedBudget && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Approved: <span className="text-foreground font-medium">฿{balanceData.balance.approvedSpendingLimit.toLocaleString("th-TH", { maximumFractionDigits: 0 })}</span></span>
                    <span className="text-muted-foreground">Spent: <span className="text-foreground font-medium">฿{balanceData.balance.amountServed.toLocaleString("th-TH", { maximumFractionDigits: 0 })}</span></span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>As of {new Date(balanceData.balance.asOf).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard title="Total Spend" value={kpi.totalSpend} prevValue={prevKpi.totalSpend} format="currency" icon={DollarSign}
              status={kpi.totalSpend > 150000 ? "warning" : "healthy"} />
            <KPICard title="Conversions" value={kpi.totalConversions} prevValue={prevKpi.totalConversions} format="number" icon={Target}
              status={kpi.totalConversions >= 400 ? "healthy" : kpi.totalConversions >= 200 ? "warning" : "critical"} />
            <KPICard title="CPA (Cost per Conversion)" value={kpi.cpa} prevValue={prevKpi.cpa} format="currency" icon={MousePointerClick}
              status={kpi.cpa <= 300 ? "healthy" : kpi.cpa <= 450 ? "warning" : "critical"} note="Lower is better" />
            <KPICard title="Conversion Rate" value={kpi.cvr} prevValue={prevKpi.cvr} format="percent" icon={BarChart3}
              status={kpi.cvr >= 5 ? "healthy" : kpi.cvr >= 3 ? "warning" : "critical"} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard title="Total Clicks" value={kpi.totalClicks} format="number" icon={MousePointerClick} />
            <KPICard title="Total Impressions" value={kpi.totalImpressions} format="number" icon={Activity} />
            <KPICard title="CTR" value={kpi.ctr} prevValue={prevKpi.ctr} format="percent" icon={TrendingUp}
              status={kpi.ctr >= 5 ? "healthy" : kpi.ctr >= 2 ? "warning" : "critical"} />
            <KPICard title="Avg. CPC" value={kpi.avgCpc} format="currency" icon={DollarSign}
              status={kpi.avgCpc <= 15 ? "healthy" : kpi.avgCpc <= 25 ? "warning" : "critical"} note="Lower is better" />
          </div>

          {/* Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spend & Conversions Trend */}
            <div className="bg-card rounded-xl border border-border/50 p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-foreground mb-4">Spend vs Conversions Trend</h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrends}>
                    <defs>
                      <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.gold} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.gold} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.teal} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 285)" />
                    <XAxis dataKey="date" stroke="oklch(0.55 0.015 285)" fontSize={11} />
                    <YAxis yAxisId="left" stroke="oklch(0.55 0.015 285)" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke="oklch(0.55 0.015 285)" fontSize={11} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Area yAxisId="left" type="monotone" dataKey="spend" name="Spend (฿)" stroke={C.gold} fill="url(#gSpend)" strokeWidth={2} dot={false} />
                    <Area yAxisId="right" type="monotone" dataKey="conversions" name="Conversions" stroke={C.teal} fill="url(#gConv)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Conversion Events Trend */}
            <div className="bg-card rounded-xl border border-border/50 p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-foreground mb-1">Conversion Events Trend</h3>
              <p className="text-xs text-muted-foreground mb-4">Google Ads tracked conversions over time</p>
              {convLoading ? (
                <div className="h-[260px] flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                </div>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={convTrend}>
                      <defs>
                        <linearGradient id="gConvTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.gold} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={C.gold} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 285)" />
                      <XAxis dataKey="date" stroke="oklch(0.55 0.015 285)" fontSize={11} />
                      <YAxis stroke="oklch(0.55 0.015 285)" fontSize={11} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Area type="monotone" dataKey="conversions" name="Conversions" stroke={C.gold} fill="url(#gConvTrend)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="allConversions" name="All Conversions" stroke={C.teal} fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Conversion Actions Table */}
          {convActions.length > 0 && (
            <div className="mt-6 bg-card rounded-xl border border-border/50 p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-foreground mb-4">Conversion Actions Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="pb-3 pr-4 font-medium">Event / Goal</th>
                      <th className="pb-3 pr-4 font-medium">Category</th>
                      <th className="pb-3 pr-4 text-right font-medium">Conversions</th>
                      <th className="pb-3 text-right font-medium">All Conv.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {convActions.map((a: any, i: number) => {
                      const catColors: Record<string, string> = {
                        PHONE_CALL: "text-green-400", SUBMIT_LEAD_FORM: "text-blue-400",
                        PURCHASE: "text-yellow-400", PAGE_VIEW: "text-purple-400", DOWNLOAD: "text-orange-400",
                      };
                      return (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 pr-4 font-medium text-foreground">{a.name}</td>
                          <td className="py-2.5 pr-4">
                            <span className={`text-xs font-medium ${catColors[a.category] || "text-muted-foreground"}`}>
                              {String(a.category).replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-right font-bold text-primary">{Math.round(a.conversions)}</td>
                          <td className="py-2.5 text-right text-muted-foreground">{Math.round(a.allConversions)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Optimization Alerts */}
          {alerts.length > 0 && (
            <div className="mt-6 bg-card rounded-xl border border-border/50 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Optimization Alerts</h3>
                <Badge variant="outline" className="text-primary border-primary/40 text-xs">{alerts.length} alerts</Badge>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {alerts.map((a: any) => {
                  const cfg = {
                    success: { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", icon: CheckCircle2 },
                    warning: { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: AlertTriangle },
                    danger: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: XCircle },
                  }[a.type as "success" | "warning" | "danger"];
                  const Icon = cfg.icon;
                  return (
                    <div key={a.id} className={`p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                      <div className="flex gap-3">
                        <Icon className={`w-4 h-4 ${cfg.color} flex-shrink-0 mt-0.5`} />
                        <div>
                          <p className={`text-sm font-medium ${cfg.color}`}>{a.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 2: CAMPAIGN & AD GROUP BREAKDOWN
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader icon={BarChart3} title="Campaign & Ad Group Breakdown" subtitle="Per-campaign performance with Impression Share analysis" />

          {/* Campaign Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {campaigns.map((c: any) => {
              const statusCfg = {
                healthy: { color: "text-green-400", bg: "bg-green-500/15", icon: CheckCircle2, label: "Healthy" },
                warning: { color: "text-yellow-400", bg: "bg-yellow-500/15", icon: AlertTriangle, label: "Warning" },
                critical: { color: "text-red-400", bg: "bg-red-500/15", icon: XCircle, label: "Critical" },
              }[c.status as "healthy" | "warning" | "critical"] || { color: "text-muted-foreground", bg: "bg-muted/20", icon: Info, label: "Unknown" };
              const SI = statusCfg.icon;
              const cpa = c.conversions > 0 ? c.spend / c.conversions : 0;
              const isData2 = isData?.data?.find((x: any) => x.campaignName === c.name);
              return (
                <div key={c.id} className="bg-card rounded-xl border border-border/50 p-5 shadow-lg space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{c.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{c.location} Branch</p>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color} flex-shrink-0`}>
                      <SI className="w-3 h-3" />{statusCfg.label}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><p className="text-xs text-muted-foreground mb-0.5">Spend</p><p className="font-bold text-foreground">฿{c.spend.toLocaleString()}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-0.5">Conversions</p><p className="font-bold text-primary">{c.conversions}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-0.5">CPA</p><p className={`font-bold ${cpa <= 300 ? "text-green-400" : cpa <= 450 ? "text-yellow-400" : "text-red-400"}`}>฿{cpa.toFixed(0)}</p></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><p className="text-xs text-muted-foreground mb-0.5">Clicks</p><p className="text-foreground">{c.clicks.toLocaleString()}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-0.5">CTR</p><p className={c.ctr >= 5 ? "text-green-400" : c.ctr >= 2 ? "text-yellow-400" : "text-foreground"}>{c.ctr.toFixed(2)}%</p></div>
                    <div><p className="text-xs text-muted-foreground mb-0.5">CPC</p><p className="text-foreground">฿{c.cpc.toFixed(0)}</p></div>
                  </div>
                  {isData2 && (
                    <div className="pt-2 border-t border-border/30 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Impression Share</span>
                        <span className={isData2.impressionShare >= 70 ? "text-green-400" : isData2.impressionShare >= 40 ? "text-yellow-400" : "text-red-400"}>{isData2.impressionShare.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(isData2.impressionShare, 100)}%` }} />
                      </div>
                      {isData2.budgetLostIS > 0 && (
                        <p className="text-xs text-yellow-400">⚠ {isData2.budgetLostIS.toFixed(1)}% lost to budget</p>
                      )}
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Budget Pacing</span>
                      <span>{((c.spend / c.budget) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${(c.spend / c.budget) > 0.9 ? "bg-red-500" : (c.spend / c.budget) > 0.7 ? "bg-amber-500" : "bg-green-500"}`}
                        style={{ width: `${Math.min((c.spend / c.budget) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conversions by Campaign Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-card rounded-xl border border-border/50 p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-foreground mb-4">Conversions by Campaign</h3>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={campaigns.map((c: any) => {
                    const parts = c.name.split("|").map((s: string) => s.trim());
                    return { ...c, shortName: (parts[2] || parts[1] || c.name).slice(0, 14) };
                  })} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 285)" />
                    <XAxis type="number" stroke="oklch(0.55 0.015 285)" fontSize={11} />
                    <YAxis dataKey="shortName" type="category" stroke="oklch(0.55 0.015 285)" fontSize={11} width={110} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="conversions" name="Conversions" fill={C.gold} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Impression Share Chart */}
            <div className="bg-card rounded-xl border border-border/50 p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-foreground mb-1">Impression Share by Campaign</h3>
              <p className="text-xs text-muted-foreground mb-4">How often your ads show vs total eligible impressions</p>
              {isLoading2 ? (
                <div className="h-[240px] flex items-center justify-center"><RefreshCw className="w-5 h-5 text-primary animate-spin" /></div>
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(isData?.data || []).map((d: any) => ({
                      ...d,
                      name: d.campaignName.split("|").map((s: string) => s.trim())[2] || d.campaignName.split("|")[0] || d.campaignName,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 285)" />
                      <XAxis dataKey="name" stroke="oklch(0.55 0.015 285)" fontSize={10} />
                      <YAxis stroke="oklch(0.55 0.015 285)" fontSize={11} domain={[0, 100]} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="impressionShare" name="IS %" fill={C.teal} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="budgetLostIS" name="Budget Lost IS %" fill={C.warning} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="rankLostIS" name="Rank Lost IS %" fill={C.danger} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Top 10 Keywords per Campaign */}
          <div className="bg-card rounded-xl border border-border/50 p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-foreground mb-4">Top 10 Keywords by Campaign</h3>
            {topKwLoading ? (
              <div className="flex items-center justify-center h-24"><RefreshCw className="w-5 h-5 text-primary animate-spin mr-2" /><span className="text-muted-foreground text-sm">Loading...</span></div>
            ) : !topKwData?.success || topKwData.campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No keyword data for this period.</p>
            ) : (
              <Tabs defaultValue={topKwData.campaigns[0]?.campaignId} className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-1 bg-background/50 border border-border/50 p-1 mb-4 rounded-xl">
                  {topKwData.campaigns.map((camp: any) => (
                    <TabsTrigger key={camp.campaignId} value={camp.campaignId} className="text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      {camp.campaignName.length > 28 ? camp.campaignName.slice(0, 28) + "…" : camp.campaignName}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {topKwData.campaigns.map((camp: any) => (
                  <TabsContent key={camp.campaignId} value={camp.campaignId}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50 text-left text-xs text-muted-foreground uppercase tracking-wider">
                            <th className="pb-3 w-8">#</th>
                            <th className="pb-3 pr-4">Keyword</th>
                            <th className="pb-3 pr-4">Match</th>
                            <th className="pb-3 pr-4 text-right">Clicks</th>
                            <th className="pb-3 pr-4 text-right">Impr.</th>
                            <th className="pb-3 pr-4 text-right">CTR</th>
                            <th className="pb-3 pr-4 text-right">CPC</th>
                            <th className="pb-3 pr-4 text-right">Conv.</th>
                            <th className="pb-3 text-right">Spend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {camp.keywords.map((kw: any) => (
                            <tr key={kw.rank} className={`hover:bg-muted/20 transition-colors ${kw.rank === 1 ? "bg-amber-500/5" : ""}`}>
                              <td className="py-2.5 text-center text-xs text-muted-foreground">
                                {kw.rank === 1 ? "🥇" : kw.rank === 2 ? "🥈" : kw.rank === 3 ? "🥉" : kw.rank}
                              </td>
                              <td className="py-2.5 pr-4 font-medium max-w-[180px]">
                                <span className={kw.rank === 1 ? "text-amber-400" : "text-foreground"}>{kw.keyword}</span>
                              </td>
                              <td className="py-2.5 pr-4">
                                <Badge variant="outline" className="text-xs px-1.5 py-0">
                                  {kw.matchType === "EXACT" ? "Exact" : kw.matchType === "PHRASE" ? "Phrase" : "Broad"}
                                </Badge>
                              </td>
                              <td className="py-2.5 pr-4 text-right font-semibold text-primary">{kw.clicks.toLocaleString()}</td>
                              <td className="py-2.5 pr-4 text-right text-muted-foreground">{kw.impressions.toLocaleString()}</td>
                              <td className="py-2.5 pr-4 text-right">
                                <span className={kw.ctr >= 5 ? "text-green-400" : kw.ctr >= 2 ? "text-yellow-400" : "text-muted-foreground"}>{kw.ctr.toFixed(2)}%</span>
                              </td>
                              <td className="py-2.5 pr-4 text-right text-muted-foreground">฿{kw.cpc.toFixed(2)}</td>
                              <td className="py-2.5 pr-4 text-right">
                                <span className={kw.conversions > 0 ? "text-green-400 font-semibold" : "text-muted-foreground"}>{Math.round(kw.conversions)}</span>
                              </td>
                              <td className="py-2.5 text-right text-muted-foreground">฿{kw.spend.toLocaleString("th-TH", { maximumFractionDigits: 0 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 3: OPTIMIZATION INSIGHTS
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader icon={Zap} title="Optimization Insights" subtitle="Search terms, device performance, and ad creative analysis" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Device Performance */}
            <div className="bg-card rounded-xl border border-border/50 p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Device Performance</h3>
              </div>
              {deviceLoading ? (
                <div className="h-[200px] flex items-center justify-center"><RefreshCw className="w-5 h-5 text-primary animate-spin" /></div>
              ) : (
                <>
                  <div className="h-[180px] mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={(deviceData?.data || []).map((d: any) => ({ name: d.device, value: d.clicks }))}
                          cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value"
                          label={({ name, percent }) => `${name.slice(0, 3)} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {(deviceData?.data || []).map((_: any, i: number) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {(deviceData?.data || []).map((d: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-foreground font-medium">{d.device}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{d.clicks.toLocaleString()} clicks</span>
                          <span className={d.conversionRate >= 5 ? "text-green-400" : d.conversionRate >= 2 ? "text-yellow-400" : "text-muted-foreground"}>{d.conversionRate.toFixed(1)}% CVR</span>
                          <span className={d.cpa > 0 && d.cpa <= 300 ? "text-green-400" : d.cpa <= 450 ? "text-yellow-400" : "text-red-400"}>฿{d.cpa.toFixed(0)} CPA</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Ad Copy Performance */}
            <div className="bg-card rounded-xl border border-border/50 p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Megaphone className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Ad Copy Performance</h3>
              </div>
              {adLoading ? (
                <div className="h-[200px] flex items-center justify-center"><RefreshCw className="w-5 h-5 text-primary animate-spin" /></div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {(adCopyData?.data || []).map((ad: any, i: number) => (
                    <div key={i} className={`p-3 rounded-lg border ${i === 0 ? "border-amber-500/40 bg-amber-500/5" : "border-border/40 bg-background/30"}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{ad.headlines || "Ad"}</p>
                        {i === 0 && <Badge className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/40 flex-shrink-0">Best</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mb-2">{ad.campaignName}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-primary font-medium">{ad.clicks} clicks</span>
                        <span className={ad.ctr >= 5 ? "text-green-400" : ad.ctr >= 2 ? "text-yellow-400" : "text-muted-foreground"}>{ad.ctr.toFixed(2)}% CTR</span>
                        <span className={ad.conversions > 0 ? "text-green-400" : "text-muted-foreground"}>{Math.round(ad.conversions)} conv.</span>
                        <span className={ad.conversionRate >= 5 ? "text-green-400" : "text-muted-foreground"}>{ad.conversionRate.toFixed(1)}% CVR</span>
                      </div>
                    </div>
                  ))}
                  {(adCopyData?.data || []).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No ad copy data for this period.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search Terms Report */}
          <div className="bg-card rounded-xl border border-border/50 p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Search Terms Report</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">Actual search queries that triggered your ads. Use this to find new keywords or add negatives.</p></TooltipContent>
              </Tooltip>
            </div>
            {stLoading ? (
              <div className="flex items-center justify-center h-24"><RefreshCw className="w-5 h-5 text-primary animate-spin mr-2" /><span className="text-muted-foreground text-sm">Loading...</span></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left text-xs text-muted-foreground uppercase tracking-wider">
                      <SortTh label="Search Term" sortKey="searchTerm" current={stSort} onSort={handleStSort} />
                      <th className="pb-3 pr-4 font-medium">Campaign</th>
                      <SortTh label="Clicks" sortKey="clicks" current={stSort} onSort={handleStSort} />
                      <SortTh label="Impr." sortKey="impressions" current={stSort} onSort={handleStSort} />
                      <SortTh label="CTR" sortKey="ctr" current={stSort} onSort={handleStSort} />
                      <SortTh label="CPC" sortKey="cpc" current={stSort} onSort={handleStSort} />
                      <SortTh label="Conv." sortKey="conversions" current={stSort} onSort={handleStSort} />
                      <SortTh label="Spend" sortKey="spend" current={stSort} onSort={handleStSort} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {sortedSt.map((st: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 pr-4 font-medium text-foreground max-w-[200px] truncate">{st.searchTerm}</td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground max-w-[160px] truncate">{st.campaignName.split("|").map((s: string) => s.trim())[2] || st.campaignName}</td>
                        <td className="py-2.5 pr-4 text-right font-semibold text-primary">{st.clicks.toLocaleString()}</td>
                        <td className="py-2.5 pr-4 text-right text-muted-foreground">{st.impressions.toLocaleString()}</td>
                        <td className="py-2.5 pr-4 text-right">
                          <span className={st.ctr >= 5 ? "text-green-400" : st.ctr >= 2 ? "text-yellow-400" : "text-muted-foreground"}>{st.ctr.toFixed(2)}%</span>
                        </td>
                        <td className="py-2.5 pr-4 text-right text-muted-foreground">฿{st.cpc.toFixed(2)}</td>
                        <td className="py-2.5 pr-4 text-right">
                          <span className={st.conversions > 0 ? "text-green-400 font-semibold" : "text-muted-foreground"}>{Math.round(st.conversions)}</span>
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground">฿{st.spend.toLocaleString("th-TH", { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))}
                    {sortedSt.length === 0 && (
                      <tr><td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">No search term data for this period.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 4: QUALITY & RELEVANCE
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader icon={Star} title="Quality & Relevance" subtitle="Keyword quality scores and landing page experience" />

          <div className="bg-card rounded-xl border border-border/50 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Keyword Quality Scores</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Higher QS = lower CPC + better ad position</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />7-10 Good</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />5-6 Average</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />1-4 Poor</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="pb-3 pr-4 font-medium">Keyword</th>
                    <th className="pb-3 pr-4 font-medium">Match Type</th>
                    <SortTh label="Quality Score" sortKey="qualityScore" current={kwSort} onSort={handleKwSort} />
                    <SortTh label="Impressions" sortKey="impressions" current={kwSort} onSort={handleKwSort} />
                    <SortTh label="Clicks" sortKey="clicks" current={kwSort} onSort={handleKwSort} />
                    <SortTh label="Conv." sortKey="conversions" current={kwSort} onSort={handleKwSort} />
                    <SortTh label="CPC" sortKey="cpc" current={kwSort} onSort={handleKwSort} />
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {sortedKw.map((kw: any) => (
                    <tr key={kw.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-foreground max-w-[200px] truncate">{kw.keyword}</td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="outline" className="text-xs capitalize">{kw.matchType}</Badge>
                      </td>
                      <td className="py-2.5 pr-4">
                        {kw.qualityScore > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${kw.qualityScore >= 7 ? "text-green-400" : kw.qualityScore >= 5 ? "text-yellow-400" : "text-red-400"}`}>
                              {kw.qualityScore}/10
                            </span>
                            <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${kw.qualityScore >= 7 ? "bg-green-500" : kw.qualityScore >= 5 ? "bg-yellow-500" : "bg-red-500"}`}
                                style={{ width: `${(kw.qualityScore / 10) * 100}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">N/A</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-muted-foreground">{kw.impressions.toLocaleString()}</td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-primary">{kw.clicks.toLocaleString()}</td>
                      <td className="py-2.5 pr-4 text-right">
                        <span className={kw.conversions > 0 ? "text-green-400 font-semibold" : "text-muted-foreground"}>{kw.conversions}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-right text-muted-foreground">฿{kw.cpc.toFixed(0)}</td>
                      <td className="py-2.5">
                        <Badge className={kw.status === "active" ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs"}>
                          {kw.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {sortedKw.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">No keyword data for this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
