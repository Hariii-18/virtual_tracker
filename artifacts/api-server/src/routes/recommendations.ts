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

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

router.get("/recommendations", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const today = dateStr(new Date());
  const thirtyDaysAgo = dateStr(addDays(new Date(), -30));
  const fourteenDaysAgo = dateStr(addDays(new Date(), -14));
  const sevenDaysAgo = dateStr(addDays(new Date(), -7));

  const allEntries = await db
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

  const thisWeekEntries = allEntries.filter(e => e.date >= sevenDaysAgo && e.date <= today);
  const lastWeekEntries = allEntries.filter(e => e.date >= fourteenDaysAgo && e.date < sevenDaysAgo);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const tips: Array<{ category: string; message: string; priority: "high" | "medium" | "low" }> = [];

  // --- PRODUCTIVE vs NON-PRODUCTIVE hours ---
  const thisWeekProductiveHours = thisWeekEntries.filter(e => e.completed && e.isProductive).reduce((s, e) => s + (e.hoursSpent ?? 0), 0);
  const thisWeekNonProductiveHours = thisWeekEntries.filter(e => e.completed && !e.isProductive).reduce((s, e) => s + (e.hoursSpent ?? 0), 0);
  const lastWeekProductiveHours = lastWeekEntries.filter(e => e.completed && e.isProductive).reduce((s, e) => s + (e.hoursSpent ?? 0), 0);

  if (thisWeekProductiveHours > 20) {
    strengths.push(`Excellent productive output — ${round1(thisWeekProductiveHours)}h of focused work logged this week`);
  } else if (thisWeekProductiveHours > 10) {
    strengths.push(`Good productive hours this week: ${round1(thisWeekProductiveHours)}h tracked`);
  }

  if (thisWeekNonProductiveHours > 14) {
    const daily = round1(thisWeekNonProductiveHours / 7);
    weaknesses.push(`High non-productive time: ${round1(thisWeekNonProductiveHours)}h this week (avg ${daily}h/day)`);
    tips.push({
      category: "Focus",
      message: `You spent ${round1(thisWeekNonProductiveHours)} hours on low-productivity activities this week. Try reducing entertainment time by 1 hour daily to reclaim ~7 productive hours per week.`,
      priority: "high",
    });
  } else if (thisWeekNonProductiveHours > 7) {
    tips.push({
      category: "Focus",
      message: `You logged ${round1(thisWeekNonProductiveHours)}h of non-productive time this week. Setting a daily limit for leisure can help maintain balance.`,
      priority: "medium",
    });
  }

  // --- WEEK OVER WEEK COMPARISON ---
  if (lastWeekProductiveHours > 0) {
    const improvementPct = ((thisWeekProductiveHours - lastWeekProductiveHours) / lastWeekProductiveHours) * 100;
    if (improvementPct >= 10) {
      strengths.push(`Productive hours improved by ${Math.round(improvementPct)}% compared to last week`);
    } else if (improvementPct <= -15) {
      weaknesses.push(`Productive hours dropped ${Math.round(Math.abs(improvementPct))}% vs last week (${round1(lastWeekProductiveHours)}h → ${round1(thisWeekProductiveHours)}h)`);
    }
  }

  // --- COMPLETION RATE per activity ---
  const activityStats = new Map<string, { total: number; completed: number; totalHours: number; isProductive: boolean }>();
  for (const e of allEntries) {
    const key = e.activityName ?? "Unknown";
    if (!activityStats.has(key)) {
      activityStats.set(key, { total: 0, completed: 0, totalHours: 0, isProductive: e.isProductive ?? true });
    }
    const s = activityStats.get(key)!;
    s.total++;
    if (e.completed) { s.completed++; s.totalHours += e.hoursSpent ?? 0; }
  }

  for (const [name, stats] of activityStats.entries()) {
    if (stats.total < 3) continue;
    const rate = stats.completed / stats.total;
    if (rate >= 0.85 && stats.isProductive) {
      strengths.push(`Consistent ${name} habit — ${Math.round(rate * 100)}% completion rate`);
    } else if (rate < 0.35 && stats.isProductive) {
      weaknesses.push(`Low consistency in ${name}: only ${Math.round(rate * 100)}% completion over 30 days`);
      tips.push({
        category: "Consistency",
        message: `You only complete ${name} ${Math.round(rate * 100)}% of the time. Try anchoring it to an existing habit (habit stacking) to improve follow-through.`,
        priority: "medium",
      });
    }
  }

  // --- SLEEP ANALYSIS ---
  const sleepEntries = allEntries.filter(e => (e.activityName ?? "").toLowerCase().includes("sleep") && e.completed);
  if (sleepEntries.length >= 3) {
    const avgSleepHours = sleepEntries.reduce((s, e) => s + (e.hoursSpent ?? 0), 0) / sleepEntries.length;
    const target = profile?.sleepTarget ?? 8;
    const deficit = target - avgSleepHours;

    if (avgSleepHours < 6) {
      tips.push({
        category: "Sleep",
        message: `Your average sleep is ${round1(avgSleepHours)}h — well below the recommended 7-9h. Poor recovery directly reduces focus, memory, and productivity.`,
        priority: "high",
      });
      weaknesses.push(`Severely insufficient sleep (avg ${round1(avgSleepHours)}h vs ${target}h target)`);
    } else if (avgSleepHours < 7) {
      tips.push({
        category: "Sleep",
        message: `You're averaging ${round1(avgSleepHours)}h of sleep. Even ${round1(target - avgSleepHours)}h more per night can improve focus and energy significantly.`,
        priority: "medium",
      });
      weaknesses.push(`Sleep below target (avg ${round1(avgSleepHours)}h vs ${target}h target)`);
    } else {
      strengths.push(`Healthy sleep average: ${round1(avgSleepHours)}h/night — matching your ${target}h target`);
    }
  } else if (profile?.sleepTarget) {
    tips.push({
      category: "Sleep",
      message: "Start tracking your sleep to understand how rest affects your daily energy and productivity output.",
      priority: "medium",
    });
  }

  // --- CONSISTENCY SCORE ---
  const uniqueDates = new Set(allEntries.filter(e => e.completed).map(e => e.date));
  const activeDays = uniqueDates.size;
  const consistencyPct = Math.round((activeDays / 30) * 100);

  if (consistencyPct >= 80) {
    strengths.push(`Exceptional consistency: active ${activeDays} out of 30 days (${consistencyPct}%)`);
  } else if (consistencyPct >= 60) {
    strengths.push(`Good consistency: active ${activeDays}/30 days`);
  } else if (consistencyPct < 40 && allEntries.length > 0) {
    weaknesses.push(`Low consistency: only active ${activeDays}/30 days (${consistencyPct}%)`);
    tips.push({
      category: "Consistency",
      message: `You've only been active ${activeDays} of the last 30 days. Daily tracking — even for just 1 activity — builds the momentum that drives long-term results.`,
      priority: "high",
    });
  }

  // --- FITNESS ANALYSIS ---
  const fitnessEntries = allEntries.filter(e =>
    ["gym", "workout", "exercise", "sports", "fitness", "training", "cardio", "practice"].some(kw =>
      (e.activityName ?? "").toLowerCase().includes(kw)
    )
  );
  if (fitnessEntries.length > 3) {
    const rate = fitnessEntries.filter(e => e.completed).length / fitnessEntries.length;
    if (rate < 0.5) {
      tips.push({
        category: "Fitness",
        message: `Your fitness consistency is ${Math.round(rate * 100)}%. Schedule workouts at a fixed time to build the habit automatically.`,
        priority: "medium",
      });
    } else {
      strengths.push(`Consistent fitness routine (${Math.round(rate * 100)}% completion)`);
    }
  } else {
    tips.push({
      category: "Fitness",
      message: "No fitness activities tracked in 30 days. Even 20 minutes of daily movement improves focus, mood, and energy levels by up to 40%.",
      priority: "medium",
    });
  }

  // --- LEARNING/STUDY ANALYSIS ---
  const studyEntries = allEntries.filter(e =>
    ["study", "learning", "reading", "coding", "college", "course"].some(kw =>
      (e.activityName ?? "").toLowerCase().includes(kw)
    )
  );
  if (studyEntries.length > 3) {
    const completedStudy = studyEntries.filter(e => e.completed);
    const totalStudyHours = completedStudy.reduce((s, e) => s + (e.hoursSpent ?? 0), 0);
    const avgStudyHoursPerSession = completedStudy.length > 0 ? totalStudyHours / completedStudy.length : 0;
    if (avgStudyHoursPerSession < 1.5) {
      tips.push({
        category: "Learning",
        message: `Your average study/learning session is ${round1(avgStudyHoursPerSession)}h. Deep work requires at least 90 minutes of uninterrupted focus — try the Pomodoro technique.`,
        priority: "low",
      });
    } else {
      strengths.push(`Strong learning focus: avg ${round1(avgStudyHoursPerSession)}h per study session`);
    }
  }

  // --- BMI / HEALTH ---
  if (profile?.height && profile?.weight) {
    const heightM = profile.height / 100;
    const bmi = profile.weight / (heightM * heightM);
    if (bmi < 18.5) {
      tips.push({ category: "Health", message: `BMI ${round1(bmi)} suggests underweight. Consider increasing caloric intake with nutrient-dense foods and tracking a nutrition activity.`, priority: "high" });
    } else if (bmi >= 25 && bmi < 30) {
      tips.push({ category: "Health", message: `BMI ${round1(bmi)} is in the overweight range. Adding 30 minutes of cardio 3×/week combined with diet awareness can make a measurable impact.`, priority: "medium" });
    } else if (bmi >= 30) {
      tips.push({ category: "Health", message: `BMI ${round1(bmi)} indicates obesity. Prioritizing daily movement and consulting a nutritionist is highly recommended.`, priority: "high" });
    }
  }

  // --- GOALS CHECK ---
  if (profile?.goals) {
    const goalKeywords = profile.goals.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const goalRelatedEntries = allEntries.filter(e =>
      goalKeywords.some(kw => (e.activityName ?? "").toLowerCase().includes(kw))
    );
    if (goalRelatedEntries.length === 0) {
      tips.push({
        category: "Goal Alignment",
        message: `Your goal is "${profile.goals}" but no matching activities have been logged. Add activities that directly map to your goals.`,
        priority: "medium",
      });
    }
  }

  // --- WORK-LIFE BALANCE ---
  const workHours = allEntries.filter(e => e.completed && ["Work", "Office", "Meeting"].some(c => (e.category ?? "").includes(c))).reduce((s, e) => s + (e.hoursSpent ?? 0), 0);
  const personalHours = allEntries.filter(e => e.completed && ["Personal", "Family", "Leisure"].some(c => (e.category ?? "").includes(c))).reduce((s, e) => s + (e.hoursSpent ?? 0), 0);
  if (workHours > 0 && personalHours > 0) {
    const ratio = workHours / (workHours + personalHours);
    if (ratio > 0.8) {
      tips.push({
        category: "Work-Life Balance",
        message: `${Math.round(ratio * 100)}% of your tracked time is work-related. Schedule intentional personal/family time to avoid burnout.`,
        priority: "medium",
      });
    } else if (ratio < 0.2 && workHours > 0) {
      tips.push({
        category: "Work-Life Balance",
        message: "Very little work time tracked relative to personal activities. Make sure key professional tasks are represented in your daily tracking.",
        priority: "low",
      });
    }
  }

  // --- WEEKLY INSIGHT & ANALYSIS ---
  const overallCompletionRate = allEntries.length > 0
    ? allEntries.filter(e => e.completed).length / allEntries.length : 0;

  let weeklyInsight: string;
  let productivityAnalysis: string;

  const avgDailyProductiveHours = activeDays > 0 ? round1(thisWeekProductiveHours / Math.max(activeDays, 1)) : 0;

  if (overallCompletionRate >= 0.8) {
    weeklyInsight = `Outstanding consistency — ${Math.round(overallCompletionRate * 100)}% completion rate. You are operating at elite productivity level.`;
    productivityAnalysis = `With ${round1(thisWeekProductiveHours)}h of productive work this week and ${consistencyPct}% consistency over 30 days, your habits are genuinely strong. Focus on increasing the quality and depth of your work sessions rather than volume.`;
  } else if (overallCompletionRate >= 0.6) {
    weeklyInsight = `Solid performance with ${Math.round(overallCompletionRate * 100)}% completion. A few consistency gaps are holding back your full potential.`;
    productivityAnalysis = `You averaged ${avgDailyProductiveHours}h of productive work per active day. Closing the ${Math.round((1 - overallCompletionRate) * 100)}% completion gap would add roughly ${round1((1 - overallCompletionRate) * thisWeekProductiveHours)}h of productive output per week.`;
  } else if (overallCompletionRate >= 0.4) {
    weeklyInsight = `Mixed results with ${Math.round(overallCompletionRate * 100)}% completion. Some strong days, but inconsistency is limiting overall progress.`;
    productivityAnalysis = `Your best days this period show real capability — the challenge is replicating that consistently. Identify your top 2-3 most skipped activities and focus exclusively on those first.`;
  } else if (allEntries.length > 0) {
    weeklyInsight = "Early-stage tracking detected. Building the logging habit itself is the first win.";
    productivityAnalysis = "Even logging 1-2 activities daily for 7 consecutive days creates measurable momentum. Start with the 2 activities most critical to your goals.";
  } else {
    weeklyInsight = "No activities logged yet. Add activities to start receiving personalized insights.";
    productivityAnalysis = "Set up your activities in the Activities tab, then log them daily to unlock data-driven recommendations specific to your patterns.";
  }

  // Pad with universal but targeted tips if needed
  if (tips.length < 3) {
    tips.push({ category: "Productivity", message: "Time-block your calendar for your 3 most important tasks before 10 AM. Morning focus is the single highest-leverage productivity habit.", priority: "low" });
  }
  if (tips.length < 4) {
    tips.push({ category: "Mindset", message: "Review your productivity logs weekly. Reflection on what worked — not just what you did — compounds growth faster than raw effort.", priority: "low" });
  }

  if (strengths.length === 0) {
    strengths.push("You're actively tracking your activities — that consistency puts you in the top 10% of people who measure their habits");
  }
  if (weaknesses.length === 0 && overallCompletionRate > 0 && overallCompletionRate < 0.5) {
    weaknesses.push("Overall completion rate could be stronger — try reducing your daily activity count to focus on fewer, higher-priority habits");
  }
  if (weaknesses.length === 0 && allEntries.length === 0) {
    weaknesses.push("No tracked data yet — add and log activities to identify your personal improvement areas");
  }

  res.json({
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    tips: tips.slice(0, 6),
    weeklyInsight,
    productivityAnalysis,
  });
});

export default router;
