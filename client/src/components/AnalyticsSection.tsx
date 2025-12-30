import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Eye,
  Clock,
  TrendingUp,
  Search,
  Globe,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Activity,
  Target,
  Phone,
  FileText,
  MousePointerClick,
  Zap,
} from "lucide-react";
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

// Chart colors
const CHART_COLORS = {
  organic: "oklch(0.7 0.18 145)", // Green for organic
  paid: "oklch(0.78 0.12 85)", // Gold for paid
  direct: "oklch(0.55 0.15 250)", // Blue for direct
  referral: "oklch(0.7 0.15 45)", // Orange for referral
  social: "oklch(0.65 0.2 300)", // Purple for social
  email: "oklch(0.65 0.15 165)", // Teal for email
};

const CHANNEL_COLORS: Record<string, string> = {
  "Organic Search": CHART_COLORS.organic,
  "Paid Search": CHART_COLORS.paid,
  "Direct": CHART_COLORS.direct,
  "Referral": CHART_COLORS.referral,
  "Social": CHART_COLORS.social,
  "Email": CHART_COLORS.email,
  "Unassigned": "oklch(0.5 0.05 285)",
  "(Other)": "oklch(0.5 0.05 285)",
};

// Metric Card Component
function MetricCard({
  title,
  value,
  icon: Icon,
  format = "number",
  subtitle,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  format?: "number" | "percent" | "duration";
  subtitle?: string;
  trend?: { direction: "up" | "down"; value: number };
}) {
  const formatValue = (val: number) => {
    switch (format) {
      case "percent":
        return `${val.toFixed(1)}%`;
      case "duration":
        const minutes = Math.floor(val / 60);
        const seconds = Math.floor(val % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
      default:
        return val.toLocaleString();
    }
  };

  return (
    <div className="bg-card/50 rounded-xl border border-border/50 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-foreground">{formatValue(value)}</span>
        {trend && (
          <span
            className={`flex items-center text-sm font-medium ${
              trend.direction === "up" ? "text-green-400" : "text-red-400"
            }`}
          >
            {trend.direction === "up" ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {trend.value.toFixed(1)}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

// Custom Tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// Event icon mapping
const EVENT_ICONS: Record<string, React.ElementType> = {
  click: MousePointerClick,
  phone_call: Phone,
  form_submit: FileText,
  generate_lead: Target,
  scroll: Eye,
  default: Zap,
};

function getEventIcon(eventName: string): React.ElementType {
  const lowerName = eventName.toLowerCase();
  for (const [key, icon] of Object.entries(EVENT_ICONS)) {
    if (lowerName.includes(key)) return icon;
  }
  return EVENT_ICONS.default;
}

// Format event name for display
function formatEventName(eventName: string): string {
  return eventName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

// Main Analytics Section Component
export default function AnalyticsSection() {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch combined analytics data
  const { data: analyticsData, isLoading, error } = trpc.analytics.getCombinedData.useQuery({
    startDate: "30daysAgo",
    endDate: "today",
  });

  // Fetch event goals
  const { data: eventGoalsData, isLoading: eventsLoading } = trpc.analytics.getEventGoals.useQuery({
    startDate: "30daysAgo",
    endDate: "today",
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Website Analytics (Google Analytics)</h2>
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Loading...
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card/50 rounded-xl border border-border/50 p-4 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !analyticsData?.success || !analyticsData?.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Website Analytics (Google Analytics)</h2>
          <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
            Connection Error
          </Badge>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">
            {error?.message || analyticsData?.error || "Failed to load analytics data"}
          </p>
        </div>
      </div>
    );
  }

  const { overview, channels, dailyMetrics, trafficSources, comparison } = analyticsData.data;

  // Prepare channel pie data
  const channelPieData = channels.slice(0, 6).map((c) => ({
    name: c.channel,
    value: c.users,
    color: CHANNEL_COLORS[c.channel] || "oklch(0.5 0.05 285)",
  }));

  // Calculate organic vs paid comparison
  const organicUsers = comparison.organic.users;
  const paidUsers = comparison.paid.users;
  const totalComparisonUsers = organicUsers + paidUsers;
  const organicPercent = totalComparisonUsers > 0 ? (organicUsers / totalComparisonUsers) * 100 : 0;
  const paidPercent = totalComparisonUsers > 0 ? (paidUsers / totalComparisonUsers) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Website Analytics</h2>
          <p className="text-sm text-muted-foreground">Google Analytics 4 - Last 30 Days</p>
        </div>
        <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
          <Activity className="w-3 h-3 mr-1" />
          Live Data
        </Badge>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Total Users"
          value={overview.totalUsers}
          icon={Users}
        />
        <MetricCard
          title="New Users"
          value={overview.newUsers}
          icon={Users}
          subtitle={`${((overview.newUsers / overview.totalUsers) * 100).toFixed(0)}% of total`}
        />
        <MetricCard
          title="Sessions"
          value={overview.sessions}
          icon={Activity}
        />
        <MetricCard
          title="Page Views"
          value={overview.pageViews}
          icon={Eye}
        />
        <MetricCard
          title="Avg. Duration"
          value={overview.avgSessionDuration}
          icon={Clock}
          format="duration"
        />
        <MetricCard
          title="Engagement Rate"
          value={overview.engagementRate}
          icon={TrendingUp}
          format="percent"
        />
      </div>

      {/* SEO vs Paid Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organic vs Paid Bar */}
        <div className="bg-card rounded-xl border border-border/50 shadow-lg p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            SEO vs Paid Traffic
          </h3>
          
          <div className="space-y-4">
            {/* Organic */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.organic }} />
                  Organic Search (SEO)
                </span>
                <span className="font-medium text-foreground">
                  {organicUsers.toLocaleString()} users ({organicPercent.toFixed(1)}%)
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${organicPercent}%`, backgroundColor: CHART_COLORS.organic }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>Sessions: {comparison.organic.sessions.toLocaleString()}</span>
                <span>Conversions: {comparison.organic.conversions}</span>
                <span>Bounce: {comparison.organic.bounceRate.toFixed(1)}%</span>
              </div>
            </div>

            {/* Paid */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.paid }} />
                  Paid Search (Ads)
                </span>
                <span className="font-medium text-foreground">
                  {paidUsers.toLocaleString()} users ({paidPercent.toFixed(1)}%)
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${paidPercent}%`, backgroundColor: CHART_COLORS.paid }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>Sessions: {comparison.paid.sessions.toLocaleString()}</span>
                <span>Conversions: {comparison.paid.conversions}</span>
                <span>Bounce: {comparison.paid.bounceRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Search Traffic</span>
              <span className="font-semibold text-foreground">{totalComparisonUsers.toLocaleString()} users</span>
            </div>
          </div>
        </div>

        {/* Channel Distribution Pie */}
        <div className="bg-card rounded-xl border border-border/50 shadow-lg p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Traffic Channels
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelPieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {channelPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  content={({ payload }: { payload?: any[] }) => {
                    if (!payload || !payload.length) return null;
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
                        <p className="text-sm font-medium text-foreground mb-1">{data?.name}</p>
                        <p className="text-sm" style={{ color: data?.color }}>
                          Users: {data?.value?.toLocaleString()}
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                  formatter={(value: string) => <span className="text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Daily Trend - Organic vs Paid */}
      <div className="bg-card rounded-xl border border-border/50 shadow-lg p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Daily Traffic Trend (Organic vs Paid)
        </h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyMetrics}>
              <defs>
                <linearGradient id="organicGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.organic} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.organic} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.paid} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.paid} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.01 285)" />
              <XAxis
                dataKey="date"
                stroke="oklch(0.6 0.015 285)"
                fontSize={11}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis stroke="oklch(0.6 0.015 285)" fontSize={12} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="organicUsers"
                name="Organic (SEO)"
                stroke={CHART_COLORS.organic}
                fill="url(#organicGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="paidUsers"
                name="Paid (Ads)"
                stroke={CHART_COLORS.paid}
                fill="url(#paidGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Event Goals Section */}
      <div className="bg-card rounded-xl border border-border/50 shadow-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Event Goals & Conversions
          </h3>
          {eventsLoading && (
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        
        {eventGoalsData?.success && eventGoalsData.data.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {eventGoalsData.data.map((event, index) => {
              const EventIcon = getEventIcon(event.eventName);
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border transition-all ${
                    event.isConversion
                      ? "bg-primary/10 border-primary/30 hover:border-primary/50"
                      : "bg-muted/30 border-border/50 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-md ${
                      event.isConversion ? "bg-primary/20" : "bg-muted"
                    }`}>
                      <EventIcon className={`w-4 h-4 ${
                        event.isConversion ? "text-primary" : "text-muted-foreground"
                      }`} />
                    </div>
                    {event.isConversion && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30">
                        Key Event
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate" title={event.eventName}>
                    {formatEventName(event.eventName)}
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold text-foreground">
                      {event.eventCount.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      events
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.totalUsers.toLocaleString()} users • {event.eventCountPerUser.toFixed(1)}/user
                  </p>
                </div>
              );
            })}
          </div>
        ) : eventGoalsData?.success && eventGoalsData.data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No event goals configured in GA4</p>
            <p className="text-sm mt-1">Set up key events in Google Analytics to track conversions</p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-30" />
            <p>Loading event goals...</p>
          </div>
        )}
      </div>

      {/* Top Traffic Sources Table */}
      <div className="bg-card rounded-xl border border-border/50 shadow-lg p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4">Top Traffic Sources</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Medium</th>
                <th>Users</th>
                <th>Sessions</th>
                <th>Conversions</th>
              </tr>
            </thead>
            <tbody>
              {trafficSources.slice(0, 10).map((source, index) => (
                <tr key={index}>
                  <td className="font-medium text-foreground">{source.source}</td>
                  <td>
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: source.medium === "organic" ? CHART_COLORS.organic :
                                     source.medium === "cpc" ? CHART_COLORS.paid :
                                     "oklch(0.5 0.05 285)",
                        color: source.medium === "organic" ? CHART_COLORS.organic :
                               source.medium === "cpc" ? CHART_COLORS.paid :
                               "oklch(0.6 0.05 285)",
                      }}
                    >
                      {source.medium}
                    </Badge>
                  </td>
                  <td>{source.users.toLocaleString()}</td>
                  <td>{source.sessions.toLocaleString()}</td>
                  <td className="font-medium text-primary">{source.conversions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
