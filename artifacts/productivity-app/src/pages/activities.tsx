import { useState } from "react";
import { useListActivities, useCreateActivity, useUpdateActivity, useDeleteActivity, getListActivitiesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Activity } from "@workspace/api-client-react/generated/api.schemas";

const activitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  isProductive: z.boolean().default(false),
  targetHours: z.coerce.number().min(0).optional().or(z.literal("")),
  color: z.string().optional(),
});

export default function Activities() {
  const { data: activities, isLoading } = useListActivities();
  const createMutation = useCreateActivity();
  const updateMutation = useUpdateActivity();
  const deleteMutation = useDeleteActivity();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: "",
      category: "",
      isProductive: false,
      targetHours: "",
      color: "#6366f1",
    },
  });

  const openAddDialog = () => {
    setEditingActivity(null);
    form.reset({
      name: "",
      category: "General",
      isProductive: true,
      targetHours: "",
      color: "#6366f1",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (activity: Activity) => {
    setEditingActivity(activity);
    form.reset({
      name: activity.name,
      category: activity.category,
      isProductive: activity.isProductive,
      targetHours: activity.targetHours || "",
      color: activity.color || "#6366f1",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof activitySchema>) => {
    const payload = {
      ...values,
      targetHours: values.targetHours === "" ? null : Number(values.targetHours),
    };

    if (editingActivity) {
      updateMutation.mutate(
        { id: editingActivity.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
            setIsDialogOpen(false);
          }
        }
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
            setIsDialogOpen(false);
          }
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manage Activities</h2>
          <p className="text-muted-foreground">Configure the activities you want to track.</p>
        </div>
        <Button onClick={openAddDialog} data-testid="btn-add-activity">
          <Plus className="w-4 h-4 mr-2" /> Add Activity
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingActivity ? 'Edit Activity' : 'Create Activity'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activity Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Deep Work" {...field} data-testid="input-activity-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Work, Health" {...field} data-testid="input-activity-category" />
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
                      <FormLabel>Daily Target (hrs)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" placeholder="optional" {...field} data-testid="input-activity-target" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isProductive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Productive Activity</FormLabel>
                      <FormDescription>
                        Contributes to your daily productivity score.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-productive"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending} data-testid="btn-save-activity">
                  {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {activities?.map((activity) => (
          <Card key={activity.id} className="bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-opacity-20"
                  style={{ backgroundColor: `${activity.color || '#6366f1'}20`, color: activity.color || '#6366f1' }}
                >
                  {activity.isProductive ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5 opacity-50" />}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{activity.name}</h3>
                  <div className="flex gap-2 text-sm text-muted-foreground mt-1">
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                      {activity.category}
                    </span>
                    {activity.targetHours && (
                      <span className="flex items-center text-xs">
                        Target: {activity.targetHours}h
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(activity)} data-testid={`btn-edit-${activity.id}`}>
                  <Edit className="w-4 h-4" />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" data-testid={`btn-delete-${activity.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Activity?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this activity. Past logs will retain the activity name but won't be linked to this config.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDelete(activity.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
        {activities?.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg border-muted">
            <h3 className="text-lg font-medium text-muted-foreground">No activities configured</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first activity to start tracking.</p>
            <Button onClick={openAddDialog}>Create Activity</Button>
          </div>
        )}
      </div>
    </div>
  );
}
