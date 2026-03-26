import AnalyticsSection from "@/components/AnalyticsSection";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";

export default function Analytics() {
  const [dateRange, setDateRange] = useState<"daily" | "weekly" | "campaign">("weekly");

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Google Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Website traffic, user behavior, and SEO performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as "daily" | "weekly" | "campaign")}>
            <SelectTrigger className="w-44 bg-card border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily View</SelectItem>
              <SelectItem value="weekly">Weekly View</SelectItem>
              <SelectItem value="campaign">Campaign to Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Analytics Section */}
      <AnalyticsSection dateRange={dateRange} />
    </div>
  );
}
