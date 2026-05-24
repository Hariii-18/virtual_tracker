import { useState } from "react";
import { useGetWeeklyAnalytics, useGetMonthlyAnalytics, useGetActivityBreakdown, GetActivityBreakdownDateRange } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, Minus, Activity, Clock, Star } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { useGuest } from "@/contexts/guest-context";

const CHART_COLORS = [
  "#6366f1", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

const DATE_RANGE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "week" },
  { label: "Last 30 Days", value: "month" },
  { label: "This Month", value: "thisMonth" },
];

function GuestAnalytics() {
  const { allLogs, activities } = useGuest();

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
        <p className="text-muted-foreground">Your productivity insights will appear here as you log activities.</p>
      </div>
      {allLogs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Activity className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No data yet</p>
            <p className="text-muted-foreground mt-1">Start logging activities from the Dashboard to see analytics here.</p>
          </CardContent>
        </Card>
      ) : (
        <GuestBreakdown logs={allLogs} activities={activities} />
      )}
    </div>
  );
}

function GuestBreakdown({
  logs,
  activities,
}: {
  logs: Array<{ activityId: number; completed: boolean; hoursSpent: number | null }>;
  activities: Array<{ id: number; name: string; isProductive: boolean; color: string | null }>;
}) {
  const activityMap = new Map(activities.map(a => [a.id, a]));
  const buckets = new Map<string, { hours: number; isProductive: boolean; color: string }>();

  for (const log of logs) {
    if (!log.completed) continue;
    const act = activityMap.get(log.activityId);
    if (!act) continue;
    if (!buckets.has(act.name)) {
      buckets.set(act.name, { hours: 0, isProductive: act.isProductive, color: act.color ?? "#6366f1" });
    }
    buckets.get(act.name)!.hours += log.hoursSpent ?? 0;
  }

  const items = Array.from(buckets.entries()).map(([name, d]) => ({
    name,
    hours: Math.round(d.hours * 10) / 10,
    isProductive: d.isProductive,
    color: d.color,
    pct: 0,
  }));
  const total = items.reduce((s, i) => s + i.hours, 0);
  items.forEach(i => { i.pct = total > 0 ? Math.round((i.hours / total) * 100) : 0; });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Distribution (All Time)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={items} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="hours" stroke="none">
                  {items.map((e, i) => <Cell key={i} fill={e.color ?? CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} formatter={(v: number) => [`${v}h`, "Hours"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color ?? CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span>{item.name}</span>
                </div>
                <span className="text-muted-foreground">{item.hours}h ({item.pct}%)</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AuthAnalytics() {
  const [dateRange, setDateRange] = useState<GetActivityBreakdownDateRange>(GetActivityBreakdownDateRange.month);
  const { data: weekly, isLoading: isLoadingWeekly } = useGetWeeklyAnalytics();
  const { data: monthly, isLoading: isLoadingMonthly } = useGetMonthlyAnalytics();
  const { data: breakdown, isLoading: isLoadingBreakdown } = useGetActivityBreakdown({ dateRange });

  if (isLoadingWeekly || isLoadingMonthly || isLoadingBreakdown) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const improvementPct = monthly?.improvementPct ?? 0;
  const ImprovementIcon = improvementPct > 0 ? TrendingUp : improvementPct < 0 ? TrendingDown : Minus;
  const improvementColor = improvementPct > 0 ? "text-green-500" : improvementPct < 0 ? "text-red-500" : "text-muted-foreground";

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
        <p className="text-muted-foreground">Deep dive into your performance metrics and time distribution.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Performance</CardTitle>
            <CardDescription>Productivity score per day (Avg: {weekly?.weeklyAvgScore ?? 0})</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {weekly?.days && weekly.days.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly.days}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="dayLabel" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Not enough data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Trend</CardTitle>
            <CardDescription>Weekly average scores over the past 4 weeks</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {monthly?.weeks && monthly.weeks.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly.weeks}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="weekLabel" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} />
                  <Area type="monotone" dataKey="avgScore" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Not enough data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Recap */}
      {monthly && (
        <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Monthly Recap
            </CardTitle>
            <CardDescription>How you've been doing over the past 28 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Consistency</p>
                <p className="text-2xl font-bold">{monthly.consistencyPct ?? 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">{monthly.totalActiveDays ?? 0} active days</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Avg Productive Hours</p>
                <p className="text-2xl font-bold">{monthly.avgProductiveHours ?? 0}h</p>
                <p className="text-xs text-muted-foreground mt-1">per active day</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Improvement</p>
                <div className="flex items-center gap-1">
                  <p className="text-2xl font-bold">{Math.abs(improvementPct)}%</p>
                  <ImprovementIcon className={`w-5 h-5 ${improvementColor}`} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">week 1 → week 4</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border/50">
                <Clock className="w-4 h-4 text-primary mb-1" />
                <p className="text-xs text-muted-foreground mb-1">Top Category</p>
                <p className="text-base font-bold truncate">{monthly.mostActiveCategory ?? "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">most time spent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Distribution with date range filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Time Distribution</CardTitle>
              <CardDescription>
                {breakdown?.productivePct ?? 0}% productive · {breakdown?.productiveHours ?? 0}h productive / {(breakdown?.productiveHours ?? 0) + (breakdown?.nonProductiveHours ?? 0)}h total
              </CardDescription>
            </div>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as GetActivityBreakdownDateRange)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {breakdown?.items && breakdown.items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdown.items}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="hours"
                      stroke="none"
                    >
                      {breakdown.items.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(value: number) => [`${value} hours`, "Time Spent"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {breakdown.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="truncate">{item.name}</span>
                      {item.isProductive && (
                        <span className="hidden sm:inline text-[10px] uppercase bg-primary/20 text-primary px-1.5 py-0.5 rounded-sm flex-shrink-0">Prod</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground flex-shrink-0 ml-2">
                      <span>{item.hours}h</span>
                      <span className="w-10 text-right">{item.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              No activities logged in this time range
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Analytics() {
  const { isGuest } = useGuest();
  return isGuest ? <GuestAnalytics /> : <AuthAnalytics />;
}
