const GUEST_MODE_KEY = "guest_mode";
const GUEST_PROFILE_KEY = "guest_profile";
const GUEST_ACTIVITIES_KEY = "guest_activities";
const GUEST_LOGS_KEY = "guest_logs";

let _idCounter = Date.now();
function nextId() {
  return ++_idCounter;
}

const ACTIVITY_COLORS = [
  "#6366f1", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#3b82f6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
  "#dc2626", "#7c3aed", "#059669", "#d97706", "#db2777",
];

export interface GuestActivity {
  id: number;
  userId: number;
  name: string;
  category: string;
  isProductive: boolean;
  targetHours: number | null;
  color: string | null;
  isGenerated: boolean;
  generatedFromProfession: string | null;
}

export interface GuestLog {
  id: number;
  userId: number;
  activityId: number;
  activityName: string;
  date: string;
  completed: boolean;
  hoursSpent: number | null;
  notes: string | null;
  productivityPct: number | null;
}

export interface GuestProfile {
  id: number;
  userId: number;
  name: string;
  email: string;
  age: number | null;
  gender: string | null;
  profession: string | null;
  customProfession: string | null;
  height: number | null;
  weight: number | null;
  goals: string | null;
  wakeUpTime: string | null;
  sleepTarget: number | null;
}

const DEFAULT_PROFILE: GuestProfile = {
  id: 1,
  userId: 0,
  name: "Guest User",
  email: "guest@example.com",
  age: null,
  gender: null,
  profession: null,
  customProfession: null,
  height: null,
  weight: null,
  goals: null,
  wakeUpTime: null,
  sleepTarget: null,
};

const PROFESSION_TEMPLATES: Record<string, Array<{ name: string; category: string; isProductive: boolean }>> = {
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

export const guestStore = {
  isGuest: () => localStorage.getItem(GUEST_MODE_KEY) === "true",

  enter() {
    localStorage.setItem(GUEST_MODE_KEY, "true");
  },

  exit() {
    localStorage.removeItem(GUEST_MODE_KEY);
  },

  getProfile(): GuestProfile {
    const stored = localStorage.getItem(GUEST_PROFILE_KEY);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(DEFAULT_PROFILE));
    return DEFAULT_PROFILE;
  },

  saveProfile(data: Partial<GuestProfile>): GuestProfile {
    const current = this.getProfile();
    const updated = { ...current, ...data };
    localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(updated));
    return updated;
  },

  getActivities(): GuestActivity[] {
    const stored = localStorage.getItem(GUEST_ACTIVITIES_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  saveActivities(activities: GuestActivity[]) {
    localStorage.setItem(GUEST_ACTIVITIES_KEY, JSON.stringify(activities));
  },

  addActivity(data: Omit<GuestActivity, "id" | "userId">): GuestActivity {
    const activities = this.getActivities();
    const manualActivities = activities.filter(a => !a.isGenerated);
    const activity: GuestActivity = {
      ...data,
      id: nextId(),
      userId: 0,
      color: data.color ?? ACTIVITY_COLORS[manualActivities.length % ACTIVITY_COLORS.length],
    };
    activities.push(activity);
    this.saveActivities(activities);
    return activity;
  },

  updateActivity(id: number, data: Partial<GuestActivity>): GuestActivity | null {
    const activities = this.getActivities();
    const idx = activities.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    activities[idx] = { ...activities[idx], ...data };
    this.saveActivities(activities);
    return activities[idx];
  },

  deleteActivity(id: number): boolean {
    const activities = this.getActivities();
    const filtered = activities.filter((a) => a.id !== id);
    this.saveActivities(filtered);
    return filtered.length < activities.length;
  },

  getLogs(date?: string): GuestLog[] {
    const stored = localStorage.getItem(GUEST_LOGS_KEY);
    const all: GuestLog[] = stored ? JSON.parse(stored) : [];
    return date ? all.filter((l) => l.date === date) : all;
  },

  upsertLog(activityId: number, completed: boolean, hoursSpent?: number | null): GuestLog {
    const today = new Date().toISOString().split("T")[0];
    const stored = localStorage.getItem(GUEST_LOGS_KEY);
    const all: GuestLog[] = stored ? JSON.parse(stored) : [];
    const activity = this.getActivities().find((a) => a.id === activityId);
    const existing = all.findIndex((l) => l.activityId === activityId && l.date === today);

    const logEntry: GuestLog = {
      id: existing >= 0 ? all[existing].id : nextId(),
      userId: 0,
      activityId,
      activityName: activity?.name ?? "Unknown",
      date: today,
      completed,
      hoursSpent: hoursSpent ?? null,
      notes: null,
      productivityPct: null,
    };

    if (existing >= 0) {
      all[existing] = logEntry;
    } else {
      all.push(logEntry);
    }
    localStorage.setItem(GUEST_LOGS_KEY, JSON.stringify(all));
    return logEntry;
  },

  getTodayTotalHours(): number {
    const today = new Date().toISOString().split("T")[0];
    return this.getLogs(today).reduce((sum, l) => sum + (l.hoursSpent ?? 0), 0);
  },

  deleteAllActivities(): void {
    localStorage.setItem(GUEST_ACTIVITIES_KEY, JSON.stringify([]));
  },

  seedActivities(profession: string): GuestActivity[] {
    const templates = PROFESSION_TEMPLATES[profession] ?? [];

    // Remove all previously generated activities (replace, not append)
    const all = this.getActivities();
    const manual = all.filter(a => !a.isGenerated);
    this.saveActivities(manual);

    // Insert new generated activities
    return templates.map((t, i) => {
      const activity: GuestActivity = {
        ...t,
        id: nextId(),
        userId: 0,
        targetHours: null,
        color: ACTIVITY_COLORS[(manual.length + i) % ACTIVITY_COLORS.length],
        isGenerated: true,
        generatedFromProfession: profession,
      };
      const current = this.getActivities();
      current.push(activity);
      this.saveActivities(current);
      return activity;
    });
  },
};
