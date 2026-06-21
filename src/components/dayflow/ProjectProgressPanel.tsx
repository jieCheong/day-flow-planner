import { useMemo } from "react";
import { differenceInCalendarDays, parseISO, format } from "date-fns";
import { Calendar, Sparkles } from "lucide-react";
import { useDayflow } from "@/lib/dayflow/store";
import { autoScheduleTask, getTaskProgress } from "@/lib/dayflow/scheduler";
import { toast } from "sonner";

export function ProjectProgressPanel() {
  const tasks = useDayflow((s) => s.tasks);
  const blocks = useDayflow((s) => s.blocks);

  const items = useMemo(
    () =>
      tasks
        .filter((t) => t.deadline && t.estimateMinutes && !t.completed)
        .sort((a, b) => a.deadline!.localeCompare(b.deadline!)),
    [tasks],
  );

  if (items.length === 0) {
    return (
      <section className="bg-card rounded-2xl ring-1 ring-border p-6">
        <h2 className="text-sm font-semibold mb-1">Projects on deadline</h2>
        <p className="text-xs text-muted-foreground">
          Add a task with a deadline and estimate to see progress here.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-card rounded-2xl ring-1 ring-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Projects on deadline</h2>
        <span className="text-[10px] text-muted-foreground font-mono">
          scheduled vs. estimated
        </span>
      </div>
      <ul className="space-y-4">
        {items.map((t) => {
          const p = getTaskProgress(t, blocks);
          const daysLeft = differenceInCalendarDays(
            parseISO(t.deadline!),
            new Date(),
          );
          const risk = daysLeft < 0 || p.schedulePct < 60;
          return (
            <li key={t.id} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Due {format(parseISO(t.deadline!), "MMM d")} ·{" "}
                    {daysLeft < 0
                      ? `${-daysLeft}d late`
                      : daysLeft === 0
                        ? "today"
                        : `${daysLeft}d left`}
                  </p>
                </div>
                <div className="text-right text-[11px] font-mono shrink-0">
                  <div>
                    {(p.done / 60).toFixed(1)} /{" "}
                    {(t.estimateMinutes! / 60).toFixed(1)}h
                  </div>
                  <div className="text-muted-foreground">
                    {(p.scheduled / 60).toFixed(1)}h planned
                  </div>
                </div>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-primary/30 rounded-full"
                  style={{ width: `${p.schedulePct}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-success rounded-full"
                  style={{ width: `${p.donePct}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span
                  className={`text-[10px] font-semibold ${risk ? "text-destructive" : "text-success"}`}
                >
                  {risk
                    ? p.schedulePct < 100
                      ? "Behind schedule"
                      : "Past deadline"
                    : "On track"}
                </span>
                <button
                  onClick={() => {
                    const r = autoScheduleTask(t);
                    if (r.blocksCreated > 0)
                      toast.success(
                        `Scheduled ${r.blocksCreated} block${r.blocksCreated === 1 ? "" : "s"}` +
                          (r.warning ? ` · ${r.warning}` : ""),
                      );
                    else toast(r.warning ?? "Nothing to schedule");
                  }}
                  className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-medium"
                >
                  <Sparkles className="size-2.5" /> Auto-schedule
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-muted-foreground mt-4 flex items-center gap-1.5">
        <Calendar className="size-3" />
        Auto-schedule distributes remaining hours across days until the
        deadline, around your existing blocks.
      </p>
    </section>
  );
}
