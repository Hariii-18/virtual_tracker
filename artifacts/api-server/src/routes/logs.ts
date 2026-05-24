import { Router, type IRouter } from "express";
import { db, logsTable, activitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { UpsertLogEntryBody, DeleteLogEntryParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

router.get("/logs/today", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const today = getTodayDate();

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
    })
    .from(logsTable)
    .leftJoin(activitiesTable, eq(logsTable.activityId, activitiesTable.id))
    .where(and(eq(logsTable.userId, userId), eq(logsTable.date, today)));

  res.json(entries);
});

router.post("/logs", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = UpsertLogEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const today = getTodayDate();
  const { activityId, completed, hoursSpent, notes, productivityPct } = parsed.data;

  const [existing] = await db
    .select()
    .from(logsTable)
    .where(and(eq(logsTable.userId, userId), eq(logsTable.activityId, activityId), eq(logsTable.date, today)));

  let entry;
  if (existing) {
    [entry] = await db
      .update(logsTable)
      .set({ completed, hoursSpent, notes, productivityPct })
      .where(eq(logsTable.id, existing.id))
      .returning();
  } else {
    [entry] = await db
      .insert(logsTable)
      .values({ userId, activityId, date: today, completed, hoursSpent, notes, productivityPct })
      .returning();
  }

  const [activity] = await db.select().from(activitiesTable).where(eq(activitiesTable.id, activityId));

  res.json({
    ...entry,
    activityName: activity?.name ?? "",
  });
});

router.delete("/logs/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteLogEntryParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(logsTable)
    .where(and(eq(logsTable.id, params.data.id), eq(logsTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Log entry not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
