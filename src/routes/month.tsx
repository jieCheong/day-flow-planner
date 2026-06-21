import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Flag } from "lucide-react";
import { ProjectProgressPanel } from "@/components/dayflow/ProjectProgressPanel";
import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDayflow } from "@/lib/dayflow/store";
import { dayGoalStats } from "@/lib/dayflow/derived";
import { toISO } from "@/lib/dayflow/utils";

export const Route = createFileRoute("/month")({
  head: () => ({
    meta: [
      { title: "Month — DayFlow" },
      {
        name: "description",
        content: "Monthly heatmap of your daily completion.",
      },
    ],
  }),
  component: MonthPage,
});

function MonthPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted)
    return (
      <div className="p-6 lg:p-8 max-w-[1200px] mx-auto">
        <div className="h-[600px] rounded-2xl bg-card ring-1 ring-border animate-pulse" />
      </div>
    );
  return <MonthContent />;
}

function MonthContent() {
  const [offset, setOffset] = useState(0);
  const blocks = useDayflow((s) => s.blocks);
  const tasks = useDayflow((s) => s.tasks);
  const categories = useDayflow((s) => s.categories);

  const cursor = addMonths(new Date(), offset);
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const pctFor = (iso: string) => {
    const s = dayGoalStats(iso, blocks, categories);
    if (s.totalBlocks === 0 && s.doneMinutes === 0) return null;
    if (s.goalMinutes === 0) return null;
    return s.doneMinutes / s.goalMinutes;
  };

  const deadlinesByDay = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of tasks) {
      if (!t.deadline || t.completed) continue;
      m[t.deadline] = (m[t.deadline] ?? 0) + 1;
    }
    return m;
  }, [tasks]);

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
      <div className="min-w-0">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {format(cursor, "MMMM yyyy")}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Daily % of time budget completed · click a day to jump to it
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset((o) => o - 1)}
              className="size-9 grid place-items-center rounded-lg bg-card ring-1 ring-border hover:bg-accent"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => setOffset(0)}
              className="px-3 h-9 rounded-lg bg-card ring-1 ring-border text-xs font-medium hover:bg-accent"
            >
              This month
            </button>
            <button
              onClick={() => setOffset((o) => o + 1)}
              className="size-9 grid place-items-center rounded-lg bg-card ring-1 ring-border hover:bg-accent"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </header>

        <div className="bg-card rounded-2xl ring-1 ring-border p-6">
          <div className="grid grid-cols-7 gap-2 mb-3">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div
                key={d}
                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((d) => {
              const iso = toISO(d);
              const inMonth = isSameMonth(d, cursor);
              const today = isSameDay(d, new Date());
              const pct = pctFor(iso);
              const intensity = pct == null ? 0 : 0.15 + pct * 0.7;
              const deadlines = deadlinesByDay[iso] ?? 0;
              return (
                <Link
                  key={iso}
                  to="/"
                  className={`aspect-square rounded-xl p-2 flex flex-col justify-between transition-all hover:scale-[1.03] hover:ring-2 hover:ring-primary/40 relative ${
                    inMonth ? "" : "opacity-30"
                  } ${today ? "ring-2 ring-primary" : "ring-1 ring-border"}`}
                  style={{
                    backgroundColor:
                      pct == null
                        ? "var(--card)"
                        : `color-mix(in oklch, var(--success) ${intensity * 100}%, var(--card))`,
                  }}
                >
                  <span
                    className={`text-xs font-semibold ${today ? "text-primary" : ""}`}
                  >
                    {format(d, "d")}
                  </span>
                  {deadlines > 0 && (
                    <span
                      className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold text-destructive"
                      title={`${deadlines} deadline${deadlines === 1 ? "" : "s"}`}
                    >
                      <Flag className="size-2.5" />
                      {deadlines}
                    </span>
                  )}
                  {pct != null && (
                    <span className="text-[10px] font-mono font-semibold text-foreground/80">
                      {Math.min(100, Math.round(pct * 100))}%
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-border flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>Less</span>
            {[0.15, 0.35, 0.55, 0.75, 0.95].map((v) => (
              <div
                key={v}
                className="size-4 rounded"
                style={{
                  backgroundColor: `color-mix(in oklch, var(--success) ${v * 100}%, var(--card))`,
                }}
              />
            ))}
            <span>More</span>
            <span className="ml-auto inline-flex items-center gap-1">
              <Flag className="size-3 text-destructive" /> Deadline
            </span>
          </div>
        </div>
      </div>

      <aside className="space-y-6">
        <ProjectProgressPanel />
      </aside>
    </div>
  );
}

