import { useGetDashboardSummary, useGetTodayLog, useListActivities, useUpsertLogEntry, getGetDashboardSummaryQueryKey, getGetTodayLogQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Activity as ActivityIcon, CheckCircle2, Target, Flame } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: activities, isLoading: isLoadingActivities } = useListActivities();
  const { data: todayLog, isLoading: isLoadingLog } = useGetTodayLog();
  const upsertMutation = useUpsertLogEntry();
  const queryClient = useQueryClient();

  const [hoursInputs, setHoursInputs] = useState<Record<number, string>>({});

  const handleToggleActivity = (activityId: number, currentlyCompleted: boolean) => {
    const hours = hoursInputs[activityId] ? Number(hoursInputs[activityId]) : undefined;
    upsertMutation.mutate({
      data: {
        activityId,
        completed: !currentlyCompleted,
        hoursSpent: hours
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTodayLogQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    });
  };

  const handleUpdateHours = (activityId: number, isCompleted: boolean) => {
    const hours = hoursInputs[activityId] ? Number(hoursInputs[activityId]) : undefined;
    if (hours === undefined) return;
    
    upsertMutation.mutate({
      data: {
        activityId,
        completed: isCompleted,
        hoursSpent: hours
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTodayLogQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    });
  };

  if (isLoadingSummary || isLoadingActivities || isLoadingLog) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const scorePct = summary ? Math.round((summary.todayScore / 100) * 100) : 0;
  const progressPct = summary && summary.totalToday > 0 ? (summary.completedToday / summary.totalToday) * 100 : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Score</CardTitle>
            <Target className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scorePct}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              {summary?.weeklyImprovement}% vs last week
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Streak</CardTitle>
            <Flame className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary?.currentStreak} days</div>
            <div className="text-xs text-muted-foreground mt-1">
              Longest: {summary?.longestStreak} days
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activities Done</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary?.completedToday} / {summary?.totalToday}</div>
            <Progress value={progressPct} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Health (BMI)</CardTitle>
            <ActivityIcon className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary?.bmi ? summary.bmi.toFixed(1) : '--'}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary?.bmiCategory || 'Update profile to calculate'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Log Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily Activities</CardTitle>
            <CardDescription>Track what you've accomplished today</CardDescription>
          </CardHeader>
          <CardContent>
            {activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const logEntry = todayLog?.find(log => log.activityId === activity.id);
                  const isCompleted = logEntry?.completed || false;
                  const hoursSpent = logEntry?.hoursSpent || 0;
                  
                  return (
                    <div key={activity.id} className={`p-4 rounded-lg border transition-all ${isCompleted ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Checkbox 
                            checked={isCompleted} 
                            onCheckedChange={() => handleToggleActivity(activity.id, isCompleted)} 
                            id={`activity-${activity.id}`}
                          />
                          <label htmlFor={`activity-${activity.id}`} className={`font-medium cursor-pointer ${isCompleted ? 'text-foreground line-through opacity-70' : 'text-foreground'}`}>
                            {activity.name}
                          </label>
                          {activity.isProductive && (
                            <span className="text-[10px] uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">
                              Productive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Input 
                            type="number" 
                            step="0.5"
                            placeholder={hoursSpent ? String(hoursSpent) : "hrs"} 
                            className="w-16 h-8 text-sm"
                            value={hoursInputs[activity.id] !== undefined ? hoursInputs[activity.id] : ''}
                            onChange={(e) => setHoursInputs({...hoursInputs, [activity.id]: e.target.value})}
                          />
                          <Button size="sm" variant="secondary" className="h-8" onClick={() => handleUpdateHours(activity.id, isCompleted)}>
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No activities created yet.</p>
                <Button variant="outline" onClick={() => window.location.href = '/activities'}>
                  Manage Activities
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Time Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Productive Hours</span>
                    <span className="font-bold">{summary?.productiveHoursToday || 0}h</span>
                  </div>
                  <Progress value={summary && summary.totalHoursToday ? ((summary.productiveHoursToday || 0) / summary.totalHoursToday) * 100 : 0} className="h-2 bg-secondary" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Total Tracked</span>
                    <span className="font-bold">{summary?.totalHoursToday || 0}h</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {summary?.badges && summary.badges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Badges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {summary.badges.map((badge, i) => (
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
