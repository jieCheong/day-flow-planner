import { useState } from "react";
import { X, Check, Pin } from "lucide-react";
import { useDayflow } from "@/lib/dayflow/store";
import type { CategoryId, TimeBlock } from "@/lib/dayflow/types";
import { minutesToShort } from "@/lib/dayflow/utils";

type Mode = "create" | "edit";

interface Props {
  mode: Mode;
  dateISO: string;
  initial: Partial<TimeBlock> & { startMinutes: number; endMinutes: number };
  onClose: () => void;
}

const parseTime = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function BlockEditor({ mode, dateISO, initial, onClose }: Props) {
  const categories = useDayflow((s) => s.categories);
  const addBlock = useDayflow((s) => s.addBlock);
  const updateBlock = useDayflow((s) => s.updateBlock);
  const deleteBlock = useDayflow((s) => s.deleteBlock);

  const [title, setTitle] = useState(initial.title ?? "");
  const [category, setCategory] = useState<CategoryId>(
    (initial.category as CategoryId) ?? (categories[0]?.id ?? "work"),
  );
  const [start, setStart] = useState(minutesToShort(initial.startMinutes));
  // For blocks that cross midnight, display the wrapped time (e.g. 1500 min → "01:00")
  const [end, setEnd] = useState(minutesToShort(initial.endMinutes % (24 * 60)));
  const [note, setNote] = useState(initial.note ?? "");
  const [completed, setCompleted] = useState<boolean>(initial.completed ?? false);
  const [fixed, setFixed] = useState<boolean>(initial.fixed ?? false);

  const startParsed = parseTime(start);
  const endParsed = parseTime(end);
  // If end time is earlier than start, treat it as next-day (e.g. 11 PM → 1 AM)
  const isNextDay = endParsed < startParsed;
  const resolvedEnd = isNextDay
    ? endParsed + 24 * 60
    : Math.max(endParsed, startParsed + 15);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: title.trim() || "Untitled",
      category,
      date: dateISO,
      startMinutes: startParsed,
      endMinutes: resolvedEnd,
      note: note.trim() || undefined,
      completed,
      fixed,
    };
    if (mode === "edit" && initial.id && !initial.id.startsWith("tpl-")) {
      updateBlock(initial.id, payload);
    } else {
      const { completed: c, ...rest } = payload;
      const id = addBlock(rest);
      if (c) updateBlock(id, { completed: true });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm grid place-items-center p-4 overflow-auto"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-card rounded-2xl ring-1 ring-border shadow-xl w-full max-w-md p-6 space-y-5 my-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === "edit" ? "Edit block" : "New time block"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="size-7 grid place-items-center rounded-md hover:bg-muted text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Deep work — QuickChef API"
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Category</label>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  category === c.id
                    ? "border-transparent text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
                style={{
                  backgroundColor:
                    category === c.id
                      ? `color-mix(in oklch, var(--${c.color}) 22%, transparent)`
                      : undefined,
                }}
              >
                <span
                  className="inline-block size-2 rounded-full mr-1.5 align-middle"
                  style={{ backgroundColor: `var(--${c.color})` }}
                />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Start</label>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">End</label>
              {isNextDay && (
                <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  +1 day
                </span>
              )}
            </div>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional context for this block"
            rows={3}
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring/30 resize-none"
          />
        </div>

        {/* Completed toggle */}
        <button
          type="button"
          onClick={() => setCompleted((v) => !v)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition ${
            completed
              ? "bg-success/12 border-success/40 text-success"
              : "bg-background border-input text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <span
              className={`size-5 rounded-full grid place-items-center ${
                completed ? "bg-success text-white" : "ring-1 ring-border bg-background"
              }`}
            >
              {completed && <Check className="size-3" />}
            </span>
            {completed ? "Completed" : "Mark as completed"}
          </span>
          {completed && <span className="text-[11px] font-semibold">✓</span>}
        </button>

        {/* Fixed toggle */}
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={fixed}
            onChange={(e) => setFixed(e.target.checked)}
            className="size-3.5"
          />
          <Pin className="size-3" /> Fixed event (auto-plan won't move it)
        </label>

        <div className="flex items-center justify-between pt-2">
          {mode === "edit" && initial.id && !initial.id.startsWith("tpl-") ? (
            <button
              type="button"
              onClick={() => {
                deleteBlock(initial.id!);
                onClose();
              }}
              className="text-xs font-medium text-destructive hover:underline"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
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
              {mode === "edit" ? "Save changes" : "Add block"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
