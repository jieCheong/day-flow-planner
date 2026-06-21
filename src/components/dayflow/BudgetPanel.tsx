import { useMemo, useState } from "react";
import { Pencil, Check, Plus, Trash2, X } from "lucide-react";
import { useBlocksForDate } from "@/lib/dayflow/derived";
import { useDayflow } from "@/lib/dayflow/store";
import { hoursLabel } from "@/lib/dayflow/utils";
import type { Category } from "@/lib/dayflow/types";

interface Props {
  dateISO: string;
}

const PALETTE = [
  "cat-leetcode",
  "cat-study",
  "cat-project",
  "cat-gym",
  "cat-run",
  "cat-walk",
  "cat-sleep",
  "cat-personal",
];

const BUILTIN_IDS = new Set([
  "leetcode",
  "study",
  "project",
  "gym",
  "run",
  "walk",
  "sleep",
  "personal",
]);

export function BudgetPanel({ dateISO }: Props) {
  const categories = useDayflow((s) => s.categories);
  const updateCategory = useDayflow((s) => s.updateCategory);
  const deleteCategory = useDayflow((s) => s.deleteCategory);
  const addCategory = useDayflow((s) => s.addCategory);
  const blocks = useBlocksForDate(dateISO);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftHours, setDraftHours] = useState("");
  const [draftColor, setDraftColor] = useState(PALETTE[0]);
  const [adding, setAdding] = useState(false);

  const stats = useMemo(() => {
    const m: Record<string, { planned: number; done: number }> = {};
    for (const b of blocks) {
      const cur = m[b.category] ?? { planned: 0, done: 0 };
      const dur = Math.max(0, b.endMinutes - b.startMinutes);
      cur.planned += dur;
      if (b.completed) cur.done += dur;
      m[b.category] = cur;
    }
    return m;
  }, [blocks]);

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setDraftName(c.name);
    setDraftHours((c.budgetMinutes / 60).toString());
    setDraftColor(c.color);
  };

  const commitEdit = (id: string) => {
    const h = parseFloat(draftHours);
    updateCategory(id, {
      name: draftName.trim() || "Untitled",
      budgetMinutes: !isNaN(h) && h >= 0 ? Math.round(h * 60) : 0,
      color: draftColor,
    });
    setEditingId(null);
  };

  const commitAdd = () => {
    const h = parseFloat(draftHours);
    addCategory({
      name: draftName.trim() || "New area",
      color: draftColor,
      budgetMinutes: !isNaN(h) && h > 0 ? Math.round(h * 60) : 60,
    });
    setAdding(false);
    setDraftName("");
    setDraftHours("");
    setDraftColor(PALETTE[0]);
  };

  const visible = categories.filter(
    (c) => c.id !== "sleep" && c.id !== "personal",
  );

  return (
    <section className="bg-card rounded-2xl ring-1 ring-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Time Budgets
        </h2>
        <button
          onClick={() => {
            setAdding(true);
            setDraftName("");
            setDraftHours("1");
            setDraftColor(PALETTE[0]);
          }}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
        >
          <Plus className="size-3" /> Add
        </button>
      </div>

      <div className="space-y-4">
        {visible.map((c) => {
          const s = stats[c.id] ?? { planned: 0, done: 0 };
          const budget = c.budgetMinutes;
          const pct = budget === 0 ? 0 : Math.min(100, (s.done / budget) * 100);
          const plannedPct =
            budget === 0 ? 0 : Math.min(100, (s.planned / budget) * 100);
          const overPlanned = s.planned > budget * 1.2;
          const under = s.planned < budget * 0.5;
          const isEditing = editingId === c.id;

          if (isEditing) {
            return (
              <EditRow
                key={c.id}
                name={draftName}
                hours={draftHours}
                color={draftColor}
                onName={setDraftName}
                onHours={setDraftHours}
                onColor={setDraftColor}
                onSave={() => commitEdit(c.id)}
                onCancel={() => setEditingId(null)}
                onDelete={() => {
                  deleteCategory(c.id);
                  setEditingId(null);
                }}
              />
            );
          }

          return (
            <div key={c.id} className="space-y-1.5 group/row">
              <div className="flex justify-between items-baseline text-xs">
                <button
                  onClick={() => startEdit(c)}
                  className="font-medium flex items-center gap-2 hover:text-primary"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: `var(--${c.color})` }}
                  />
                  {c.name}
                  <Pencil className="size-3 opacity-0 group-hover/row:opacity-60" />
                </button>
                <button
                  onClick={() => startEdit(c)}
                  className="font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <span
                    className={
                      overPlanned
                        ? "text-destructive font-semibold"
                        : under && budget > 0
                          ? "text-warning"
                          : "text-foreground font-semibold"
                    }
                  >
                    {hoursLabel(s.planned)}
                  </span>
                  <span>/ {hoursLabel(budget)}</span>
                </button>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full opacity-40"
                  style={{
                    width: `${plannedPct}%`,
                    backgroundColor: `var(--${c.color})`,
                  }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: `var(--${c.color})`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>{hoursLabel(s.done)} done</span>
                {overPlanned && (
                  <span className="text-destructive font-semibold">
                    Over budget
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {adding && (
          <EditRow
            name={draftName}
            hours={draftHours}
            color={draftColor}
            onName={setDraftName}
            onHours={setDraftHours}
            onColor={setDraftColor}
            onSave={commitAdd}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>
    </section>
  );
}

function EditRow(props: {
  name: string;
  hours: string;
  color: string;
  onName: (v: string) => void;
  onHours: (v: string) => void;
  onColor: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        props.onSave();
      }}
      className="rounded-lg ring-1 ring-border bg-background p-2.5 space-y-2"
    >
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={props.name}
          onChange={(e) => props.onName(e.target.value)}
          placeholder="Area name"
          className="flex-1 min-w-0 px-2 py-1 text-xs bg-card border border-input rounded"
        />
        <input
          type="number"
          step="0.25"
          min="0"
          value={props.hours}
          onChange={(e) => props.onHours(e.target.value)}
          className="w-16 px-2 py-1 text-xs bg-card border border-input rounded text-right font-mono"
        />
        <span className="text-[10px] text-muted-foreground">h/day</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {PALETTE.map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => props.onColor(p)}
            aria-label={p}
            className={`size-5 rounded-full ring-2 transition ${
              props.color === p ? "ring-foreground" : "ring-transparent"
            }`}
            style={{ backgroundColor: `var(--${p})` }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1 justify-end">
        {props.onDelete && (
          <button
            type="button"
            onClick={props.onDelete}
            className="mr-auto inline-flex items-center gap-1 text-[10px] text-destructive hover:underline"
          >
            <Trash2 className="size-3" /> Delete
          </button>
        )}
        <button
          type="button"
          onClick={props.onCancel}
          className="size-6 grid place-items-center rounded text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
        <button
          type="submit"
          className="size-6 grid place-items-center rounded bg-success text-white"
        >
          <Check className="size-3.5" />
        </button>
      </div>
    </form>
  );
}
