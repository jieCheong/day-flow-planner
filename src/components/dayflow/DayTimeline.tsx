import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, Clock, Trash2, Wand2 } from "lucide-react";
import { dayGoalStats, useBlocksForDate, isMissed, useToggleBlock } from "@/lib/dayflow/derived";
import { useDayflow } from "@/lib/dayflow/store";
import { hoursLabel } from "@/lib/dayflow/utils";
import { CATEGORY_MAP } from "@/lib/dayflow/categories";
import {
  PX_PER_MIN,
  TIMELINE_END,
  TIMELINE_START,
  minutesToLabel,
} from "@/lib/dayflow/utils";
import type { TimeBlock } from "@/lib/dayflow/types";
import { BlockEditor } from "./BlockEditor";
import { toast } from "sonner";

interface Props {
  dateISO: string;
}

export function DayTimeline({ dateISO }: Props) {
  const categories = useDayflow((s) => s.categories);
  const catMap = useMemo(() => CATEGORY_MAP(categories), [categories]);
  const blocks = useBlocksForDate(dateISO);
  const toggleBlock = useToggleBlock();
  const deleteBlock = useDayflow((s) => s.deleteBlock);
  const generateDay = useDayflow((s) => s.generateDay);

  const [editing, setEditing] = useState<TimeBlock | null>(null);
  const [creatingMinutes, setCreatingMinutes] = useState<number | null>(null);

  // re-render once a minute for "now" indicator + missed states
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const isToday = dateISO === format(new Date(), "yyyy-MM-dd");
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowOffset = (nowMinutes - TIMELINE_START) * PX_PER_MIN;
  const totalHeight = (TIMELINE_END - TIMELINE_START) * PX_PER_MIN;

  const handleSlotClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minute = TIMELINE_START + Math.round(y / PX_PER_MIN / 15) * 15;
    setCreatingMinutes(Math.max(TIMELINE_START, Math.min(TIMELINE_END - 30, minute)));
  };

  return (
    <>
      <div className="bg-card rounded-2xl ring-1 ring-border overflow-hidden">
        <div className="flex items-baseline justify-between px-6 py-5 border-b border-border gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {format(parseISO(dateISO), "EEEE, MMM d")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click empty slot to add · click block to edit · auto-plan fills gaps
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const n = generateDay(dateISO);
                toast.success(n > 0 ? `Auto-planned ${n} block${n === 1 ? "" : "s"}` : "Day is already full");
              }}
              className="h-9 px-3 rounded-lg bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/15"
            >
              <Wand2 className="size-3.5" /> Auto-plan day
            </button>
            <CompletionMeter dateISO={dateISO} />
          </div>
        </div>


        <div className="relative px-6 py-5 max-h-[calc(100vh-220px)] overflow-y-auto">
          <div
            className="relative"
            style={{ height: totalHeight + 24 }}
            onClick={handleSlotClick}
          >
            {/* Hour gridlines */}
            {Array.from({
              length: (TIMELINE_END - TIMELINE_START) / 60 + 1,
            }).map((_, i) => {
              const m = TIMELINE_START + i * 60;
              const top = i * 60 * PX_PER_MIN;
              return (
                <div
                  key={i}
                  className="absolute left-0 right-0 flex items-center gap-3"
                  style={{ top }}
                >
                  <span className="w-12 shrink-0 text-[10px] font-mono text-muted-foreground/60">
                    {minutesToLabel(m % (24 * 60))}
                  </span>
                  <div className="flex-1 h-px bg-border/60" />
                </div>
              );
            })}

            {/* "Now" indicator */}
            {isToday &&
              nowMinutes >= TIMELINE_START &&
              nowMinutes <= TIMELINE_END && (
                <div
                  className="absolute left-0 right-0 flex items-center gap-3 z-20 pointer-events-none"
                  style={{ top: nowOffset }}
                >
                  <span className="w-12 shrink-0 text-[10px] font-mono font-bold text-primary">
                    {format(now, "h:mm a")}
                  </span>
                  <div className="flex-1 h-[2px] bg-primary rounded-full" />
                  <div className="size-2 rounded-full bg-primary -ml-3" />
                </div>
              )}

            {/* Blocks */}
            <div className="absolute left-16 right-0 top-0 bottom-0 pointer-events-none">
              {blocks
                .filter(
                  (b) =>
                    b.endMinutes > TIMELINE_START &&
                    b.startMinutes < TIMELINE_END,
                )
                .map((b) => {
                  const start = Math.max(b.startMinutes, TIMELINE_START);
                  const end = Math.min(b.endMinutes, TIMELINE_END);
                  const top = (start - TIMELINE_START) * PX_PER_MIN;
                  const height = Math.max(28, (end - start) * PX_PER_MIN - 2);
                  const cat = catMap[b.category];
                  const missed = isMissed(b, now, dateISO);

                  const compact = height < 64;

                  return (
                    <div
                      key={b.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(b);
                      }}
                      className={`absolute left-0 right-2 rounded-xl overflow-hidden pointer-events-auto cursor-pointer transition-all border-l-4 hover:ring-2 hover:ring-offset-1 hover:ring-offset-card group ${
                        compact ? "px-3 py-1" : "px-3 py-2"
                      } ${
                        b.completed
                          ? "bg-success/12 border-success ring-success/40"
                          : missed
                            ? "bg-muted/60 border-muted-foreground/30 opacity-70"
                            : ""
                      }`}
                      style={{
                        top,
                        height,
                        backgroundColor: b.completed
                          ? undefined
                          : missed
                            ? undefined
                            : `color-mix(in oklch, var(--${cat.color}) 14%, transparent)`,
                        borderLeftColor: b.completed
                          ? undefined
                          : missed
                            ? undefined
                            : `var(--${cat.color})`,
                      }}
                    >
                      {compact ? (
                        // Horizontal single-line layout for short blocks
                        <div className="flex items-center gap-2 h-full min-w-0">
                          <h3
                            className={`text-sm font-semibold leading-tight truncate ${
                              b.completed ? "line-through opacity-70" : ""
                            }`}
                          >
                            {b.title}
                          </h3>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                            {minutesToLabel(b.startMinutes)}–{minutesToLabel(b.endMinutes)}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground truncate hidden sm:inline">
                            · {cat.name}
                          </span>
                          {b.completed && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success shrink-0">
                              <Check className="size-3" /> Done
                            </span>
                          )}
                          {!b.completed && missed && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive shrink-0">
                              <Clock className="size-3" /> Missed
                            </span>
                          )}
                          <div className="ml-auto flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBlock(b);
                              }}
                              className={`size-5 rounded-full grid place-items-center transition-colors ${
                                b.completed
                                  ? "bg-success text-white"
                                  : "bg-background/80 border border-border hover:border-success hover:text-success"
                              }`}
                              aria-label="Toggle complete"
                            >
                              {b.completed && <Check className="size-3" />}
                            </button>
                            {!b.id.startsWith("tpl-") && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteBlock(b.id);
                                }}
                                className="size-5 rounded-full grid place-items-center text-muted-foreground/0 group-hover:text-muted-foreground hover:text-destructive transition-colors"
                                aria-label="Delete"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2 h-full">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3
                                className={`text-sm font-semibold leading-tight truncate ${
                                  b.completed ? "line-through opacity-70" : ""
                                }`}
                              >
                                {b.title}
                              </h3>
                            </div>
                            <p className="text-[10.5px] font-medium text-muted-foreground mt-0.5 uppercase tracking-wide">
                              {cat.name}
                              <span className="ml-1.5 font-mono normal-case tracking-normal">
                                {minutesToLabel(b.startMinutes)} –{" "}
                                {minutesToLabel(b.endMinutes)}
                              </span>
                            </p>
                            {b.note && height > 80 && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {b.note}
                              </p>
                            )}
                            {b.completed ? (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-success">
                                <Check className="size-3" /> Completed
                              </span>
                            ) : missed ? (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-destructive">
                                <Clock className="size-3" /> Missed
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBlock(b);
                              }}
                              className={`size-6 rounded-full grid place-items-center transition-colors ${
                                b.completed
                                  ? "bg-success text-white"
                                  : "bg-background/80 border border-border hover:border-success hover:text-success"
                              }`}
                              aria-label="Toggle complete"
                            >
                              {b.completed && <Check className="size-3.5" />}
                            </button>
                            {!b.id.startsWith("tpl-") && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteBlock(b.id);
                                }}
                                className="size-6 rounded-full grid place-items-center text-muted-foreground/0 group-hover:text-muted-foreground hover:text-destructive transition-colors"
                                aria-label="Delete"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

            </div>
          </div>
        </div>
      </div>

      {editing && (
        <BlockEditor
          mode="edit"
          dateISO={dateISO}
          initial={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {creatingMinutes != null && (
        <BlockEditor
          mode="create"
          dateISO={dateISO}
          initial={{
            startMinutes: creatingMinutes,
            endMinutes: creatingMinutes + 60,
          }}
          onClose={() => setCreatingMinutes(null)}
        />
      )}
    </>
  );
}

function CompletionMeter({ dateISO }: { dateISO: string }) {
  const blocks = useDayflow((s) => s.blocks);
  const categories = useDayflow((s) => s.categories);
  const stats = useMemo(
    () => dayGoalStats(dateISO, blocks, categories),
    [dateISO, blocks, categories],
  );
  return (
    <div className="text-right">
      <div className="text-2xl font-semibold tabular-nums">{stats.pct}%</div>
      <p className="text-[11px] text-muted-foreground">
        {hoursLabel(stats.doneMinutes)} of {hoursLabel(stats.goalMinutes)} · {stats.doneBlocks} of {stats.totalBlocks} blocks
      </p>
    </div>
  );
}

