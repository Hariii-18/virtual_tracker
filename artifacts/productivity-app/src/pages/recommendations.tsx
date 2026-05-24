import { useGetRecommendations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Lightbulb, AlertTriangle, ArrowUpCircle, Zap, Shield, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Recommendations() {
  const { data: recs, isLoading } = useGetRecommendations();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!recs) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI Insights & Recommendations</h2>
        <p className="text-muted-foreground">Data-driven analysis of your habits.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-green-500/20 shadow-[0_0_15px_-3px_rgba(34,197,94,0.1)]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-500">
              <Shield className="w-5 h-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recs.strengths?.map((str, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-foreground/90">{str}</span>
                </li>
              ))}
              {(!recs.strengths || recs.strengths.length === 0) && (
                <li className="text-muted-foreground text-sm italic">Not enough data to identify strengths yet.</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-card border-orange-500/20 shadow-[0_0_15px_-3px_rgba(249,115,22,0.1)]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-500">
              <Target className="w-5 h-5" />
              Areas to Improve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recs.weaknesses?.map((wk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span className="text-foreground/90">{wk}</span>
                </li>
              ))}
              {(!recs.weaknesses || recs.weaknesses.length === 0) && (
                <li className="text-muted-foreground text-sm italic">Keep tracking to find areas for improvement.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {recs.productivityAnalysis && (
        <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Weekly Synthesis
            </CardTitle>
            <CardDescription>{recs.weeklyInsight}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/80">
              {recs.productivityAnalysis}
            </p>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-xl font-bold mb-4 mt-8 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          Actionable Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recs.tips?.map((tip, i) => {
            const isHigh = tip.priority === 'high';
            const isMedium = tip.priority === 'medium';
            
            return (
              <Card key={i} className={cn(
                "relative overflow-hidden transition-all duration-300 hover:shadow-md",
                isHigh ? "border-destructive/30" : isMedium ? "border-orange-500/30" : "border-border"
              )}>
                <div className={cn(
                  "absolute top-0 left-0 w-1 h-full",
                  isHigh ? "bg-destructive" : isMedium ? "bg-orange-500" : "bg-primary"
                )} />
                <CardContent className="p-5 pl-6">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {tip.category}
                    </span>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                      isHigh ? "bg-destructive/10 text-destructive" : isMedium ? "bg-orange-500/10 text-orange-500" : "bg-primary/10 text-primary"
                    )}>
                      {tip.priority}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 font-medium">
                    {tip.message}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CheckIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
