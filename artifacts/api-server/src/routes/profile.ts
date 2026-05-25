import { Router, type IRouter } from "express";
import { db, profilesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function serializeProfile(profile: typeof profilesTable.$inferSelect, user: { name: string; email: string }) {
  return {
    id: profile.id,
    userId: profile.userId,
    name: user.name,
    email: user.email,
    age: profile.age,
    gender: profile.gender,
    profession: profile.profession,
    customProfession: profile.customProfession,
    height: profile.height,
    weight: profile.weight,
    goals: profile.goals,
    wakeUpTime: profile.wakeUpTime,
    sleepTarget: profile.sleepTarget,
  };
}

router.get("/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));

  if (!profile) {
    const [newProfile] = await db.insert(profilesTable).values({ userId }).returning();
    res.json(serializeProfile(newProfile, { name: user?.name ?? "", email: user?.email ?? "" }));
    return;
  }

  res.json(serializeProfile(profile, { name: user?.name ?? "", email: user?.email ?? "" }));
});

router.patch("/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const body = req.body as Record<string, unknown>;

  // Update user name if provided
  if (typeof body.name === "string" && body.name.trim()) {
    await db.update(usersTable).set({ name: body.name.trim() }).where(eq(usersTable.id, userId));
  }

  // Build profile update — explicitly map each field to handle null/empty correctly
  const profileUpdate: Partial<typeof profilesTable.$inferInsert> = {};

  if ("gender" in body) {
    profileUpdate.gender = (body.gender as string) || null;
  }
  if ("profession" in body) {
    profileUpdate.profession = (body.profession as string) || null;
  }
  if ("customProfession" in body) {
    profileUpdate.customProfession = (body.customProfession as string) || null;
  }
  if ("age" in body) {
    const age = Number(body.age);
    profileUpdate.age = isNaN(age) || body.age === "" || body.age === null ? null : age;
  }
  if ("height" in body) {
    const height = Number(body.height);
    profileUpdate.height = isNaN(height) || body.height === "" || body.height === null ? null : height;
  }
  if ("weight" in body) {
    const weight = Number(body.weight);
    profileUpdate.weight = isNaN(weight) || body.weight === "" || body.weight === null ? null : weight;
  }
  if ("goals" in body) {
    profileUpdate.goals = (body.goals as string) || null;
  }
  if ("wakeUpTime" in body) {
    profileUpdate.wakeUpTime = (body.wakeUpTime as string) || null;
  }
  if ("sleepTarget" in body) {
    const st = Number(body.sleepTarget);
    profileUpdate.sleepTarget = isNaN(st) || body.sleepTarget === "" || body.sleepTarget === null ? null : st;
  }

  const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  let profile: typeof profilesTable.$inferSelect;
  if (existing) {
    [profile] = await db.update(profilesTable)
      .set(profileUpdate)
      .where(eq(profilesTable.userId, userId))
      .returning();
  } else {
    [profile] = await db.insert(profilesTable)
      .values({ userId, ...profileUpdate })
      .returning();
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  res.json(serializeProfile(profile, { name: user?.name ?? "", email: user?.email ?? "" }));
});

export default router;
