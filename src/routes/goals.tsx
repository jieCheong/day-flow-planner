import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { addMonths, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";
import { Plus, Target, Trash2, Sparkles, CheckCircle2 } from "lucide-react";
import { useDayflow } from "@/lib/dayflow/store";
import type { Goal, GoalHabit } from "@/lib/dayflow/types";
import { toISO, uid } from "@/lib/dayflow/utils";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "Goals — DayFlow" },
      { name: "description", content: "Build structured plans toward your goals with weekly check-ins." },
    ],
  }),
  component: GoalsPage,
});

function suggestHabits(title: string): Omit<GoalHabit, "id">[] {
  const t = title.toLowerCase();
  if (/lose|weight|pound|kg|fit/.test(t)) {
    return [
      { title: "Gym session", category: "gym", minutesPerOccurrence: 60, perWeek: 4 },
      { title: "Walk / cardio", category: "walk", minutesPerOccurrence: 30, perWeek: 5 },
      { title: "Log meals", minutesPerOccurrence: 10, perWeek: 7 },
    ];
  }
  if (/learn|study|exam|read/.test(t)) {
    return [
      { title: "Deep study session", category: "study", minutesPerOccurrence: 60, perWeek: 5 },
      { title: "Review notes", category: "study", minutesPerOccurrence: 20, perWeek: 7 },
    ];
  }
  if (/ship|build|launch|project|app/.test(t)) {
    return [
      { title: "Deep work on project", category: "project", minutesPerOccurrence: 90, perWeek: 5 },
      { title: "Weekly review", minutesPerOccurrence: 30, perWeek: 1 },
    ];
  }
  if (/leetcode|algorithm|interview/.test(t)) {
    return [
      { title: "LeetCode problems", category: "leetcode", minutesPerOccurrence: 60, perWeek: 5 },
    ];
  }
  return [{ title: "Daily action", minutesPerOccurrence: 30, perWeek: 5 }];
}

function GoalsPage() {
  const goals = useDayflow((s) => s.goals);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Target className="size-5 text-primary" /> Goals
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Set a target with a deadline; we'll suggest habits and weekly check-ins.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5"
        >
          <Plus className="size-4" /> New goal
        </button>
      </header>

      {goals.length === 0 ? (
        <div className="bg-card rounded-2xl ring-1 ring-border p-10 text-center">
          <Sparkles className="size-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium">No goals yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try "Lose 10 lbs in 3 months" or "Ship MVP in 8 weeks".
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} onOpen={() => setOpenId(g.id)} />
          ))}
        </div>
      )}

      {creating && <CreateGoalDialog onClose={() => setCreating(false)} />}
      {openId && (
        <GoalDetailDialog
          goal={goals.find((g) => g.id === openId)!}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function progressOf(goal: Goal) {
  const start = parseISO(goal.startDate).getTime();
  const end = parseISO(goal.deadline).getTime();
  const now = Date.now();
  const elapsed = Math.max(0, Math.min(1, (now - start) / (end - start || 1)));
  return Math.round(elapsed * 100);
}

function GoalCard({ goal, onOpen }: { goal: Goal; onOpen: () => void }) {
  const daysLeft = differenceInCalendarDays(parseISO(goal.deadline), new Date());
  const elapsed = progressOf(goal);
  return (
    <button
      onClick={onOpen}
      className="text-left bg-card rounded-2xl ring-1 ring-border p-5 hover:ring-primary/40 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-base truncate">{goal.title}</h3>
          {goal.target && (
            <p className="text-xs text-muted-foreground mt-0.5">{goal.target}</p>
          )}
        </div>
        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
          {daysLeft >= 0 ? `${daysLeft}d left` : "overdue"}
        </span>
      </div>
      <div className="mt-4">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${elapsed}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
          <span>{format(parseISO(goal.startDate), "MMM d")}</span>
          <span>{elapsed}% elapsed</span>
          <span>{format(parseISO(goal.deadline), "MMM d")}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {goal.habits.slice(0, 3).map((h) => (
          <span key={h.id} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {h.title} · {h.perWeek}×/wk
          </span>
        ))}
      </div>
    </button>
  );
}

function CreateGoalDialog({ onClose }: { onClose: () => void }) {
  const addGoal = useDayflow((s) => s.addGoal);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState(toISO(addMonths(new Date(), 3)));
  const habits = useMemo(() => suggestHabits(title).map((h) => ({ ...h, id: uid() })), [title]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addGoal({
      title: title.trim(),
      target: target.trim() || undefined,
      startDate: toISO(new Date()),
      deadline,
      habits,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-card rounded-2xl ring-1 ring-border shadow-xl w-full max-w-md p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold">New goal</h2>
        <label className="space-y-1.5 block">
          <span className="text-xs font-medium text-muted-foreground">Goal title</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Lose 10 pounds"
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <label className="space-y-1.5 block">
          <span className="text-xs font-medium text-muted-foreground">Target (optional)</span>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. From 180 lbs to 170 lbs"
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <label className="space-y-1.5 block">
          <span className="text-xs font-medium text-muted-foreground">Deadline</span>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>
        {title && habits.length > 0 && (
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">
              Suggested habits
            </p>
            <ul className="space-y-1">
              {habits.map((h) => (
                <li key={h.id} className="text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="size-3 text-success" />
                  {h.title} · {h.minutesPerOccurrence} min × {h.perWeek}/wk
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground">
            Create goal
          </button>
        </div>
      </form>
    </div>
  );
}

function GoalDetailDialog({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const deleteGoal = useDayflow((s) => s.deleteGoal);
  const addCheckin = useDayflow((s) => s.addCheckin);
  const [rating, setRating] = useState(3);
  const [note, setNote] = useState("");
  const weekISO = toISO(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const thisWeek = goal.checkins.find((c) => c.weekISO === weekISO);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm grid place-items-center p-4 overflow-auto" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl ring-1 ring-border shadow-xl w-full max-w-lg p-6 space-y-4 my-8"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{goal.title}</h2>
            {goal.target && <p className="text-xs text-muted-foreground mt-0.5">{goal.target}</p>}
            <p className="text-[11px] text-muted-foreground mt-1">
              {format(parseISO(goal.startDate), "MMM d")} → {format(parseISO(goal.deadline), "MMM d, yyyy")} ·{" "}
              {progressOf(goal)}% elapsed
            </p>
          </div>
          <button
            onClick={() => { deleteGoal(goal.id); onClose(); }}
            className="text-xs text-destructive hover:underline flex items-center gap-1"
          >
            <Trash2 className="size-3" /> Delete
          </button>
        </div>

        <div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2">Habits</p>
          <ul className="space-y-1">
            {goal.habits.map((h) => (
              <li key={h.id} className="text-sm flex items-center justify-between border-b border-border/50 py-1.5">
                <span>{h.title}</span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {h.minutesPerOccurrence}m × {h.perWeek}/wk
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-primary/8 p-4">
          <p className="text-[10px] uppercase font-bold tracking-wider text-primary mb-2">
            Weekly check-in · {format(parseISO(weekISO), "MMM d")}
          </p>
          {thisWeek ? (
            <p className="text-sm">
              ✓ Logged this week — rated {thisWeek.rating}/5
              {thisWeek.note && <span className="block text-xs text-muted-foreground mt-1">{thisWeek.note}</span>}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className={`size-7 rounded-md text-xs font-semibold ${rating >= n ? "bg-primary text-primary-foreground" : "bg-background ring-1 ring-border"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="How did the week go?"
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-xs outline-none resize-none"
              />
              <button
                onClick={() => { addCheckin(goal.id, { weekISO, rating, note: note.trim() || undefined }); setNote(""); }}
                className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                Log check-in
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
