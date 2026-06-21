import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  addWeeks,
  format,
  startOfWeek,
  addDays,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Flag, Plus } from "lucide-react";
import { useDayflow } from "@/lib/dayflow/store";
import { CATEGORY_MAP } from "@/lib/dayflow/categories";
import {
  TIMELINE_END,
  TIMELINE_START,
  toISO,
  recurringMatches,
} from "@/lib/dayflow/utils";
import type { Task, TimeBlock } from "@/lib/dayflow/types";
import { ProjectProgressPanel } from "@/components/dayflow/ProjectProgressPanel";
import { BlockEditor } from "@/components/dayflow/BlockEditor";

export const Route = createFileRoute("/week")({
  head: () => ({
    meta: [
      { title: "Week — DayFlow" },
      {
        name: "description",
        content:
          "Week view of your time blocks, recurring routines, and project deadlines.",
      },
    ],
  }),
  component: WeekPage,
});

function WeekPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <WeekSkeleton />;
  return <WeekContent />;
}

function WeekSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="h-10 mb-6 bg-card ring-1 ring-border rounded-lg animate-pulse" />
      <div className="h-[600px] bg-card ring-1 ring-border rounded-2xl animate-pulse" />
    </div>
  );
}

function WeekContent() {
  const [offset, setOffset] = useState(0);
  const categories = useDayflow((s) => s.categories);
  const blocks = useDayflow((s) => s.blocks);
  const tasks = useDayflow((s) => s.tasks);
  const catMap = useMemo(() => CATEGORY_MAP(categories), [categories]);
  const [editing, setEditing] = useState<{ block: TimeBlock; date: string } | null>(null);
  const [creating, setCreating] = useState<{ date: string; start: number } | null>(null);

  const weekStart = startOfWeek(addWeeks(new Date(), offset), {
    weekStartsOn: 1,
  });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));


  const deadlinesByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (!t.deadline || t.completed) continue;
      (map[t.deadline] ??= []).push(t);
    }
    return map;
  }, [tasks]);

  const blocksForDay = (d: Date): TimeBlock[] => {
    const iso = toISO(d);
    const userBlocks = blocks.filter((b) => b.date === iso);
    const recurring: TimeBlock[] = [];
    for (const cat of categories) {
      if (!cat.recurring) continue;
      if (!recurringMatches(cat.recurring, d)) continue;
      if (cat.defaultStart == null || cat.defaultDuration == null) continue;
      const templateId = `tpl-${cat.id}`;
      if (userBlocks.some((b) => b.templateId === templateId)) continue;
      recurring.push({
        id: `${templateId}-${iso}`,
        title: cat.name,
        category: cat.id,
        date: iso,
        startMinutes: cat.defaultStart,
        endMinutes: cat.defaultStart + cat.defaultDuration,
        completed: false,
        templateId,
      });
    }
    return [...userBlocks, ...recurring];
  };

  const totalH = TIMELINE_END - TIMELINE_START;

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
      <div className="min-w-0 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {format(weekStart, "MMM d")} –{" "}
              {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Recurring routines auto-populate · deadlines flagged in headers
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
              This week
            </button>
            <button
              onClick={() => setOffset((o) => o + 1)}
              className="size-9 grid place-items-center rounded-lg bg-card ring-1 ring-border hover:bg-accent"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </header>

        <div className="bg-card rounded-2xl ring-1 ring-border overflow-hidden">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
            <div />
            {days.map((d) => {
              const today = isSameDay(d, new Date());
              const iso = toISO(d);
              const dl = deadlinesByDay[iso] ?? [];
              return (
                <div
                  key={iso}
                  className={`p-3 text-center border-l border-border relative group ${today ? "bg-primary/5" : ""}`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {format(d, "EEE")}
                  </div>
                  <div
                    className={`text-lg font-semibold mt-0.5 ${today ? "text-primary" : ""}`}
                  >
                    {format(d, "d")}
                  </div>
                  {dl.length > 0 && (
                    <div
                      className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-bold text-destructive"
                      title={dl.map((t) => t.title).join(", ")}
                    >
                      <Flag className="size-2.5" /> {dl.length}
                    </div>
                  )}
                  <button
                    onClick={() => setCreating({ date: iso, start: 9 * 60 })}
                    className="absolute top-1.5 right-1.5 size-5 grid place-items-center rounded-md bg-background ring-1 ring-border opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground transition"
                    title="Add block"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[60px_repeat(7,1fr)] relative max-h-[calc(100vh-280px)] overflow-y-auto">
            <div className="border-r border-border">
              {Array.from({ length: totalH / 60 + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[40px] text-[10px] font-mono text-muted-foreground/60 px-2 pt-0.5 text-right"
                >
                  {String(((TIMELINE_START + i * 60) / 60) % 24).padStart(2, "0")}
                  :00
                </div>
              ))}
            </div>
            {days.map((d) => {
              const items = blocksForDay(d);
              const iso = toISO(d);
              return (
                <div
                  key={d.toISOString()}
                  className="relative border-l border-border cursor-pointer"
                  style={{ minHeight: (totalH / 60 + 1) * 40 }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const minute =
                      TIMELINE_START + Math.round(y / 40 / 0.25) * 15;
                    setCreating({
                      date: iso,
                      start: Math.max(TIMELINE_START, Math.min(TIMELINE_END - 30, minute)),
                    });
                  }}
                >
                  {Array.from({ length: totalH / 60 + 1 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-border/40"
                      style={{ top: i * 40 }}
                    />
                  ))}
                  {items
                    .filter(
                      (b) =>
                        b.endMinutes > TIMELINE_START &&
                        b.startMinutes < TIMELINE_END,
                    )
                    .map((b) => {
                      const start = Math.max(b.startMinutes, TIMELINE_START);
                      const end = Math.min(b.endMinutes, TIMELINE_END);
                      const top = ((start - TIMELINE_START) / 60) * 40;
                      const height = Math.max(
                        16,
                        ((end - start) / 60) * 40 - 2,
                      );
                      const cat = catMap[b.category];
                      return (
                        <div
                          key={b.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing({ block: b, date: iso });
                          }}
                          className={`absolute left-1 right-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium overflow-hidden border-l-2 hover:ring-1 hover:ring-primary/40 ${b.completed ? "opacity-60 line-through" : ""}`}
                          style={{
                            top,
                            height,
                            backgroundColor: `color-mix(in oklch, var(--${cat.color}) 16%, transparent)`,
                            borderLeftColor: `var(--${cat.color})`,
                            color: `var(--foreground)`,
                          }}
                          title={`${b.title} — ${cat.name}`}
                        >
                          <div className="truncate">{b.title}</div>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="space-y-6">
        <ProjectProgressPanel />
      </aside>

      {editing && (
        <BlockEditor
          mode="edit"
          dateISO={editing.date}
          initial={editing.block}
          onClose={() => setEditing(null)}
        />
      )}
      {creating && (
        <BlockEditor
          mode="create"
          dateISO={creating.date}
          initial={{ startMinutes: creating.start, endMinutes: creating.start + 60 }}
          onClose={() => setCreating(null)}
        />
      )}
    </div>

  );
}
