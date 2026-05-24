import { Router, type IRouter } from "express";
import { db, profilesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";
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
  let profile: typeof profilesTable.$inferSelect;
  if (existing) {
    [profile] = await db.update(profilesTable)
      .set(profileData as Partial<typeof profilesTable.$inferSelect>)
      .where(eq(profilesTable.userId, userId))
      .returning();
  } else {
    [profile] = await db.insert(profilesTable).values({ userId, ...(profileData as Partial<typeof profilesTable.$inferSelect>) }).returning();
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  res.json(serializeProfile(profile, { name: user?.name ?? "", email: user?.email ?? "" }));
});

export default router;
