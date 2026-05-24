import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { guestStore, type GuestActivity, type GuestProfile, type GuestLog } from "@/lib/guest-store";

interface GuestContextValue {
  isGuest: boolean;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  profile: GuestProfile;
  activities: GuestActivity[];
  todayLogs: GuestLog[];
  allLogs: GuestLog[];
  updateProfile: (data: Partial<GuestProfile>) => void;
  addActivity: (data: Omit<GuestActivity, "id" | "userId">) => GuestActivity;
  updateActivity: (id: number, data: Partial<GuestActivity>) => void;
  deleteActivity: (id: number) => void;
  upsertLog: (activityId: number, completed: boolean, hoursSpent?: number | null) => void;
  seedProfessionActivities: (profession: string) => void;
  refresh: () => void;
}

const GuestContext = createContext<GuestContextValue | null>(null);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [isGuest, setIsGuest] = useState(() => guestStore.isGuest());
  const [profile, setProfile] = useState(() => guestStore.getProfile());
  const [activities, setActivities] = useState(() => guestStore.getActivities());
  const [allLogs, setAllLogs] = useState(() => guestStore.getLogs());

  const today = new Date().toISOString().split("T")[0];
  const todayLogs = allLogs.filter((l) => l.date === today);

  const refresh = useCallback(() => {
    setProfile(guestStore.getProfile());
    setActivities(guestStore.getActivities());
    setAllLogs(guestStore.getLogs());
  }, []);

  const enterGuestMode = useCallback(() => {
    guestStore.enter();
    setIsGuest(true);
    refresh();
  }, [refresh]);

  const exitGuestMode = useCallback(() => {
    guestStore.exit();
    setIsGuest(false);
  }, []);

  const updateProfile = useCallback((data: Partial<GuestProfile>) => {
    const updated = guestStore.saveProfile(data);
    setProfile(updated);
  }, []);

  const addActivity = useCallback((data: Omit<GuestActivity, "id" | "userId">) => {
    const activity = guestStore.addActivity(data);
    setActivities(guestStore.getActivities());
    return activity;
  }, []);

  const updateActivity = useCallback((id: number, data: Partial<GuestActivity>) => {
    guestStore.updateActivity(id, data);
    setActivities(guestStore.getActivities());
  }, []);

  const deleteActivity = useCallback((id: number) => {
    guestStore.deleteActivity(id);
    setActivities(guestStore.getActivities());
  }, []);

  const upsertLog = useCallback((activityId: number, completed: boolean, hoursSpent?: number | null) => {
    guestStore.upsertLog(activityId, completed, hoursSpent);
    setAllLogs(guestStore.getLogs());
  }, []);

  const seedProfessionActivities = useCallback((profession: string) => {
    guestStore.seedActivities(profession);
    setActivities(guestStore.getActivities());
  }, []);

  useEffect(() => {
    const handler = () => {
      if (guestStore.isGuest()) refresh();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refresh]);

  return (
    <GuestContext.Provider value={{
      isGuest,
      enterGuestMode,
      exitGuestMode,
      profile,
      activities,
      todayLogs,
      allLogs,
      updateProfile,
      addActivity,
      updateActivity,
      deleteActivity,
      upsertLog,
      seedProfessionActivities,
      refresh,
    }}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error("useGuest must be used within GuestProvider");
  return ctx;
}
