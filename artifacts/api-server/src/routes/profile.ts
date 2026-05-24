import { Router, type IRouter } from "express";
import { db, profilesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));

  if (!profile) {
    const [newProfile] = await db.insert(profilesTable).values({ userId }).returning();
    res.json({
      id: newProfile.id,
      userId: newProfile.userId,
      name: user?.name ?? "",
      email: user?.email ?? "",
      age: newProfile.age,
      gender: newProfile.gender,
      profession: newProfile.profession,
      height: newProfile.height,
      weight: newProfile.weight,
      goals: newProfile.goals,
      wakeUpTime: newProfile.wakeUpTime,
      sleepTarget: newProfile.sleepTarget,
    });
    return;
  }

  res.json({
    id: profile.id,
    userId: profile.userId,
    name: user?.name ?? "",
    email: user?.email ?? "",
    age: profile.age,
    gender: profile.gender,
    profession: profile.profession,
    height: profile.height,
    weight: profile.weight,
    goals: profile.goals,
    wakeUpTime: profile.wakeUpTime,
    sleepTarget: profile.sleepTarget,
  });
});

router.patch("/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, ...profileData } = parsed.data as { name?: string } & Record<string, unknown>;

  if (name) {
    await db.update(usersTable).set({ name }).where(eq(usersTable.id, userId));
  }

  const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  let profile;
  if (existing) {
    [profile] = await db.update(profilesTable).set(profileData as Parameters<typeof db.update>[0]).where(eq(profilesTable.userId, userId)).returning();
  } else {
    [profile] = await db.insert(profilesTable).values({ userId, ...profileData }).returning();
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  res.json({
    id: profile.id,
    userId: profile.userId,
    name: user?.name ?? "",
    email: user?.email ?? "",
    age: profile.age,
    gender: profile.gender,
    profession: profile.profession,
    height: profile.height,
    weight: profile.weight,
    goals: profile.goals,
    wakeUpTime: profile.wakeUpTime,
    sleepTarget: profile.sleepTarget,
  });
});

export default router;
