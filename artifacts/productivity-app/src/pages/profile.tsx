import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetProfile, useUpdateProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { ProfileUpdateProfession } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  profession: z.nativeEnum(ProfileUpdateProfession).optional(),
  age: z.coerce.number().min(10).max(120).optional().or(z.literal("")),
  gender: z.string().optional(),
  height: z.coerce.number().min(50).max(300).optional().or(z.literal("")),
  weight: z.coerce.number().min(20).max(300).optional().or(z.literal("")),
  goals: z.string().optional(),
  wakeUpTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Must be HH:MM").optional().or(z.literal("")),
  sleepTarget: z.coerce.number().min(4).max(16).optional().or(z.literal("")),
});

export default function Profile() {
  const { data: profile, isLoading } = useGetProfile();
  const updateProfileMutation = useUpdateProfile();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      profession: undefined,
      age: "",
      gender: "",
      height: "",
      weight: "",
      goals: "",
      wakeUpTime: "",
      sleepTarget: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || "",
        profession: profile.profession as ProfileUpdateProfession | undefined,
        age: profile.age || "",
        gender: profile.gender || "",
        height: profile.height || "",
        weight: profile.weight || "",
        goals: profile.goals || "",
        wakeUpTime: profile.wakeUpTime || "",
        sleepTarget: profile.sleepTarget || "",
      });
    }
  }, [profile, form]);

  const onSubmit = (values: z.infer<typeof profileSchema>) => {
    const cleanedData = {
      ...values,
      age: values.age === "" ? null : Number(values.age),
      height: values.height === "" ? null : Number(values.height),
      weight: values.weight === "" ? null : Number(values.weight),
      sleepTarget: values.sleepTarget === "" ? null : Number(values.sleepTarget),
      wakeUpTime: values.wakeUpTime === "" ? null : values.wakeUpTime,
    };

    updateProfileMutation.mutate({ data: cleanedData }, {
      onSuccess: () => {
        toast({
          title: "Profile updated",
          description: "Your settings have been saved successfully.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Could not update profile.",
          variant: "destructive"
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Profile Settings</h2>
        <p className="text-muted-foreground">Manage your personal information and goals.</p>
      </div>

      <Card className="bg-card">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="profession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profession</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select profession" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={ProfileUpdateProfession.Student}>Student</SelectItem>
                          <SelectItem value={ProfileUpdateProfession.Employee}>Employee</SelectItem>
                          <SelectItem value={ProfileUpdateProfession.Freelancer}>Freelancer</SelectItem>
                          <SelectItem value={ProfileUpdateProfession.Athlete}>Athlete</SelectItem>
                          <SelectItem value={ProfileUpdateProfession.Custom}>Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wakeUpTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Wake Up Time</FormLabel>
                      <FormControl>
                        <Input placeholder="07:00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sleepTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sleep Target (hours)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="goals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Goals</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="btn-save-profile">
                  {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
