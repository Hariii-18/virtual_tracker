import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetProfile, useUpdateProfile, useSeedActivities } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { ProfileUpdateProfession } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useGuest } from "@/contexts/guest-context";
import { useQueryClient } from "@tanstack/react-query";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  profession: z.nativeEnum(ProfileUpdateProfession).optional(),
  customProfession: z.string().optional(),
  age: z.coerce.number().min(10).max(120).optional().or(z.literal("")),
  gender: z.string().optional(),
  height: z.coerce.number().min(50).max(300).optional().or(z.literal("")),
  weight: z.coerce.number().min(20).max(300).optional().or(z.literal("")),
  goals: z.string().optional(),
  wakeUpTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Must be HH:MM").optional().or(z.literal("")),
  sleepTarget: z.coerce.number().min(4).max(16).optional().or(z.literal("")),
});

function GuestProfile() {
  const { profile, updateProfile, seedProfessionActivities } = useGuest();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile.name || "",
      profession: (profile.profession ?? undefined) as Exclude<ProfileUpdateProfession, null> | undefined,
      customProfession: profile.customProfession || "",
      age: profile.age ?? "",
      gender: profile.gender || "",
      height: profile.height ?? "",
      weight: profile.weight ?? "",
      goals: profile.goals || "",
      wakeUpTime: profile.wakeUpTime || "",
      sleepTarget: profile.sleepTarget ?? "",
    },
  });

  const selectedProfession = form.watch("profession");
  const showCustomField = selectedProfession === ProfileUpdateProfession.Custom;

  const onSubmit = (values: z.infer<typeof profileSchema>) => {
    const prevProfession = profile.profession;
    updateProfile({
      name: values.name,
      profession: values.profession ?? null,
      customProfession: values.customProfession || null,
      age: values.age === "" ? null : Number(values.age),
      gender: values.gender || null,
      height: values.height === "" ? null : Number(values.height),
      weight: values.weight === "" ? null : Number(values.weight),
      goals: values.goals || null,
      wakeUpTime: values.wakeUpTime === "" ? null : (values.wakeUpTime ?? null),
      sleepTarget: values.sleepTarget === "" ? null : Number(values.sleepTarget),
    });

    if (values.profession && values.profession !== ProfileUpdateProfession.Custom && values.profession !== prevProfession) {
      seedProfessionActivities(values.profession);
      toast({ title: "Activities added!", description: `Predefined activities for ${values.profession} have been added.` });
    }

    toast({ title: "Profile saved", description: "Your profile has been updated locally." });
  };

  return (
    <ProfileForm form={form} onSubmit={onSubmit} isPending={false} showCustomField={showCustomField} isGuest />
  );
}

function AuthProfile() {
  const { data: profile, isLoading } = useGetProfile();
  const updateProfileMutation = useUpdateProfile();
  const seedActivitiesMutation = useSeedActivities();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [prevProfession, setPrevProfession] = useState<string | null>(null);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      profession: undefined,
      customProfession: "",
      age: "",
      gender: "",
      height: "",
      weight: "",
      goals: "",
      wakeUpTime: "",
      sleepTarget: "",
    },
  });

  const selectedProfession = form.watch("profession");
  const showCustomField = selectedProfession === ProfileUpdateProfession.Custom;

  useEffect(() => {
    if (profile) {
      setPrevProfession(profile.profession ?? null);
      form.reset({
        name: profile.name || "",
        profession: (profile.profession ?? undefined) as Exclude<ProfileUpdateProfession, null> | undefined,
        customProfession: profile.customProfession || "",
        age: profile.age ?? "",
        gender: profile.gender || "",
        height: profile.height ?? "",
        weight: profile.weight ?? "",
        goals: profile.goals || "",
        wakeUpTime: profile.wakeUpTime || "",
        sleepTarget: profile.sleepTarget ?? "",
      });
    }
  }, [profile, form]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const onSubmit = (values: z.infer<typeof profileSchema>) => {
    const cleanedData = {
      ...values,
      age: values.age === "" ? null : Number(values.age),
      height: values.height === "" ? null : Number(values.height),
      weight: values.weight === "" ? null : Number(values.weight),
      sleepTarget: values.sleepTarget === "" ? null : Number(values.sleepTarget),
      wakeUpTime: values.wakeUpTime === "" ? null : (values.wakeUpTime ?? null),
      customProfession: values.customProfession || null,
    };

    updateProfileMutation.mutate({ data: cleanedData }, {
      onSuccess: (updated) => {
        queryClient.invalidateQueries();
        toast({ title: "Profile saved!", description: "Your profile has been updated." });

        if (values.profession && values.profession !== ProfileUpdateProfession.Custom && values.profession !== prevProfession) {
          setPrevProfession(values.profession);
          seedActivitiesMutation.mutate({ data: { profession: values.profession } }, {
            onSuccess: (seeded) => {
              if (seeded.length > 0) {
                toast({ title: "Activities added!", description: `${seeded.length} predefined activities added for ${values.profession}.` });
              }
            },
          });
        }
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
      },
    });
  };

  return (
    <ProfileForm
      form={form}
      onSubmit={onSubmit}
      isPending={updateProfileMutation.isPending}
      showCustomField={showCustomField}
      isGuest={false}
    />
  );
}

function ProfileForm({
  form,
  onSubmit,
  isPending,
  showCustomField,
}: {
  form: ReturnType<typeof useForm<z.infer<typeof profileSchema>>>;
  onSubmit: (values: z.infer<typeof profileSchema>) => void;
  isPending: boolean;
  showCustomField: boolean;
  isGuest: boolean;
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile Settings</h2>
        <p className="text-muted-foreground">Manage your personal info and preferences.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your name, age, and other details.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="profession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profession</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
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

              {showCustomField && (
                <FormField
                  control={form.control}
                  name="customProfession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Profession</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Designer, Doctor..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 28" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Non-binary">Non-binary</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Health Metrics</CardTitle>
              <CardDescription>Used for BMI calculation and health tracking.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 175" {...field} />
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
                      <Input type="number" placeholder="e.g. 70" {...field} />
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
                    <FormLabel>Wake Up Time (HH:MM)</FormLabel>
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
                      <Input type="number" placeholder="8" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="goals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Goals</FormLabel>
                    <FormControl>
                      <Input placeholder="What do you want to achieve?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending} className="min-w-[120px]">
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function Profile() {
  const { isGuest } = useGuest();
  return isGuest ? <GuestProfile /> : <AuthProfile />;
}
