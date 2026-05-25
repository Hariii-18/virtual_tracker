import { useState } from "react";
import {
  useGetDashboardSummary, useGetTodayLog, useListActivities,
  useUpsertLogEntry, getGetDashboardSummaryQueryKey, getGetTodayLogQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Activity as ActivityIcon, CheckCircle2, Target, Flame, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useGuest } from "@/contexts/guest-context";
import { Link } from "wouter";
import { formatDuration, parseHoursMinutes } from "@/lib/format";

const MAX_DAILY_HOURS = 24;

interface ActivityDef {
  id: number;
  name: string;
  isProductive: boolean;
  targetHours?: number | null;
}

interface LogEntry {
  activityId: number;
  completed: boolean;
  hoursSpent?: number | null;
}

function ActivityRow({
  activity,
  logEntry,
  totalHoursToday,
  onSetHoursError,
  onToggle,
  onSaveHours,
}: {
  activity: ActivityDef;
  logEntry?: LogEntry;
  totalHoursToday: number;
  onSetHoursError: (e: string | null) => void;
  onToggle: (activityId: number, currentlyCompleted: boolean, decimalHours?: number) => void;
  onSaveHours: (activityId: number, isCompleted: boolean, decimalHours: number) => void;
}) {
  const [hInput, setHInput] = useState("");
  const [mInput, setMInput] = useState("");

  const isCompleted = logEntry?.completed ?? false;
  const hoursSpent = logEntry?.hoursSpent ?? 0;
  const hasInput = hInput !== "" || mInput !== "";
  const displayTime = hoursSpent > 0 ? formatDuration(hoursSpent) : null;

  const getDecimalHours = () => parseHoursMinutes(hInput, mInput);

  const validateAndGetTotal = (decimalHours: number): boolean => {
    const existing = logEntry?.hoursSpent ?? 0;
    const newTotal = totalHoursToday - existing + decimalHours;
    if (newTotal > MAX_DAILY_HOURS) {
      onSetHoursError(`Total daily activity time cannot exceed ${MAX_DAILY_HOURS} hours.`);
      return false;
    }
    return true;
  };

  const clearInputs = () => { setHInput(""); setMInput(""); };

  const handleSave = () => {
    const dec = getDecimalHours();
    if (dec <= 0) return;
    if (!validateAndGetTotal(dec)) return;
    onSetHoursError(null);
    onSaveHours(activity.id, isCompleted, dec);
    clearInputs();
  };

  const handleToggle = () => {
    if (hasInput) {
      const dec = getDecimalHours();
      if (dec > 0 && !validateAndGetTotal(dec)) return;
      onSetHoursError(null);
      onToggle(activity.id, isCompleted, dec > 0 ? dec : undefined);
      clearInputs();
    } else {
      onSetHoursError(null);
      onToggle(activity.id, isCompleted, undefined);
    }
  };

  return (
    <div className={`p-3 md:p-4 rounded-lg border transition-all ${isCompleted ? "bg-primary/5 border-primary/20" : "bg-card border-border"}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <Checkbox checked={isCompleted} onCheckedChange={handleToggle} />
          <label
            className={`font-medium text-sm cursor-pointer truncate ${isCompleted ? "line-through opacity-70" : ""}`}
            onClick={handleToggle}
          >
            {activity.name}
          </label>
          {activity.isProductive && (
            <span className="hidden sm:inline text-[10px] uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
              Prod
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {displayTime && !hasInput && (
            <span className="text-xs text-muted-foreground mr-1 hidden sm:inline">{displayTime}</span>
          )}
          <Input
            type="number"
            min="0"
            max="24"
            placeholder="h"
            className="w-11 h-8 text-sm text-center px-1"
            value={hInput}
            onChange={(e) => setHInput(e.target.value)}
          />
          <span className="text-muted-foreground text-xs font-medium">h</span>
          <Input
            type="number"
            min="0"
            max="59"
            placeholder="m"
            className="w-11 h-8 text-sm text-center px-1"
            value={mInput}
            onChange={(e) => setMInput(e.target.value)}
          />
          <span className="text-muted-foreground text-xs font-medium">m</span>
          <Button size="sm" variant="secondary" className="h-8 px-2 text-xs ml-0.5" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function GuestDashboard() {
  const { activities, todayLogs, upsertLog } = useGuest();
  const [hoursError, setHoursError] = useState<string | null>(null);

  const completedToday = todayLogs.filter(l => l.completed).length;
  const totalToday = activities.length;
  const productiveHoursToday = todayLogs
    .filter(l => l.completed && activities.find(a => a.id === l.activityId)?.isProductive)
    .reduce((s, l) => s + (l.hoursSpent ?? 0), 0);
  const totalHoursToday = todayLogs.reduce((s, l) => s + (l.hoursSpent ?? 0), 0);
  const progressPct = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

  const handleToggle = (activityId: number, currentlyCompleted: boolean, decimalHours?: number) => {
    upsertLog(activityId, !currentlyCompleted, decimalHours);
  };

  const handleSaveHours = (activityId: number, isCompleted: boolean, decimalHours: number) => {
    upsertLog(activityId, isCompleted, decimalHours);
  };

  return (
    <DashboardView
      todayScore={0}
      currentStreak={0}
      longestStreak={0}
      weeklyImprovement={0}
      completedToday={completedToday}
      totalToday={totalToday}
      productiveHoursToday={productiveHoursToday}
      totalHoursToday={totalHoursToday}
      bmi={null}
      bmiCategory={null}
      badges={[]}
      activities={activities}
      todayLog={todayLogs}
      hoursError={hoursError}
      onSetHoursError={setHoursError}
      onToggle={handleToggle}
      onSaveHours={handleSaveHours}
      progressPct={progressPct}
    />
  );
}

function AuthDashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: activities, isLoading: isLoadingActivities } = useListActivities();
  const { data: todayLog, isLoading: isLoadingLog } = useGetTodayLog();
  const upsertMutation = useUpsertLogEntry();
  const queryClient = useQueryClient();
  const [hoursError, setHoursError] = useState<string | null>(null);

  if (isLoadingSummary || isLoadingActivities || isLoadingLog) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalHoursToday = (todayLog ?? []).reduce((s, l) => s + (l.hoursSpent ?? 0), 0);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetTodayLogQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const handleToggle = (activityId: number, currentlyCompleted: boolean, decimalHours?: number) => {
    upsertMutation.mutate(
      { data: { activityId, completed: !currentlyCompleted, hoursSpent: decimalHours } },
      { onSuccess: invalidate }
    );
  };

  const handleSaveHours = (activityId: number, isCompleted: boolean, decimalHours: number) => {
    upsertMutation.mutate(
      { data: { activityId, completed: isCompleted, hoursSpent: decimalHours } },
      { onSuccess: invalidate }
    );
  };

  const progressPct = summary && summary.totalToday > 0
    ? (summary.completedToday / summary.totalToday) * 100 : 0;

  return (
    <DashboardView
      todayScore={summary?.todayScore ?? 0}
      currentStreak={summary?.currentStreak ?? 0}
      longestStreak={summary?.longestStreak ?? 0}
      weeklyImprovement={summary?.weeklyImprovement ?? 0}
      completedToday={summary?.completedToday ?? 0}
      totalToday={summary?.totalToday ?? 0}
      productiveHoursToday={summary?.productiveHoursToday ?? 0}
      totalHoursToday={summary?.totalHoursToday ?? 0}
      bmi={summary?.bmi ?? null}
      bmiCategory={summary?.bmiCategory ?? null}
      badges={summary?.badges ?? []}
      activities={activities ?? []}
      todayLog={todayLog ?? []}
      hoursError={hoursError}
      onSetHoursError={setHoursError}
      onToggle={handleToggle}
      onSaveHours={handleSaveHours}
      progressPct={progressPct}
    />
  );
}

interface DashboardViewProps {
  todayScore: number;
  currentStreak: number;
  longestStreak: number;
  weeklyImprovement: number;
  completedToday: number;
  totalToday: number;
  productiveHoursToday: number;
  totalHoursToday: number;
  bmi: number | null;
  bmiCategory: string | null;
  badges: string[];
  activities: ActivityDef[];
  todayLog: LogEntry[];
  hoursError: string | null;
  onSetHoursError: (e: string | null) => void;
  onToggle: (activityId: number, currentlyCompleted: boolean, decimalHours?: number) => void;
  onSaveHours: (activityId: number, isCompleted: boolean, decimalHours: number) => void;
  progressPct: number;
}

function DashboardView({
  todayScore, currentStreak, longestStreak, weeklyImprovement,
  completedToday, totalToday, productiveHoursToday, totalHoursToday,
  bmi, bmiCategory, badges, activities, todayLog, hoursError,
  onSetHoursError, onToggle, onSaveHours, progressPct,
}: DashboardViewProps) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Today's Score</CardTitle>
            <Target className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl md:text-3xl font-bold">{todayScore}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              {weeklyImprovement}% vs last week
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Streak</CardTitle>
            <Flame className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl md:text-3xl font-bold">{currentStreak} days</div>
            <div className="text-xs text-muted-foreground mt-1">Longest: {longestStreak} days</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Done Today</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl md:text-3xl font-bold">{completedToday} / {totalToday}</div>
            <Progress value={progressPct} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">BMI</CardTitle>
            <ActivityIcon className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl md:text-3xl font-bold">{bmi ? bmi.toFixed(1) : "--"}</div>
            <div className="text-xs text-muted-foreground mt-1">{bmiCategory || "Update profile"}</div>
          </CardContent>
        </Card>
      </div>

      {hoursError && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {hoursError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily Activities</CardTitle>
            <CardDescription>Track what you've accomplished today · enter hours + minutes then Save</CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((activity) => {
                  const logEntry = todayLog.find(log => log.activityId === activity.id);
                  return (
                    <ActivityRow
                      key={activity.id}
                      activity={activity}
                      logEntry={logEntry}
                      totalHoursToday={totalHoursToday}
                      onSetHoursError={onSetHoursError}
                      onToggle={onToggle}
                      onSaveHours={onSaveHours}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No activities created yet.</p>
                <Link href="/activities">
                  <Button variant="outline">Manage Activities</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Time Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Productive</span>
                    <span className="font-bold">{formatDuration(productiveHoursToday)}</span>
                  </div>
                  <Progress
                    value={totalHoursToday ? (productiveHoursToday / totalHoursToday) * 100 : 0}
                    className="h-2 bg-secondary"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Total Tracked</span>
                    <span className="font-bold">{formatDuration(totalHoursToday)} / {MAX_DAILY_HOURS}h</span>
                  </div>
                  <Progress value={(totalHoursToday / MAX_DAILY_HOURS) * 100} className="h-2 bg-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {badges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Badges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {badges.map((badge, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent text-accent-foreground border">
                      🏆 {badge}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isGuest } = useGuest();
  return isGuest ? <GuestDashboard /> : <AuthDashboard />;
}
