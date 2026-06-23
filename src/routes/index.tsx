import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DayTimeline } from "@/components/dayflow/DayTimeline";
import { BudgetPanel } from "@/components/dayflow/BudgetPanel";
import { TaskPanel } from "@/components/dayflow/TaskPanel";
import { ReflectionCard } from "@/components/dayflow/ReflectionCard";
import { useClientToday } from "@/lib/dayflow/useClientToday";
import { toISO } from "@/lib/dayflow/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getUser } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — DayFlow" },
      {
        name: "description",
        content:
          "Plan your day in time blocks, track budgets per category, and reflect at day's end.",
      },
    ],
  }),
  component: DayPage,
});

function DayPage() {
  const today = useClientToday();
  const [date, setDate] = useState<string>("");
  const currentUser = getUser();
  const displayName = currentUser?.username || currentUser?.email?.split("@")[0] || null;

  // Initialize to today once the client knows today; keep in sync when day rolls
  // over only if the user is still viewing today (don't yank them away from a
  // future date they're planning).
  useEffect(() => {
    if (!today) return;
    setDate((cur) => (cur === "" ? today : cur));
  }, [today]);

  if (!date) {
    return (
      <div className="p-6 lg:p-8 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 max-w-[1600px] mx-auto">
        <div className="h-[600px] rounded-2xl bg-card ring-1 ring-border animate-pulse" />
        <aside className="space-y-6">
          <div className="h-64 rounded-2xl bg-card ring-1 ring-border animate-pulse" />
          <div className="h-64 rounded-2xl bg-card ring-1 ring-border animate-pulse" />
        </aside>
      </div>
    );
  }

  const shift = (days: number) => setDate(toISO(addDays(parseISO(date), days)));
  const isToday = date === today;

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-4">
      {displayName && (
        <h2 className="text-xl font-semibold text-foreground">
          Hi, {displayName}!
        </h2>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={() => shift(-1)}
          className="size-9 grid place-items-center rounded-lg bg-card ring-1 ring-border hover:bg-accent"
          title="Previous day"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          onClick={() => today && setDate(today)}
          className={cn(
            "px-3 h-9 rounded-lg ring-1 text-xs font-medium transition",
            isToday
              ? "bg-primary text-primary-foreground ring-primary"
              : "bg-card ring-border hover:bg-accent",
          )}
        >
          Today
        </button>
        <button
          onClick={() => shift(1)}
          className="size-9 grid place-items-center rounded-lg bg-card ring-1 ring-border hover:bg-accent"
          title="Next day"
        >
          <ChevronRight className="size-4" />
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button className="h-9 px-3 inline-flex items-center gap-2 rounded-lg bg-card ring-1 ring-border hover:bg-accent text-xs font-medium">
              <CalendarIcon className="size-3.5" />
              {format(parseISO(date), "EEE, MMM d, yyyy")}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={parseISO(date)}
              onSelect={(d) => d && setDate(toISO(d))}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        {!isToday && (
          <span className="ml-1 text-[11px] text-muted-foreground">
            Planning ahead — changes save to this date.
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6 min-w-0">
          <DayTimeline dateISO={date} />
        </div>
        <aside className="space-y-6">
          <BudgetPanel dateISO={date} />
          <TaskPanel />
          <ReflectionCard dateISO={date} />
        </aside>
      </div>
    </div>
  );
}
