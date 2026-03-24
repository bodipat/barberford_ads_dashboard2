import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  MousePointerClick,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Info,
  Globe,
} from "lucide-react";
import AnalyticsSection from "@/components/AnalyticsSection";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  Tooltip as RechartsTooltip,
} from "recharts";

// Types
interface KPIData {
  totalSpend: number;
  totalBudget: number;
  totalConversions: number;
  targetConversions: number;
  costPerConversion: number;
  targetCPC: number;
  conversionRate: number;
  targetCVR: number;
  totalClicks: number;
  totalImpressions: number;
  ctr: number;
}

interface CampaignData {
  id: number;
  name: string;
  location: string;
  spend: number;
  budget: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  status: "healthy" | "warning" | "critical";
}

interface DailyTrendData {
  date: string;
  spend: number;
  conversions: number;
  clicks: number;
}

interface KeywordData {
  id: number;
  keyword: string;
  matchType: string;
  qualityScore: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpc: number;
  status: "active" | "paused";
}

interface AlertData {
  id: number;
  type: "success" | "warning" | "danger";
  title: string;
  message: string;
  campaign?: string;
  metric?: string;
  value?: number;
  threshold?: number;
}

// Chart colors matching the elegant gold theme
const CHART_COLORS = {
  gold: "oklch(0.78 0.12 85)",
  goldLight: "oklch(0.85 0.1 85)",
  goldDark: "oklch(0.65 0.12 85)",
  teal: "oklch(0.65 0.15 165)",
  blue: "oklch(0.55 0.15 250)",
  orange: "oklch(0.7 0.15 45)",
  success: "oklch(0.7 0.18 145)",
  warning: "oklch(0.75 0.15 65)",
  danger: "oklch(0.65 0.2 25)",
};

const PIE_COLORS = [CHART_COLORS.gold, CHART_COLORS.teal, CHART_COLORS.blue];

// KPI Card Component
function KPICard({
  title,
  value,
  target,
  format,
  icon: Icon,
  trend,
  trendValue,
  progress,
  status,
}: {
  title: string;
  value: number;
  target?: number;
  format: "currency" | "number" | "percent";
  icon: React.ElementType;
  trend?: "up" | "down";
  trendValue?: number;
  progress?: number;
  status?: "healthy" | "warning" | "critical";
}) {
  const formatValue = (val: number) => {
    switch (format) {
      case "currency":
        return `฿${val.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      case "percent":
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString();
    }
  };

  const statusColors = {
    healthy: "from-green-500/20 to-transparent",
    warning: "from-yellow-500/20 to-transparent",
    critical: "from-red-500/20 to-transparent",
  };

  const statusBorderColors = {
    healthy: "border-green-500/30",
    warning: "border-yellow-500/30",
    critical: "border-red-500/30",
  };

  return (
    <div className={`kpi-card ${status ? statusBorderColors[status] : ""}`}>
      {status && (
        <div className={`absolute inset-0 bg-gradient-to-br ${statusColors[status]} pointer-events-none`} />
      )}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="metric-label">{title}</span>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="flex items-end gap-3 mb-3">
          <span className="metric-value text-foreground">{formatValue(value)}</span>
          {trend && trendValue !== undefined && (
            <span
              className={`flex items-center text-sm font-medium ${
                trend === "up" ? "text-green-400" : "text-red-400"
              }`}
            >
              {trend === "up" ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              {trendValue.toFixed(1)}%
            </span>
          )}
        </div>
        {target !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>
                {formatValue(value)} / {formatValue(target)}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill gold-gradient"
                style={{ width: `${Math.min((value / target) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
        {progress !== undefined && !target && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>vs Target</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${progress >= 100 ? "bg-green-500" : progress >= 70 ? "gold-gradient" : "bg-red-500"}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Campaign Card Component
function CampaignCard({ campaign }: { campaign: CampaignData }) {
  const statusConfig = {
    healthy: { color: "text-green-400", bg: "bg-green-500/20", icon: CheckCircle2, label: "Healthy" },
    warning: { color: "text-yellow-400", bg: "bg-yellow-500/20", icon: AlertTriangle, label: "Warning" },
    critical: { color: "text-red-400", bg: "bg-red-500/20", icon: XCircle, label: "Critical" },
  };

  const config = statusConfig[campaign.status];
  const StatusIcon = config.icon;
  const budgetProgress = (campaign.spend / campaign.budget) * 100;

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg text-foreground">{campaign.name}</h3>
          <p className="text-sm text-muted-foreground capitalize">{campaign.location} Branch</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {config.label}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Spend</p>
          <p className="font-semibold text-foreground">฿{campaign.spend.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Conversions</p>
          <p className="font-semibold text-foreground">{campaign.conversions}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">CPC</p>
          <p className="font-semibold text-foreground">฿{campaign.cpc.toFixed(0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Impressions</p>
          <p className="text-sm text-foreground">{campaign.impressions.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Clicks</p>
          <p className="text-sm text-foreground">{campaign.clicks.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">CTR</p>
          <p className="text-sm text-foreground">{campaign.ctr.toFixed(2)}%</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Budget Pacing</span>
          <span>{budgetProgress.toFixed(0)}%</span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${budgetProgress > 90 ? "bg-red-500" : budgetProgress > 70 ? "gold-gradient" : "bg-green-500"}`}
            style={{ width: `${Math.min(budgetProgress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Alert Item Component
function AlertItem({ alert }: { alert: AlertData }) {
  const config = {
    success: { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", icon: CheckCircle2 },
    warning: { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: AlertTriangle },
    danger: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: XCircle },
  };

  const { color, bg, border, icon: Icon } = config[alert.type];

  return (
    <div className={`p-4 rounded-lg border ${bg} ${border}`}>
      <div className="flex gap-3">
        <Icon className={`w-5 h-5 ${color} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${color}`}>{alert.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
          {alert.campaign && (
            <p className="text-xs text-muted-foreground mt-2">
              Campaign: <span className="text-foreground">{alert.campaign}</span>
              {alert.metric && (
                <>
                  {" "}• {alert.metric}: <span className="text-foreground">{alert.value}</span>
                  {alert.threshold && <> (threshold: {alert.threshold})</>}
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Sortable Table Header
function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
}: {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: "asc" | "desc" };
  onSort: (key: string) => void;
}) {
  const isActive = currentSort.key === sortKey;

  return (
    <th onClick={() => onSort(sortKey)} className="cursor-pointer select-none">
      <div className="flex items-center gap-1">
        {label}
        <span className="flex flex-col">
          <ChevronUp
            className={`w-3 h-3 -mb-1 ${isActive && currentSort.direction === "asc" ? "text-primary" : "text-muted-foreground/50"}`}
          />
          <ChevronDown
            className={`w-3 h-3 ${isActive && currentSort.direction === "desc" ? "text-primary" : "text-muted-foreground/50"}`}
          />
        </span>
      </div>
    </th>
  );
}

// Custom Tooltip for Charts
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.name.includes("Spend") ? `฿${entry.value.toLocaleString()}` : entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// Main Dashboard Component
export default function Dashboard() {
  const [dateRange, setDateRange] = useState<"daily" | "weekly" | "campaign">("campaign");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "conversions",
    direction: "desc",
  });

  // Fetch dashboard data
  const { data: dashboardData, isLoading, refetch } = trpc.dashboard.getData.useQuery({ dateRange });

  // Fetch Event Goals & Conversions
  const { data: conversionData, isLoading: convLoading } = trpc.dashboard.getConversionEvents.useQuery({ dateRange });

  // Sort handler
  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  // Sort keywords
  const sortedKeywords = useMemo(() => {
    if (!dashboardData?.keywords) return [];
    return [...dashboardData.keywords].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof KeywordData];
      const bVal = b[sortConfig.key as keyof KeywordData];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [dashboardData?.keywords, sortConfig]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const kpi = dashboardData?.kpi || {
    totalSpend: 0,
    totalBudget: 13500,
    totalConversions: 0,
    targetConversions: 22,
    costPerConversion: 0,
    targetCPC: 500,
    conversionRate: 0,
    targetCVR: 7.5,
    totalClicks: 0,
    totalImpressions: 0,
    ctr: 0,
  };

  const allCampaigns = dashboardData?.campaigns || [];
  // Filter out campaigns with no data (0 spend and 0 impressions)
  const campaigns = allCampaigns.filter((c: CampaignData) => c.spend > 0 || c.impressions > 0);
  const dailyTrends = dashboardData?.dailyTrends || [];
  const alerts = dashboardData?.alerts || [];

  // Prepare pie chart data - use short names for better display
  const pieData = campaigns.map((c: CampaignData) => {
    // Extract short name from campaign name (e.g., "BF | Search | Thonglor | Calls" -> "Thonglor")
    const parts = c.name.split('|').map(s => s.trim());
    const shortName = parts.length >= 3 ? parts[2] : (parts.length >= 2 ? parts[1] : c.name);
    return {
      name: shortName.length > 15 ? shortName.substring(0, 15) + '...' : shortName,
      fullName: c.name,
      value: c.spend,
    };
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gold-gradient">Barberford Ads Dashboard</h1>
              <p className="text-sm text-muted-foreground">Google Ads Performance Analytics</p>
              {dashboardData?.dataSource && (
                <Badge 
                  variant={dashboardData.dataSource === "live" ? "default" : "secondary"}
                  className={`mt-1 text-xs ${dashboardData.dataSource === "live" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}`}
                >
                  {dashboardData.dataSource === "live" ? "🔴 Live Data" : "📊 Demo Data"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
                <SelectTrigger className="w-[180px] bg-card border-border">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily View</SelectItem>
                  <SelectItem value="weekly">Weekly View</SelectItem>
                  <SelectItem value="campaign">Campaign to Date</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()} className="border-border">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* KPI Cards */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Executive Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Spend"
              value={kpi.totalSpend}
              target={kpi.totalBudget}
              format="currency"
              icon={DollarSign}
              status={kpi.totalSpend > kpi.totalBudget * 0.9 ? "warning" : "healthy"}
            />
            <KPICard
              title="Conversions"
              value={kpi.totalConversions}
              target={kpi.targetConversions}
              format="number"
              icon={Target}
              trend={kpi.totalConversions >= kpi.targetConversions * 0.5 ? "up" : "down"}
              trendValue={((kpi.totalConversions / kpi.targetConversions) * 100) - 100}
              status={kpi.totalConversions >= kpi.targetConversions ? "healthy" : kpi.totalConversions >= kpi.targetConversions * 0.7 ? "warning" : "critical"}
            />
            <KPICard
              title="Cost per Conversion"
              value={kpi.costPerConversion}
              format="currency"
              icon={MousePointerClick}
              progress={(kpi.targetCPC / kpi.costPerConversion) * 100}
              status={kpi.costPerConversion <= kpi.targetCPC ? "healthy" : kpi.costPerConversion <= kpi.targetCPC * 1.2 ? "warning" : "critical"}
            />
            <KPICard
              title="Conversion Rate"
              value={kpi.conversionRate}
              format="percent"
              icon={BarChart3}
              progress={(kpi.conversionRate / kpi.targetCVR) * 100}
              status={kpi.conversionRate >= kpi.targetCVR ? "healthy" : kpi.conversionRate >= kpi.targetCVR * 0.7 ? "warning" : "critical"}
            />
          </div>
        </section>

        {/* Campaign Performance */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Campaign Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {campaigns.map((campaign: CampaignData) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Trend Chart */}
          <div className="chart-container">
            <h3 className="text-lg font-semibold text-foreground mb-4">Daily Spend vs Conversions</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrends}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.gold} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.gold} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="convGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.teal} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.teal} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.01 285)" />
                  <XAxis dataKey="date" stroke="oklch(0.6 0.015 285)" fontSize={12} />
                  <YAxis yAxisId="left" stroke="oklch(0.6 0.015 285)" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="oklch(0.6 0.015 285)" fontSize={12} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="spend"
                    name="Spend (฿)"
                    stroke={CHART_COLORS.gold}
                    fill="url(#spendGradient)"
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="conversions"
                    name="Conversions"
                    stroke={CHART_COLORS.teal}
                    fill="url(#convGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Conversions by Campaign */}
          <div className="chart-container">
            <h3 className="text-lg font-semibold text-foreground mb-4">Conversions by Campaign</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={campaigns.map((c: CampaignData) => {
                    const parts = c.name.split('|').map(s => s.trim());
                    const shortName = parts.length >= 3 ? parts[2] : (parts.length >= 2 ? parts[1] : c.name);
                    return { ...c, shortName: shortName.length > 12 ? shortName.substring(0, 12) + '...' : shortName };
                  })} 
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.01 285)" />
                  <XAxis type="number" stroke="oklch(0.6 0.015 285)" fontSize={12} />
                  <YAxis dataKey="shortName" type="category" stroke="oklch(0.6 0.015 285)" fontSize={11} width={100} />
                  <RechartsTooltip 
                    content={({ payload }: { payload?: any[] }) => {
                      if (!payload || !payload.length) return null;
                      const data = payload[0]?.payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
                          <p className="text-sm font-medium text-foreground mb-1">{data?.name}</p>
                          <p className="text-sm text-primary">Conversions: {data?.conversions}</p>
                          <p className="text-sm text-muted-foreground">Spend: ฿{data?.spend?.toLocaleString()}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="conversions" name="Conversions" fill={CHART_COLORS.gold} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Budget Distribution Pie */}
          <div className="chart-container">
            <h3 className="text-lg font-semibold text-foreground mb-4">Budget Distribution</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry: { name: string; value: number }, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={({ payload }: { payload?: any[] }) => {
                      if (!payload || !payload.length) return null;
                      const data = payload[0]?.payload;
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
                          <p className="text-sm font-medium text-foreground mb-1">{data?.fullName || data?.name}</p>
                          <p className="text-sm" style={{ color: payload[0]?.payload?.fill }}>
                            Spend: ฿{data?.value?.toLocaleString()}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend 
                    layout="horizontal" 
                    align="center" 
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    formatter={(value: string) => <span className="text-muted-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alerts Panel */}
          <div className="chart-container">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Optimization Alerts</h3>
              <Badge variant="outline" className="text-primary border-primary">
                {alerts.length} alerts
              </Badge>
            </div>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
              {alerts.length > 0 ? (
                alerts.map((alert: AlertData) => <AlertItem key={alert.id} alert={alert} />)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
                  <p>All campaigns are performing well!</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Google Analytics Section */}
        <section>
          <AnalyticsSection />
        </section>

        {/* Event Goals & Conversions Section */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Event Goals &amp; Conversions</h2>
          {convLoading ? (
            <div className="chart-container flex items-center justify-center h-32">
              <RefreshCw className="w-5 h-5 text-primary animate-spin mr-2" />
              <span className="text-muted-foreground text-sm">Loading conversion data...</span>
            </div>
          ) : !conversionData?.success || (conversionData.actions.length === 0 && conversionData.dailyBreakdown.length === 0) ? (
            <div className="chart-container flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Target className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No conversion data available for this period.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Conversion Actions Table */}
              <div className="chart-container">
                <h3 className="text-base font-semibold text-foreground mb-4">Conversion Actions</h3>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Event / Goal</th>
                        <th>Category</th>
                        <th className="text-right">Conversions</th>
                        <th className="text-right">All Conv.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversionData.actions.map((action, i) => {
                        const categoryColors: Record<string, string> = {
                          PHONE_CALL: "text-green-400",
                          SUBMIT_LEAD_FORM: "text-blue-400",
                          PURCHASE: "text-yellow-400",
                          PAGE_VIEW: "text-purple-400",
                          DOWNLOAD: "text-orange-400",
                        };
                        const catColor = categoryColors[action.category] || "text-muted-foreground";
                        const catLabel = action.category
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (c: string) => c.toUpperCase());
                        return (
                          <tr key={i}>
                            <td className="font-medium text-foreground">{action.name}</td>
                            <td><span className={`text-xs font-medium ${catColor}`}>{catLabel}</span></td>
                            <td className="text-right font-semibold text-primary">{Math.round(action.conversions)}</td>
                            <td className="text-right text-muted-foreground">{Math.round(action.allConversions)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Conversion Trend Chart */}
              <div className="chart-container">
                <h3 className="text-base font-semibold text-foreground mb-4">Conversion Trend</h3>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={(() => {
                        // Aggregate daily breakdown by date
                        const dateMap = new Map<string, { date: string; conversions: number; allConversions: number }>();
                        conversionData.dailyBreakdown.forEach((row) => {
                          if (!dateMap.has(row.date)) {
                            dateMap.set(row.date, { date: row.date, conversions: 0, allConversions: 0 });
                          }
                          const d = dateMap.get(row.date)!;
                          d.conversions += row.conversions;
                          d.allConversions += row.allConversions;
                        });
                        return Array.from(dateMap.values())
                          .sort((a, b) => a.date.localeCompare(b.date))
                          .map(d => ({
                            ...d,
                            date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                            conversions: Math.round(d.conversions),
                            allConversions: Math.round(d.allConversions),
                          }));
                      })()}
                    >
                      <defs>
                        <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.gold} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.gold} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="allConvGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.teal} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.teal} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.01 285)" />
                      <XAxis dataKey="date" stroke="oklch(0.6 0.015 285)" fontSize={11} tick={{ fill: "oklch(0.6 0.015 285)" }} />
                      <YAxis stroke="oklch(0.6 0.015 285)" fontSize={11} tick={{ fill: "oklch(0.6 0.015 285)" }} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Area type="monotone" dataKey="conversions" name="Conversions" stroke={CHART_COLORS.gold} fill="url(#convGrad)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="allConversions" name="All Conversions" stroke={CHART_COLORS.teal} fill="url(#allConvGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Per-Campaign Conversion Breakdown */}
              <div className="chart-container lg:col-span-2">
                <h3 className="text-base font-semibold text-foreground mb-4">Conversions by Campaign</h3>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Campaign</th>
                        <th className="text-right">Conversions</th>
                        <th className="text-right">All Conversions</th>
                        <th className="text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const campMap = new Map<string, { campaign: string; conversions: number; allConversions: number }>();
                        conversionData.dailyBreakdown.forEach((row) => {
                          if (!campMap.has(row.campaign)) {
                            campMap.set(row.campaign, { campaign: row.campaign, conversions: 0, allConversions: 0 });
                          }
                          const d = campMap.get(row.campaign)!;
                          d.conversions += row.conversions;
                          d.allConversions += row.allConversions;
                        });
                        const rows = Array.from(campMap.values()).sort((a, b) => b.allConversions - a.allConversions);
                        const totalAll = rows.reduce((s, r) => s + r.allConversions, 0);
                        return rows.map((row, i) => (
                          <tr key={i}>
                            <td className="font-medium text-foreground max-w-[260px] truncate">{row.campaign}</td>
                            <td className="text-right font-semibold text-primary">{Math.round(row.conversions)}</td>
                            <td className="text-right text-muted-foreground">{Math.round(row.allConversions)}</td>
                            <td className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${totalAll > 0 ? (row.allConversions / totalAll) * 100 : 0}%`, background: CHART_COLORS.gold }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-10 text-right">
                                  {totalAll > 0 ? ((row.allConversions / totalAll) * 100).toFixed(1) : 0}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Keywords Table */}
        <section className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Top Keywords Performance</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Info className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click column headers to sort</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Match Type</th>
                  <SortableHeader label="Quality Score" sortKey="qualityScore" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Impressions" sortKey="impressions" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Clicks" sortKey="clicks" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Conversions" sortKey="conversions" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="CPC" sortKey="cpc" currentSort={sortConfig} onSort={handleSort} />
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedKeywords.map((keyword) => (
                  <tr key={keyword.id}>
                    <td className="font-medium text-foreground">{keyword.keyword}</td>
                    <td>
                      <Badge variant="outline" className="text-xs capitalize">
                        {keyword.matchType}
                      </Badge>
                    </td>
                    <td>
                      {keyword.qualityScore > 0 ? (
                        <span
                          className={`font-medium ${
                            keyword.qualityScore >= 7
                              ? "text-green-400"
                              : keyword.qualityScore >= 5
                                ? "text-yellow-400"
                                : "text-red-400"
                          }`}
                        >
                          {keyword.qualityScore}/10
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td>{keyword.impressions.toLocaleString()}</td>
                    <td>{keyword.clicks.toLocaleString()}</td>
                    <td className="font-medium text-primary">{keyword.conversions}</td>
                    <td>฿{keyword.cpc.toFixed(0)}</td>
                    <td>
                      <Badge
                        className={keyword.status === "active" ? "alert-badge-success" : "alert-badge-warning"}
                      >
                        {keyword.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
