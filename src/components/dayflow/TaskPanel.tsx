import { useState } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { Plus, Trash2, Calendar, Sparkles, X, Pencil } from "lucide-react";
import { useDayflow } from "@/lib/dayflow/store";
import type { Priority, Task } from "@/lib/dayflow/types";
import {
  autoScheduleTask,
  clearTaskSchedule,
  getTaskProgress,
} from "@/lib/dayflow/scheduler";
import { toast } from "sonner";

const priorityStyles: Record<Priority, string> = {
  high: "bg-destructive/15 text-destructive ring-destructive/20",
  medium: "bg-warning/20 text-foreground ring-warning/30",
  low: "bg-muted text-muted-foreground ring-border",
};

const priorityDot: Record<Priority, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-muted-foreground/50",
};

export function TaskPanel() {
  const tasks = useDayflow((s) => s.tasks);
  const addTask = useDayflow((s) => s.addTask);
  const toggleTask = useDayflow((s) => s.toggleTask);
  const deleteTask = useDayflow((s) => s.deleteTask);
  const blocks = useDayflow((s) => s.blocks);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [editing, setEditing] = useState<Task | null>(null);
  const [expandedAdd, setExpandedAdd] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [estimate, setEstimate] = useState("");

  const active = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  const ordered = [...active].sort((a, b) => {
    // deadline first, then priority
    if (a.deadline && b.deadline) {
      const d = a.deadline.localeCompare(b.deadline);
      if (d !== 0) return d;
    } else if (a.deadline) return -1;
    else if (b.deadline) return 1;
    const w: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    return w[a.priority] - w[b.priority];
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const estimateMinutes = estimate ? Math.round(parseFloat(estimate) * 60) : undefined;
    addTask({
      title: title.trim(),
      priority,
      deadline: deadline || undefined,
      estimateMinutes,
    });
    setTitle("");
    setDeadline("");
    setEstimate("");
    setExpandedAdd(false);
  };

  return (
    <>
      <section className="bg-card rounded-2xl ring-1 ring-border p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            To-do
          </h2>
          <span className="text-[10px] text-muted-foreground font-mono">
            {active.length} open
          </span>
        </div>

        <form onSubmit={handleAdd} className="mb-3 space-y-2">
          <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-2 ring-1 ring-transparent focus-within:ring-ring/30 transition">
            <Plus className="size-4 text-muted-foreground" />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => setExpandedAdd(true)}
              placeholder="Quick add a task..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="text-[11px] bg-background border border-border rounded-md px-1.5 py-0.5"
            >
              <option value="high">High</option>
              <option value="medium">Med</option>
              <option value="low">Low</option>
            </select>
          </div>
          {expandedAdd && (
            <div className="grid grid-cols-2 gap-2 px-1 animate-in fade-in slide-in-from-top-1">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1 mb-1">
                  <Calendar className="size-3" /> Deadline
                </span>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full text-xs bg-background border border-input rounded-md px-2 py-1"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1 block">
                  Estimate (hrs)
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={estimate}
                  onChange={(e) => setEstimate(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full text-xs bg-background border border-input rounded-md px-2 py-1"
                />
              </label>
              <div className="col-span-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setExpandedAdd(false);
                    setTitle("");
                    setDeadline("");
                    setEstimate("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs bg-primary text-primary-foreground rounded-md px-3 py-1 font-medium hover:opacity-90"
                >
                  Add task
                </button>
              </div>
            </div>
          )}
        </form>

        <ul className="space-y-2 flex-1 overflow-y-auto max-h-[520px] pr-1">
          {ordered.map((t) => {
            const progress = getTaskProgress(t, blocks);
            const daysLeft = t.deadline
              ? differenceInCalendarDays(parseISO(t.deadline), new Date())
              : null;
            return (
              <li
                key={t.id}
                className="group p-3 bg-background rounded-xl ring-1 ring-border hover:ring-primary/20 transition"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTask(t.id)}
                    className="mt-0.5 size-4 rounded border border-border hover:border-primary transition-colors shrink-0"
                    aria-label="Complete"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      {t.title}
                    </p>
                    {t.note && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {t.note}
                      </p>
                    )}
                    <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 uppercase ${priorityStyles[t.priority]}`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${priorityDot[t.priority]}`}
                        />
                        {t.priority}
                      </span>
                      {t.deadline && daysLeft != null && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            daysLeft < 0
                              ? "bg-destructive/15 text-destructive"
                              : daysLeft <= 2
                                ? "bg-warning/20 text-foreground"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Calendar className="size-2.5" />
                          {daysLeft < 0
                            ? `${-daysLeft}d late`
                            : daysLeft === 0
                              ? "Today"
                              : `${daysLeft}d left`}
                        </span>
                      )}
                      {t.estimateMinutes && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {(t.estimateMinutes / 60).toFixed(1)}h est
                        </span>
                      )}
                    </div>
                    {t.estimateMinutes && t.deadline && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden relative">
                          <div
                            className="absolute inset-y-0 left-0 bg-primary/30 rounded-full"
                            style={{ width: `${progress.schedulePct}%` }}
                          />
                          <div
                            className="absolute inset-y-0 left-0 bg-success rounded-full"
                            style={{ width: `${progress.donePct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-0.5">
                          <span>
                            {(progress.done / 60).toFixed(1)}h done ·{" "}
                            {(progress.scheduled / 60).toFixed(1)}h planned
                          </span>
                          <button
                            onClick={() => {
                              const r = autoScheduleTask(t);
                              if (r.blocksCreated > 0) {
                                toast.success(
                                  `Scheduled ${r.blocksCreated} block${r.blocksCreated === 1 ? "" : "s"}` +
                                    (r.warning ? ` · ${r.warning}` : ""),
                                );
                              } else {
                                toast(r.warning ?? "Nothing to schedule");
                              }
                            }}
                            className="text-primary hover:underline flex items-center gap-0.5"
                          >
                            <Sparkles className="size-2.5" /> Auto-schedule
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(t)}
                      className="size-6 grid place-items-center text-muted-foreground/0 group-hover:text-muted-foreground hover:text-primary transition rounded-md"
                      aria-label="Edit"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        clearTaskSchedule(t.id);
                        deleteTask(t.id);
                      }}
                      className="size-6 grid place-items-center text-muted-foreground/0 group-hover:text-muted-foreground hover:text-destructive transition rounded-md"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}

          {done.length > 0 && (
            <li className="pt-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-bold mb-2">
                Done
              </p>
              <ul className="space-y-1.5">
                {done.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground"
                  >
                    <button
                      onClick={() => toggleTask(t.id)}
                      className="size-3.5 rounded bg-success/80 grid place-items-center text-white text-[8px] shrink-0"
                    >
                      ✓
                    </button>
                    <span className="line-through truncate">{t.title}</span>
                    <button
                      onClick={() => {
                        clearTaskSchedule(t.id);
                        deleteTask(t.id);
                      }}
                      className="ml-auto opacity-50 hover:opacity-100"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          )}

          {tasks.length === 0 && (
            <li className="text-xs text-muted-foreground text-center py-6">
              No tasks yet — add one above.
            </li>
          )}
        </ul>
      </section>

      {editing && (
        <TaskEditDialog task={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function TaskEditDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const updateTask = useDayflow((s) => s.updateTask);
  const [title, setTitle] = useState(task.title);
  const [note, setNote] = useState(task.note ?? "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [deadline, setDeadline] = useState(task.deadline ?? "");
  const [estimate, setEstimate] = useState(
    task.estimateMinutes ? (task.estimateMinutes / 60).toString() : "",
  );

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateTask(task.id, {
      title: title.trim() || task.title,
      note: note.trim() || undefined,
      priority,
      deadline: deadline || undefined,
      estimateMinutes: estimate
        ? Math.round(parseFloat(estimate) * 60)
        : undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        className="bg-card rounded-2xl ring-1 ring-border shadow-xl w-full max-w-md p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit task</h2>
          <button
            type="button"
            onClick={onClose}
            className="size-7 grid place-items-center rounded-md hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Note</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring/30 resize-none"
          />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Priority
            </span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full text-sm bg-background border border-input rounded-md px-2 py-2"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Deadline
            </span>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full text-sm bg-background border border-input rounded-md px-2 py-2"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Est (h)
            </span>
            <input
              type="number"
              step="0.5"
              min="0"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              className="w-full text-sm bg-background border border-input rounded-md px-2 py-2"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
