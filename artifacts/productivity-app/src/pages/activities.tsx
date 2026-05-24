import { useState } from "react";
import {
  useListActivities, useCreateActivity, useUpdateActivity, useDeleteActivity,
  getListActivitiesQueryKey, useSeedActivities,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, Edit, Trash2, CheckCircle, XCircle, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Activity } from "@workspace/api-client-react";
import { useGuest } from "@/contexts/guest-context";
import type { GuestActivity } from "@/lib/guest-store";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const activitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  isProductive: z.boolean().default(false),
  targetHours: z.coerce.number().min(0).max(24).optional().or(z.literal("")),
});

const PROFESSIONS = ["Student", "Employee", "Freelancer", "Athlete"];

type AnyActivity = Activity | GuestActivity;

function ActivityCard({
  activity,
  onEdit,
  onDelete,
}: {
  activity: AnyActivity;
  onEdit: (a: AnyActivity) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <Card className="bg-card hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: activity.color ?? "#6366f1" }} />
              <span className="font-medium truncate">{activity.name}</span>
              {activity.isProductive ? (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-5">
              {activity.category}
              {activity.targetHours ? ` · ${activity.targetHours}h target` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(activity)}>
              <Edit className="w-3.5 h-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Activity</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{activity.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(activity.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityFormDialog({
  open,
  onOpenChange,
  editActivity,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editActivity: AnyActivity | null;
  onSubmit: (values: z.infer<typeof activitySchema>, id?: number) => void;
  isPending: boolean;
}) {
  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: editActivity?.name ?? "",
      category: editActivity?.category ?? "",
      isProductive: editActivity?.isProductive ?? true,
      targetHours: editActivity?.targetHours ?? "",
    },
    values: editActivity ? {
      name: editActivity.name,
      category: editActivity.category,
      isProductive: editActivity.isProductive,
      targetHours: editActivity.targetHours ?? "",
    } : undefined,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editActivity ? "Edit Activity" : "Add Activity"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => onSubmit(v, editActivity?.id))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Morning Run" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Health, Work, Education" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Hours / Day (optional)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.5" placeholder="e.g. 2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isProductive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-base">Productive Activity</FormLabel>
                    <FormDescription className="text-xs">Counts toward productivity score</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editActivity ? "Save Changes" : "Add Activity"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function GuestActivities() {
  const { activities, addActivity, updateActivity, deleteActivity, seedProfessionActivities } = useGuest();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<GuestActivity | null>(null);
  const [seedProfession, setSeedProfession] = useState("");

  const handleSubmit = (values: z.infer<typeof activitySchema>, id?: number) => {
    const data = {
      name: values.name,
      category: values.category,
      isProductive: values.isProductive,
      targetHours: values.targetHours === "" ? null : Number(values.targetHours),
      color: null,
    };
    if (id !== undefined) {
      updateActivity(id, data);
      toast({ title: "Activity updated" });
    } else {
      addActivity(data);
      toast({ title: "Activity added" });
    }
    setDialogOpen(false);
    setEditActivity(null);
  };

  const handleSeed = () => {
    if (!seedProfession) return;
    const seeded = seedProfessionActivities(seedProfession);
    toast({ title: "Activities added!", description: `Activities for ${seedProfession} added.` });
  };

  return (
    <ActivitiesView
      activities={activities}
      dialogOpen={dialogOpen}
      setDialogOpen={setDialogOpen}
      editActivity={editActivity}
      setEditActivity={(a) => setEditActivity(a as GuestActivity | null)}
      onSubmit={handleSubmit}
      onDelete={(id) => { deleteActivity(id); toast({ title: "Activity deleted" }); }}
      isPending={false}
      seedProfession={seedProfession}
      setSeedProfession={setSeedProfession}
      onSeed={handleSeed}
    />
  );
}

function AuthActivities() {
  const { data: activities, isLoading } = useListActivities();
  const createMutation = useCreateActivity();
  const updateMutation = useUpdateActivity();
  const deleteMutation = useDeleteActivity();
  const seedMutation = useSeedActivities();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [seedProfession, setSeedProfession] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });

  const handleSubmit = (values: z.infer<typeof activitySchema>, id?: number) => {
    const data = {
      name: values.name,
      category: values.category,
      isProductive: values.isProductive,
      targetHours: values.targetHours === "" ? null : Number(values.targetHours),
    };
    if (id !== undefined) {
      updateMutation.mutate({ id, data }, {
        onSuccess: () => { invalidate(); setDialogOpen(false); setEditActivity(null); toast({ title: "Activity updated" }); },
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Activity added" }); },
      });
    }
  };

  const handleSeed = () => {
    if (!seedProfession) return;
    seedMutation.mutate({ data: { profession: seedProfession } }, {
      onSuccess: (seeded) => {
        invalidate();
        toast({ title: seeded.length > 0 ? `${seeded.length} activities added!` : "No new activities to add" });
      },
    });
  };

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <ActivitiesView
      activities={activities ?? []}
      dialogOpen={dialogOpen}
      setDialogOpen={setDialogOpen}
      editActivity={editActivity}
      setEditActivity={(a) => setEditActivity(a as Activity | null)}
      onSubmit={handleSubmit}
      onDelete={(id) => deleteMutation.mutate({ id }, { onSuccess: () => { invalidate(); toast({ title: "Activity deleted" }); } })}
      isPending={createMutation.isPending || updateMutation.isPending}
      seedProfession={seedProfession}
      setSeedProfession={setSeedProfession}
      onSeed={handleSeed}
    />
  );
}

function ActivitiesView({
  activities, dialogOpen, setDialogOpen, editActivity, setEditActivity,
  onSubmit, onDelete, isPending, seedProfession, setSeedProfession, onSeed,
}: {
  activities: AnyActivity[];
  dialogOpen: boolean;
  setDialogOpen: (v: boolean) => void;
  editActivity: AnyActivity | null;
  setEditActivity: (a: AnyActivity | null) => void;
  onSubmit: (values: z.infer<typeof activitySchema>, id?: number) => void;
  onDelete: (id: number) => void;
  isPending: boolean;
  seedProfession: string;
  setSeedProfession: (v: string) => void;
  onSeed: () => void;
}) {
  const productive = activities.filter(a => a.isProductive);
  const nonProductive = activities.filter(a => !a.isProductive);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manage Activities</h2>
          <p className="text-muted-foreground">Create and manage your daily activities.</p>
        </div>
        <Button onClick={() => { setEditActivity(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Activity
        </Button>
      </div>

      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Wand2 className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-sm text-muted-foreground flex-1">Auto-generate activities for a profession:</p>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={seedProfession} onValueChange={setSeedProfession}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Choose..." />
                </SelectTrigger>
                <SelectContent>
                  {PROFESSIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={onSeed} disabled={!seedProfession}>
                Generate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {activities.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg border-muted">
          <p className="text-muted-foreground mb-4">No activities yet. Add your first one!</p>
          <Button onClick={() => { setEditActivity(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Activity
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {productive.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Productive ({productive.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {productive.map(a => (
                  <ActivityCard key={a.id} activity={a} onEdit={(act) => { setEditActivity(act); setDialogOpen(true); }} onDelete={onDelete} />
                ))}
              </div>
            </div>
          )}
          {nonProductive.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-muted-foreground" />
                Non-Productive ({nonProductive.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {nonProductive.map(a => (
                  <ActivityCard key={a.id} activity={a} onEdit={(act) => { setEditActivity(act); setDialogOpen(true); }} onDelete={onDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ActivityFormDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditActivity(null); }}
        editActivity={editActivity}
        onSubmit={onSubmit}
        isPending={isPending}
      />
    </div>
  );
}

export default function Activities() {
  const { isGuest } = useGuest();
  return isGuest ? <GuestActivities /> : <AuthActivities />;
}
