import { Router, type IRouter } from "express";
import { db, logsTable, activitiesTable, profilesTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dayLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00Z");
  return date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

async function getLogsWithActivities(userId: number, startDate: string, endDate: string) {
  return db
    .select({
      id: logsTable.id,
      userId: logsTable.userId,
      activityId: logsTable.activityId,
      activityName: activitiesTable.name,
      date: logsTable.date,
      completed: logsTable.completed,
      hoursSpent: logsTable.hoursSpent,
      notes: logsTable.notes,
      productivityPct: logsTable.productivityPct,
      isProductive: activitiesTable.isProductive,
      color: activitiesTable.color,
    })
    .from(logsTable)
    .leftJoin(activitiesTable, eq(logsTable.activityId, activitiesTable.id))
    .where(and(eq(logsTable.userId, userId), gte(logsTable.date, startDate), lte(logsTable.date, endDate)));
}

function calcDayScore(entries: Array<{ completed: boolean; isProductive: boolean | null }>): number {
  if (entries.length === 0) return 0;
  const completed = entries.filter(e => e.completed).length;
  const productiveCompleted = entries.filter(e => e.completed && e.isProductive).length;
  const completionScore = (completed / entries.length) * 60;
  const productivityBonus = entries.filter(e => e.isProductive).length > 0
    ? (productiveCompleted / entries.filter(e => e.isProductive).length) * 40
    : 40;
  return Math.round(completionScore + productivityBonus);
}

function calcStreak(dailyData: Map<string, number>): { current: number; longest: number } {
  const today = dateStr(new Date());
  let current = 0;
  let longest = 0;
  let temp = 0;

  const allDates = Array.from(dailyData.keys()).sort();

  for (const date of allDates) {
    if ((dailyData.get(date) ?? 0) > 30) {
      temp++;
      if (temp > longest) longest = temp;
    } else {
      temp = 0;
    }
  }

  let checkDate = new Date(today);
  while (true) {
    const ds = dateStr(checkDate);
    const score = dailyData.get(ds) ?? 0;
    if (score > 30) {
      current++;
      checkDate = addDays(checkDate, -1);
    } else {
      break;
    }
  }

  return { current, longest };
}

router.get("/analytics/dashboard", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const today = dateStr(new Date());

  const todayEntries = await getLogsWithActivities(userId, today, today);
  const activities = await db.select().from(activitiesTable).where(eq(activitiesTable.userId, userId));
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));

  const todayScore = calcDayScore(todayEntries);
  const completedToday = todayEntries.filter(e => e.completed).length;
  const totalToday = activities.length;
  const productiveHoursToday = todayEntries
    .filter(e => e.completed && e.isProductive)
    .reduce((sum, e) => sum + (e.hoursSpent ?? 0), 0);
  const totalHoursToday = todayEntries.reduce((sum, e) => sum + (e.hoursSpent ?? 0), 0);

  // Last 30 days for streak
  const thirtyDaysAgo = dateStr(addDays(new Date(), -30));
  const recentEntries = await getLogsWithActivities(userId, thirtyDaysAgo, today);

  const dailyScores = new Map<string, number>();
  const byDate = new Map<string, typeof recentEntries>();
  for (const entry of recentEntries) {
    if (!byDate.has(entry.date)) byDate.set(entry.date, []);
    byDate.get(entry.date)!.push(entry);
  }
  for (const [date, entries] of byDate) {
    dailyScores.set(date, calcDayScore(entries));
  }

  const { current, longest } = calcStreak(dailyScores);

  // Weekly improvement
  const lastWeekStart = dateStr(addDays(new Date(), -14));
  const lastWeekEnd = dateStr(addDays(new Date(), -7));
  const thisWeekStart = dateStr(addDays(new Date(), -7));
  const thisWeekEntries = recentEntries.filter(e => e.date >= thisWeekStart && e.date <= today);
  const lastWeekEntries = recentEntries.filter(e => e.date >= lastWeekStart && e.date <= lastWeekEnd);

  const thisWeekAvg = thisWeekEntries.length > 0
    ? calcDayScore(thisWeekEntries)
    : 0;
  const lastWeekAvg = lastWeekEntries.length > 0
    ? calcDayScore(lastWeekEntries)
    : 0;
  const weeklyImprovement = lastWeekAvg > 0
    ? Math.round(((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100)
    : 0;

  // BMI
  let bmi: number | null = null;
  let bmiCategory: string | null = null;
  if (profile?.height && profile?.weight) {
    const heightM = profile.height / 100;
    bmi = Math.round((profile.weight / (heightM * heightM)) * 10) / 10;
    if (bmi < 18.5) bmiCategory = "Underweight";
    else if (bmi < 25) bmiCategory = "Normal";
    else if (bmi < 30) bmiCategory = "Overweight";
    else bmiCategory = "Obese";
  }

  // Badges
  const badges: string[] = [];
  if (current >= 7) badges.push("Week Warrior");
  if (current >= 30) badges.push("Month Master");
  if (todayScore >= 80) badges.push("High Performer");
  if (completedToday === totalToday && totalToday > 0) badges.push("Perfect Day");

  res.json({
    todayScore,
    currentStreak: current,
    longestStreak: longest,
    weeklyImprovement,
    completedToday,
    totalToday,
    productiveHoursToday: Math.round(productiveHoursToday * 10) / 10,
    totalHoursToday: Math.round(totalHoursToday * 10) / 10,
    bmi,
    bmiCategory,
    badges,
  });
});

router.get("/analytics/weekly", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const today = dateStr(new Date());
  const sevenDaysAgo = dateStr(addDays(new Date(), -6));
  const fourteenDaysAgo = dateStr(addDays(new Date(), -13));

  const thisWeekEntries = await getLogsWithActivities(userId, sevenDaysAgo, today);
  const lastWeekEntries = await getLogsWithActivities(userId, fourteenDaysAgo, dateStr(addDays(new Date(), -7)));

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = dateStr(addDays(new Date(), -i));
    const dayEntries = thisWeekEntries.filter(e => e.date === d);
    const score = calcDayScore(dayEntries);
    const productiveHours = dayEntries
      .filter(e => e.completed && e.isProductive)
      .reduce((sum, e) => sum + (e.hoursSpent ?? 0), 0);
    days.push({
      date: d,
      dayLabel: dayLabel(d),
      score,
      completedActivities: dayEntries.filter(e => e.completed).length,
      totalActivities: dayEntries.length,
      productiveHours: Math.round(productiveHours * 10) / 10,
    });
  }

  const weeklyAvgScore = days.length > 0 ? Math.round(days.reduce((s, d) => s + d.score, 0) / days.length) : 0;
  const prevDayScores = [];
  for (let i = 13; i >= 7; i--) {
    const d = dateStr(addDays(new Date(), -i));
    const dayEntries = lastWeekEntries.filter(e => e.date === d);
    prevDayScores.push(calcDayScore(dayEntries));
  }
  const previousWeekAvgScore = prevDayScores.length > 0 ? Math.round(prevDayScores.reduce((s, n) => s + n, 0) / prevDayScores.length) : 0;

  res.json({ days, weeklyAvgScore, previousWeekAvgScore });
});

router.get("/analytics/monthly", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const today = dateStr(new Date());
  const startDate = dateStr(addDays(new Date(), -27));

  const entries = await getLogsWithActivities(userId, startDate, today);

  const weeks = [];
  for (let w = 3; w >= 0; w--) {
    const weekStart = dateStr(addDays(new Date(), -(w * 7 + 6)));
    const weekEnd = dateStr(addDays(new Date(), -w * 7));
    const weekEntries = entries.filter(e => e.date >= weekStart && e.date <= weekEnd);

    const byDay = new Map<string, typeof weekEntries>();
    for (const e of weekEntries) {
      if (!byDay.has(e.date)) byDay.set(e.date, []);
      byDay.get(e.date)!.push(e);
    }

    const dayScores = Array.from(byDay.values()).map(de => calcDayScore(de));
    const avgScore = dayScores.length > 0 ? Math.round(dayScores.reduce((s, n) => s + n, 0) / dayScores.length) : 0;
    const activeDays = dayScores.filter(s => s > 30).length;

    weeks.push({
      weekLabel: `Week ${4 - w}`,
      avgScore,
      activeDays,
    });
  }

  const monthlyAvgScore = weeks.length > 0 ? Math.round(weeks.reduce((s, w) => s + w.avgScore, 0) / weeks.length) : 0;
  const totalDays = 28;
  const activeDaysTotal = weeks.reduce((s, w) => s + w.activeDays, 0);
  const consistencyPct = Math.round((activeDaysTotal / totalDays) * 100);

  res.json({ weeks, monthlyAvgScore, consistencyPct });
});

router.get("/analytics/activity-breakdown", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const today = dateStr(new Date());
  const thirtyDaysAgo = dateStr(addDays(new Date(), -29));

  const entries = await getLogsWithActivities(userId, thirtyDaysAgo, today);

  const activityMap = new Map<string, { hours: number; isProductive: boolean; color: string }>();
  for (const e of entries) {
    if (!e.completed) continue;
    const key = e.activityName ?? "Unknown";
    if (!activityMap.has(key)) {
      activityMap.set(key, { hours: 0, isProductive: e.isProductive ?? false, color: e.color ?? "#6366f1" });
    }
    activityMap.get(key)!.hours += e.hoursSpent ?? 0;
  }

  const totalHours = Array.from(activityMap.values()).reduce((s, a) => s + a.hours, 0);
  const productiveHours = Array.from(activityMap.values()).filter(a => a.isProductive).reduce((s, a) => s + a.hours, 0);
  const nonProductiveHours = totalHours - productiveHours;
  const productivePct = totalHours > 0 ? Math.round((productiveHours / totalHours) * 100) : 0;

  const items = Array.from(activityMap.entries()).map(([name, data]) => ({
    name,
    hours: Math.round(data.hours * 10) / 10,
    pct: totalHours > 0 ? Math.round((data.hours / totalHours) * 100) : 0,
    isProductive: data.isProductive,
    color: data.color,
  }));

  res.json({
    items,
    productiveHours: Math.round(productiveHours * 10) / 10,
    nonProductiveHours: Math.round(nonProductiveHours * 10) / 10,
    productivePct,
  });
});

export default router;
