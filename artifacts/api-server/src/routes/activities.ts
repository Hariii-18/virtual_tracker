import { Router, type IRouter } from "express";
import { db, activitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateActivityBody, UpdateActivityBody, UpdateActivityParams, DeleteActivityParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const ACTIVITY_COLORS = ["#6366f1", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"];

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
  }).returning();

  res.status(201).json(activity);
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
