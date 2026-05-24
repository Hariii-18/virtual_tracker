import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdateProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { ProfileUpdateProfession } from "@workspace/api-client-react";

const onboardingSchema = z.object({
  profession: z.nativeEnum(ProfileUpdateProfession).optional(),
  age: z.coerce.number().min(10).max(120).optional().or(z.literal("")),
  gender: z.string().optional(),
  height: z.coerce.number().min(50).max(300).optional().or(z.literal("")),
  weight: z.coerce.number().min(20).max(300).optional().or(z.literal("")),
  goals: z.string().optional(),
  wakeUpTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Must be HH:MM").optional().or(z.literal("")),
  sleepTarget: z.coerce.number().min(4).max(16).optional().or(z.literal("")),
});

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const updateProfileMutation = useUpdateProfile();

  const form = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
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

  const onSubmit = (values: z.infer<typeof onboardingSchema>) => {
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
        setLocation("/dashboard");
      }
    });
  };

  const handleSkip = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background py-12 relative">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>

      <div className="z-10 w-full max-w-2xl">
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Complete your profile</CardTitle>
            <CardDescription>We use this data to provide personalized productivity insights and BMI calculations.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="profession"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profession</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-profession">
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
                          <Input type="number" placeholder="e.g. 28" {...field} data-testid="input-age" />
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
                          <Input type="number" placeholder="e.g. 175" {...field} data-testid="input-height" />
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
                          <Input type="number" placeholder="e.g. 70" {...field} data-testid="input-weight" />
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
                          <Input placeholder="07:00" {...field} data-testid="input-wake" />
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
                          <Input type="number" placeholder="8" {...field} data-testid="input-sleep" />
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
                        <Input placeholder="What do you want to achieve?" {...field} data-testid="input-goals" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between pt-6 border-t border-border/50">
                  <Button type="button" variant="ghost" onClick={handleSkip} data-testid="btn-skip">
                    Skip for now
                  </Button>
                  <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="btn-submit">
                    {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Save Profile
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
