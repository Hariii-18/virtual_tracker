import { Router, type IRouter } from "express";
import { db, activitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateActivityBody, UpdateActivityBody, UpdateActivityParams, DeleteActivityParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const ACTIVITY_COLORS = [
  "#6366f1", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#3b82f6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
  "#dc2626", "#7c3aed", "#059669", "#d97706", "#db2777",
];

const PROFESSION_ACTIVITIES: Record<string, Array<{ name: string; category: string; isProductive: boolean }>> = {
  Student: [
    { name: "Study", category: "Education", isProductive: true },
    { name: "School / College", category: "Education", isProductive: true },
    { name: "Reading", category: "Education", isProductive: true },
    { name: "Coding", category: "Education", isProductive: true },
    { name: "Gym", category: "Health", isProductive: true },
    { name: "Sports", category: "Health", isProductive: true },
    { name: "Sleep", category: "Health", isProductive: true },
    { name: "Social Media", category: "Leisure", isProductive: false },
  ],
  Employee: [
    { name: "Office Work", category: "Work", isProductive: true },
    { name: "Meetings", category: "Work", isProductive: true },
    { name: "Learning", category: "Education", isProductive: true },
    { name: "Gym", category: "Health", isProductive: true },
    { name: "Sleep", category: "Health", isProductive: true },
    { name: "Family Time", category: "Personal", isProductive: true },
    { name: "Commute", category: "Travel", isProductive: false },
    { name: "Social Media", category: "Leisure", isProductive: false },
  ],
  Freelancer: [
    { name: "Client Work", category: "Work", isProductive: true },
    { name: "Coding", category: "Work", isProductive: true },
    { name: "Marketing", category: "Work", isProductive: true },
    { name: "Networking", category: "Work", isProductive: true },
    { name: "Learning", category: "Education", isProductive: true },
    { name: "Gym", category: "Health", isProductive: true },
    { name: "Sleep", category: "Health", isProductive: true },
    { name: "Social Media", category: "Leisure", isProductive: false },
  ],
  Athlete: [
    { name: "Training", category: "Sport", isProductive: true },
    { name: "Gym", category: "Sport", isProductive: true },
    { name: "Cardio", category: "Sport", isProductive: true },
    { name: "Practice", category: "Sport", isProductive: true },
    { name: "Recovery", category: "Health", isProductive: true },
    { name: "Nutrition", category: "Health", isProductive: true },
    { name: "Sleep", category: "Health", isProductive: true },
    { name: "Mental Training", category: "Education", isProductive: true },
  ],
};

const router: IRouter = Router();

router.get("/activities", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const activities = await db.select().from(activitiesTable).where(eq(activitiesTable.userId, userId));
  res.json(activities);
});

router.post("/activities", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = CreateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(activitiesTable).where(eq(activitiesTable.userId, userId));
  const color = parsed.data.color ?? ACTIVITY_COLORS[existing.length % ACTIVITY_COLORS.length];

  const [activity] = await db.insert(activitiesTable).values({
    ...parsed.data,
    userId,
    color,
    isGenerated: false,
    generatedFromProfession: null,
  }).returning();

  res.status(201).json(activity);
});

router.post("/activities/seed", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { profession } = req.body as { profession: string };

  const templates = PROFESSION_ACTIVITIES[profession];
  if (!templates || templates.length === 0) {
    res.status(201).json([]);
    return;
  }

  // Remove previously auto-generated activities for any profession (replace, not append)
  const allActivities = await db.select().from(activitiesTable).where(eq(activitiesTable.userId, userId));
  const generatedActivities = allActivities.filter(a => a.isGenerated);
  if (generatedActivities.length > 0) {
    for (const ga of generatedActivities) {
      await db.delete(activitiesTable).where(and(eq(activitiesTable.id, ga.id), eq(activitiesTable.userId, userId)));
    }
  }

  // Get remaining manual activities for color offset
  const manualActivities = await db.select().from(activitiesTable).where(eq(activitiesTable.userId, userId));

  // Insert new generated activities
  const seeded = await db.insert(activitiesTable).values(
    templates.map((t, i) => ({
      ...t,
      userId,
      color: ACTIVITY_COLORS[(manualActivities.length + i) % ACTIVITY_COLORS.length],
      isGenerated: true,
      generatedFromProfession: profession,
    }))
  ).returning();

  res.status(201).json(seeded);
});

router.patch("/activities/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateActivityParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [activity] = await db.update(activitiesTable)
    .set(parsed.data)
    .where(and(eq(activitiesTable.id, params.data.id), eq(activitiesTable.userId, userId)))
    .returning();

  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }

  res.json(activity);
});

router.delete("/activities/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteActivityParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(activitiesTable)
    .where(and(eq(activitiesTable.id, params.data.id), eq(activitiesTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
