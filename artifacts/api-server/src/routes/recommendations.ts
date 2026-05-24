import { Router, type IRouter } from "express";
import { db, logsTable, activitiesTable, profilesTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

router.get("/recommendations", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const thirtyDaysAgo = dateStr(addDays(new Date(), -30));

  const entries = await db
    .select({
      id: logsTable.id,
      activityId: logsTable.activityId,
      activityName: activitiesTable.name,
      date: logsTable.date,
      completed: logsTable.completed,
      hoursSpent: logsTable.hoursSpent,
      isProductive: activitiesTable.isProductive,
      targetHours: activitiesTable.targetHours,
      category: activitiesTable.category,
    })
    .from(logsTable)
    .leftJoin(activitiesTable, eq(logsTable.activityId, activitiesTable.id))
    .where(and(eq(logsTable.userId, userId), gte(logsTable.date, thirtyDaysAgo)));

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  const activities = await db.select().from(activitiesTable).where(eq(activitiesTable.userId, userId));

  // Activity consistency
  const activityStats = new Map<string, { total: number; completed: number; totalHours: number; targetHours: number | null }>();
  for (const e of entries) {
    const key = e.activityName ?? "Unknown";
    if (!activityStats.has(key)) {
      activityStats.set(key, { total: 0, completed: 0, totalHours: 0, targetHours: e.targetHours ?? null });
    }
    const s = activityStats.get(key)!;
    s.total++;
    if (e.completed) {
      s.completed++;
      s.totalHours += e.hoursSpent ?? 0;
    }
  }

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const tips: Array<{ category: string; message: string; priority: "high" | "medium" | "low" }> = [];

  for (const [name, stats] of activityStats.entries()) {
    const rate = stats.total > 0 ? stats.completed / stats.total : 0;
    if (rate >= 0.8) strengths.push(`Strong consistency in ${name} (${Math.round(rate * 100)}% completion)`);
    else if (rate < 0.4 && stats.total >= 5) weaknesses.push(`Low consistency in ${name} (${Math.round(rate * 100)}% completion)`);
  }

  // BMI recommendations
  if (profile?.height && profile?.weight) {
    const heightM = profile.height / 100;
    const bmi = profile.weight / (heightM * heightM);
    if (bmi < 18.5) {
      tips.push({ category: "Health", message: "Your BMI suggests you may be underweight. Consider increasing caloric intake with nutrient-dense foods.", priority: "high" });
    } else if (bmi >= 25 && bmi < 30) {
      tips.push({ category: "Health", message: "Your BMI is in the overweight range. Adding 30 minutes of cardio 3x/week can make a significant difference.", priority: "medium" });
    } else if (bmi >= 30) {
      tips.push({ category: "Health", message: "Your BMI indicates obesity. Prioritize exercise and consult a nutritionist for a personalized plan.", priority: "high" });
    }
  }

  // Sleep recommendations
  const sleepEntries = entries.filter(e => (e.activityName ?? "").toLowerCase().includes("sleep"));
  if (sleepEntries.length > 0) {
    const avgSleepHours = sleepEntries.reduce((s, e) => s + (e.hoursSpent ?? 0), 0) / sleepEntries.length;
    if (avgSleepHours < 7) {
      tips.push({ category: "Sleep", message: `Your average sleep is ${Math.round(avgSleepHours * 10) / 10}h. Aim for 7-9 hours to boost cognitive performance and productivity.`, priority: "high" });
      weaknesses.push(`Insufficient sleep (avg ${Math.round(avgSleepHours * 10) / 10}h per night)`);
    } else if (avgSleepHours >= 7) {
      strengths.push(`Good sleep hygiene (avg ${Math.round(avgSleepHours * 10) / 10}h/night)`);
    }
  }

  if (profile?.sleepTarget && sleepEntries.length === 0) {
    tips.push({ category: "Sleep", message: "Start tracking your sleep to gain insights into how rest affects your daily productivity.", priority: "medium" });
  }

  // Gym/fitness recommendations
  const gymEntries = entries.filter(e => ["gym", "workout", "exercise", "sports", "fitness", "athlete"].some(kw => (e.activityName ?? "").toLowerCase().includes(kw)));
  if (gymEntries.length > 0) {
    const rate = gymEntries.filter(e => e.completed).length / gymEntries.length;
    if (rate < 0.5) {
      tips.push({ category: "Fitness", message: "Your gym consistency is below 50%. Schedule workouts at the same time each day to build the habit.", priority: "high" });
    } else {
      strengths.push("Consistent fitness routine");
    }
  } else {
    tips.push({ category: "Fitness", message: "No fitness activities tracked. Adding even 20 minutes of daily movement improves focus and energy levels.", priority: "medium" });
  }

  // Study/learning recommendations
  const studyEntries = entries.filter(e => ["study", "studying", "learning", "reading", "coding", "college"].some(kw => (e.activityName ?? "").toLowerCase().includes(kw)));
  if (studyEntries.length > 0) {
    const avgStudyHours = studyEntries.filter(e => e.completed).reduce((s, e) => s + (e.hoursSpent ?? 0), 0) / Math.max(studyEntries.length, 1);
    if (avgStudyHours < 2) {
      tips.push({ category: "Learning", message: "Your study/learning time averages under 2 hours. Try the Pomodoro technique (25 min focus, 5 min break) to increase deep work time.", priority: "medium" });
    } else {
      strengths.push("Dedicated learning time");
    }
  }

  // Overall productivity
  const overallRate = entries.length > 0 ? entries.filter(e => e.completed).length / entries.length : 0;
  let weeklyInsight = "";
  let productivityAnalysis = "";

  if (overallRate >= 0.8) {
    weeklyInsight = "Outstanding performance this period. You are maintaining elite-level consistency across your tracked activities.";
    productivityAnalysis = "Your productivity is in the top tier. Focus on maintaining your routines and consider adding stretch goals.";
  } else if (overallRate >= 0.6) {
    weeklyInsight = "Solid progress this period. A few consistency gaps, but your core habits are strong.";
    productivityAnalysis = `You complete ${Math.round(overallRate * 100)}% of your tracked activities. Closing the remaining gap would unlock significant productivity gains.`;
  } else if (overallRate >= 0.4) {
    weeklyInsight = "Mixed results this period. Some strong days, but inconsistency is holding back your potential.";
    productivityAnalysis = `With a ${Math.round(overallRate * 100)}% completion rate, focus on the 2-3 activities where you're most inconsistent and build momentum there first.`;
  } else {
    weeklyInsight = "Your tracking shows significant room for improvement. Start small — even completing 2 activities per day builds powerful momentum.";
    productivityAnalysis = "Low completion rates often signal that the activity list needs adjustment. Consider reducing the number of tracked activities and focusing on quality over quantity.";
  }

  // Generic tips if we don't have enough
  if (tips.length < 3) {
    tips.push({ category: "Productivity", message: "Block your top 3 priorities first thing in the morning before checking messages or emails.", priority: "low" });
    tips.push({ category: "Mindset", message: "Review your goals weekly. Regular reflection is the most underrated productivity tool.", priority: "low" });
  }

  if (strengths.length === 0) strengths.push("You are actively tracking your activities — that alone puts you ahead of most people");
  if (weaknesses.length === 0 && overallRate < 0.5) weaknesses.push("Overall completion rate needs improvement");

  res.json({
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    tips: tips.slice(0, 6),
    weeklyInsight,
    productivityAnalysis,
  });
});

export default router;
