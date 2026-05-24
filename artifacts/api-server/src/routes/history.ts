import { Router, type IRouter } from "express";
import { db, logsTable, activitiesTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { GetHistoryQueryParams } from "@workspace/api-zod";
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

router.get("/history", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = GetHistoryQueryParams.safeParse(req.query);

  const today = dateStr(new Date());
  const startDate = parsed.success && parsed.data.startDate ? parsed.data.startDate : dateStr(addDays(new Date(), -365));
  const endDate = parsed.success && parsed.data.endDate ? parsed.data.endDate : today;
  const groupBy = parsed.success && parsed.data.groupBy ? parsed.data.groupBy : "day";

  const entries = await db
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
    })
    .from(logsTable)
    .leftJoin(activitiesTable, eq(logsTable.activityId, activitiesTable.id))
    .where(and(eq(logsTable.userId, userId), gte(logsTable.date, startDate), lte(logsTable.date, endDate)));

  if (groupBy === "day") {
    const byDate = new Map<string, typeof entries>();
    for (const e of entries) {
      if (!byDate.has(e.date)) byDate.set(e.date, []);
      byDate.get(e.date)!.push(e);
    }
    const result = Array.from(byDate.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, dayEntries]) => ({
        date,
        score: calcDayScore(dayEntries),
        completedActivities: dayEntries.filter(e => e.completed).length,
        totalActivities: dayEntries.length,
        productiveHours: Math.round(dayEntries.filter(e => e.completed && e.isProductive).reduce((s, e) => s + (e.hoursSpent ?? 0), 0) * 10) / 10,
        entries: dayEntries.map(e => ({
          id: e.id,
          userId: e.userId,
          activityId: e.activityId,
          activityName: e.activityName,
          date: e.date,
          completed: e.completed,
          hoursSpent: e.hoursSpent,
          notes: e.notes,
          productivityPct: e.productivityPct,
        })),
      }));
    res.json(result);
    return;
  }

  if (groupBy === "week") {
    const weekMap = new Map<string, typeof entries>();
    for (const e of entries) {
      const d = new Date(e.date + "T12:00:00Z");
      const dayOfWeek = d.getUTCDay();
      const monday = addDays(d, -dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
      const weekKey = dateStr(monday);
      if (!weekMap.has(weekKey)) weekMap.set(weekKey, []);
      weekMap.get(weekKey)!.push(e);
    }
    const result = Array.from(weekMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([weekStart, weekEntries]) => ({
        date: weekStart,
        score: calcDayScore(weekEntries),
        completedActivities: weekEntries.filter(e => e.completed).length,
        totalActivities: weekEntries.length,
        productiveHours: Math.round(weekEntries.filter(e => e.completed && e.isProductive).reduce((s, e) => s + (e.hoursSpent ?? 0), 0) * 10) / 10,
        entries: [],
      }));
    res.json(result);
    return;
  }

  // month
  const monthMap = new Map<string, typeof entries>();
  for (const e of entries) {
    const monthKey = e.date.slice(0, 7);
    if (!monthMap.has(monthKey)) monthMap.set(monthKey, []);
    monthMap.get(monthKey)!.push(e);
  }
  const result = Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, monthEntries]) => ({
      date: month,
      score: calcDayScore(monthEntries),
      completedActivities: monthEntries.filter(e => e.completed).length,
      totalActivities: monthEntries.length,
      productiveHours: Math.round(monthEntries.filter(e => e.completed && e.isProductive).reduce((s, e) => s + (e.hoursSpent ?? 0), 0) * 10) / 10,
      entries: [],
    }));
  res.json(result);
});

export default router;
