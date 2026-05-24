import { useState } from "react";
import { useGetHistory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GetHistoryGroupBy } from "@workspace/api-client-react";

export default function History() {
  const [groupBy, setGroupBy] = useState<GetHistoryGroupBy>(GetHistoryGroupBy.day);
  const { data: historyData, isLoading } = useGetHistory({ groupBy });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500/20 text-green-500 border-green-500/30";
    if (score >= 50) return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
    return "bg-destructive/20 text-destructive border-destructive/30";
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">History Log</h2>
          <p className="text-muted-foreground">Review your past performance and logs.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Group by:</span>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GetHistoryGroupBy)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GetHistoryGroupBy.day}>Day</SelectItem>
              <SelectItem value={GetHistoryGroupBy.week}>Week</SelectItem>
              <SelectItem value={GetHistoryGroupBy.month}>Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {groupBy === 'day' && historyData && historyData.length > 0 && (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Activity Map (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {historyData.slice(0, 30).map((entry, i) => {
                const intensity = Math.min(Math.floor(entry.score / 20), 4);
                return (
                  <div 
                    key={i}
                    title={`${entry.date}: Score ${entry.score}`}
                    className={`w-4 h-4 rounded-sm transition-colors cursor-help 
                      ${intensity === 0 ? 'bg-secondary' : 
                        intensity === 1 ? 'bg-primary/30' : 
                        intensity === 2 ? 'bg-primary/50' : 
                        intensity === 3 ? 'bg-primary/80' : 
                        'bg-primary'}`}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {historyData?.map((entry, idx) => (
          <Card key={idx} className="bg-card overflow-hidden">
            <CardHeader className="p-4 bg-muted/30 border-b flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">
                  {groupBy === 'day' ? format(parseISO(entry.date), "MMM d, yyyy") : entry.date}
                </span>
              </div>
              <div className={`px-2 py-0.5 rounded border text-xs font-bold ${getScoreColor(entry.score)}`}>
                Score: {entry.score}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Completed</p>
                  <p className="font-medium">{entry.completedActivities} / {entry.totalActivities}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Productive Hrs</p>
                  <p className="font-medium">{entry.productiveHours}h</p>
                </div>
              </div>

              {entry.entries && entry.entries.length > 0 && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Activities Logged</p>
                  <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                    {entry.entries.map((log) => (
                      <div key={log.id} className="flex items-center justify-between text-sm bg-secondary/50 px-3 py-2 rounded-md">
                        <span className={log.completed ? "text-foreground" : "text-muted-foreground line-through"}>
                          {log.activityName || `Activity #${log.activityId}`}
                        </span>
                        {log.hoursSpent ? <span className="text-xs font-medium text-muted-foreground">{log.hoursSpent}h</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {(!historyData || historyData.length === 0) && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg border-muted">
            <p className="text-muted-foreground">No history found for the selected period.</p>
          </div>
        )}
      </div>
    </div>
  );
}
